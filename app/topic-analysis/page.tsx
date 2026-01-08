"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ThumbsUp, TrendingUp, Cloud, Lightbulb, AlertCircle, ExternalLink, ArrowLeft, Target, Users, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import type { WechatArticle, AnalysisResult, EnhancedInsight } from "@/lib/types"
import { HistorySidebar } from "@/components/history-sidebar"
import { getWechatArticleApiConfig, getAiApiConfig, getAnalysisDefaults } from "@/lib/api-config"

export default function TopicAnalysisPage() {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [showReport, setShowReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 新增：分析模式和公众号输入
  const [analysisMode, setAnalysisMode] = useState<'keyword' | 'account'>('keyword')
  const [accountInput, setAccountInput] = useState("")

  // 分析结果数据
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [articles, setArticles] = useState<WechatArticle[]>([])
  const [totalArticles, setTotalArticles] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null)

  // 查看历史记录
  const [viewingHistory, setViewingHistory] = useState(false)

  // 历史记录刷新触发器
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

  // 洞察展开状态
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set())

  // 文章列表展开状态
  const [showAllArticles, setShowAllArticles] = useState(false)

  const toggleInsightExpand = (index: number) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // 跳转到内容创作并携带选中洞察
  const handleStartCreation = () => {
    if (!analysisResult) {
      setError("请先完成分析后再开始创作")
      return
    }

    // 优先使用增强洞察，其次基础洞察
    const bestEnhanced = analysisResult.enhancedInsights?.[0] || null
    const fallback = !bestEnhanced && analysisResult.insights?.[0]
      ? {
        title: analysisResult.insights[0].title,
        description: analysisResult.insights[0].description,
        category: "洞察",
        targetAudience: "通用",
        contentAngle: "",
        suggestedOutline: [],
        referenceArticles: [],
        confidence: 50,
        reasons: [],
      }
      : null

    // 写入 sessionStorage 供内容创作页自动选择
    try {
      sessionStorage.setItem(
        "content-creation-source",
        JSON.stringify({
          taskId: currentTaskId ?? null,
          keyword,
          insight: bestEnhanced || fallback,
          insights: analysisResult.enhancedInsights || analysisResult.insights || [],
        })
      )
    } catch (err) {
      console.error("缓存创作选题失败:", err)
    }

    router.push("/content-creation")
  }

  // 从本地缓存恢复最近一次分析，避免切换标签后内容丢失
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('topic-analysis-latest')
      if (!cached) return
      const parsed = JSON.parse(cached)
      if (!parsed.analysisResult || !parsed.articles) return

      setKeyword(parsed.keyword || '')
      setTotalArticles(parsed.totalArticles || parsed.articles.length || 0)
      setArticles(parsed.articles || [])
      setAnalysisResult(parsed.analysisResult)
      setCurrentTaskId(parsed.taskId ?? null)
      setShowReport(true)
      setViewingHistory(false)
    } catch (err) {
      console.error('恢复本地分析缓存失败:', err)
    }
  }, [])

  const cacheLatestAnalysis = (payload: {
    keyword: string
    total: number
    articles: WechatArticle[]
    analysisResult: AnalysisResult
    taskId?: number | null
  }) => {
    try {
      sessionStorage.setItem(
        'topic-analysis-latest',
        JSON.stringify({
          keyword: payload.keyword,
          totalArticles: payload.total,
          articles: payload.articles,
          analysisResult: payload.analysisResult,
          taskId: payload.taskId ?? null,
        })
      )
    } catch (err) {
      console.error('写入本地分析缓存失败:', err)
    }
  }

  const handleAnalyze = async (searchKeyword?: string) => {
    const kw = searchKeyword || keyword.trim()

    if (!kw) {
      setError("请输入关键词")
      return
    }

    // 检查API配置
    const apiConfig = getWechatArticleApiConfig()
    if (!apiConfig.apiKey) {
      setError("请先在设置页面配置公众号文章API Key（设置 → API配置 → 公众号文章API）")
      return
    }

    setKeyword(kw)
    setIsAnalyzing(true)
    setShowReport(false)
    setViewingHistory(false)
    setError(null)
    setProgress(0)
    setCurrentTaskId(null)

    // 获取设置中的分析文章数量（在API调用前获取，避免多扣费）
    const analysisDefaults = getAnalysisDefaults()
    const analysisCount = analysisDefaults.analysisCount

    try {
      // 第一步：获取公众号文章
      setProgressText(`正在获取 ${analysisCount} 篇公众号文章...`)
      setProgress(20)

      // 获取保存的 API 配置
      const apiConfig = getWechatArticleApiConfig()

      const articlesResponse = await fetch('/api/wechat-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: kw,
          page: 1,
          period: 7,
          limit: analysisCount,  // 限制返回条数，避免多扣费
          apiUrl: apiConfig.apiUrl,
          apiKey: apiConfig.apiKey,
        }),
      })

      if (!articlesResponse.ok) {
        const errorData = await articlesResponse.json()
        console.error('API错误:', errorData)
        throw new Error(errorData.error || '获取文章失败')
      }

      const articlesData = await articlesResponse.json()
      console.log('获取到文章数据:', articlesData)
      const allFetchedArticles: WechatArticle[] = articlesData.data || []

      if (allFetchedArticles.length === 0) {
        throw new Error('未找到相关文章，请尝试其他关键词或扩大时间范围')
      }

      // API已经限制了返回条数，直接使用返回的文章
      const fetchedArticles = allFetchedArticles

      console.log(`📊 成功获取 ${fetchedArticles.length} 篇文章进行分析`)

      setArticles(fetchedArticles)
      setTotalArticles(fetchedArticles.length)
      setProgress(50)
      setProgressText(`已获取 ${fetchedArticles.length} 篇文章，开始分析...`)

      // 第二步：AI 摘要提取
      await new Promise(resolve => setTimeout(resolve, 500))
      setProgress(55)
      setProgressText("AI 正在提取文章摘要...")

      await new Promise(resolve => setTimeout(resolve, 1000))
      setProgress(70)
      setProgressText("AI 正在生成深度洞察...")

      // 获取 AI API 配置
      const aiConfig = getAiApiConfig()

      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: fetchedArticles,
          keyword: kw,
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model,
          insightsCount: analysisDefaults.insightsCount, // 使用设置中的洞察数量
        }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        throw new Error(errorData.error || '分析失败')
      }

      const analysisData = await analysisResponse.json()
      const result: AnalysisResult = analysisData.data
      setAnalysisResult(result)

      setProgress(85)
      setProgressText("正在保存分析结果...")

      // 第三步：保存到数据库
      const saveResponse = await fetch('/api/analysis-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: kw,
          articles: fetchedArticles,
          analysisResult: result,
        }),
      })

      let savedTaskId: number | null = null
      if (saveResponse.ok) {
        const saveData = await saveResponse.json()
        savedTaskId = saveData.data.taskId
        setCurrentTaskId(saveData.data.taskId)
        console.log('分析结果已保存，任务ID:', saveData.data.taskId)
        // 触发历史记录刷新
        setHistoryRefreshTrigger(prev => prev + 1)
      } else {
        const errorData = await saveResponse.json().catch(() => ({}))
        console.error('保存分析结果失败:', errorData)
      }

      // 缓存到 sessionStorage，避免切换标签内容丢失
      cacheLatestAnalysis({
        keyword: kw,
        total: fetchedArticles.length,
        articles: fetchedArticles,
        analysisResult: result,
        taskId: savedTaskId,
      })

      setProgress(100)
      setProgressText("分析完成！")

      // 显示报告
      setTimeout(() => {
        setIsAnalyzing(false)
        setShowReport(true)
      }, 500)

    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请重试')
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  // 公众号历史分析
  const handleAnalyzeAccount = async () => {
    const input = accountInput.trim()

    if (!input) {
      setError("请输入公众号名称或文章链接")
      return
    }

    // 检查API配置
    const apiConfig = getWechatArticleApiConfig()
    if (!apiConfig.apiKey) {
      setError("请先在设置页面配置公众号文章API Key（设置 → API配置 → 公众号文章API）")
      return
    }

    setIsAnalyzing(true)
    setShowReport(false)
    setViewingHistory(false)
    setError(null)
    setProgress(0)
    setCurrentTaskId(null)

    try {
      // 第一步：获取公众号历史文章
      setProgressText("正在获取公众号历史文章...")
      setProgress(20)

      // 判断输入是链接还是名称
      const isUrl = input.startsWith('http')

      const historyResponse = await fetch('/api/wechat-articles/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [isUrl ? 'url' : 'name']: input,
          page: 1,
        }),
      })

      if (!historyResponse.ok) {
        const errorData = await historyResponse.json()
        throw new Error(errorData.error || '获取历史文章失败')
      }

      const historyData = await historyResponse.json()
      const { mpInfo, top20 } = historyData.data

      // 获取设置中的分析文章数量
      const analysisDefaults = getAnalysisDefaults()
      const analysisCount = analysisDefaults.analysisCount

      // 根据设置截取文章数量（已按阅读量排序）
      const articlesToAnalyze = top20.slice(0, analysisCount)

      if (articlesToAnalyze.length === 0) {
        throw new Error('未找到该公众号的历史文章')
      }

      console.log(`📊 根据设置截取前 ${analysisCount} 篇文章进行分析（共获取 ${top20.length} 篇）`)

      setArticles(articlesToAnalyze)
      setTotalArticles(articlesToAnalyze.length)
      setProgress(50)
      setProgressText(`已获取 ${top20.length} 篇历史文章，分析前 ${articlesToAnalyze.length} 篇...`)

      // 第二步：AI分析（复用现有逻辑）
      setProgress(55)
      setProgressText("AI 正在提取文章摘要...")

      await new Promise(resolve => setTimeout(resolve, 500))
      setProgress(70)
      setProgressText("AI 正在生成深度洞察...")

      // 获取 AI API 配置
      const aiConfig = getAiApiConfig()

      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: articlesToAnalyze,
          keyword: mpInfo.nickname,  // 使用公众号名称作为关键词
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model,
          insightsCount: analysisDefaults.insightsCount, // 使用设置中的洞察数量
        }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        throw new Error(errorData.error || '分析失败')
      }

      const analysisData = await analysisResponse.json()
      const result: AnalysisResult = analysisData.data
      setAnalysisResult(result)

      setProgress(85)
      setProgressText("正在保存分析结果...")

      // 第三步：保存到数据库
      const saveResponse = await fetch('/api/analysis-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: mpInfo.nickname,
          sourceType: 'account_history',  // 新增字段
          mpName: mpInfo.nickname,        // 新增字段
          mpGhid: mpInfo.ghid,            // 新增字段
          articles: articlesToAnalyze,
          analysisResult: result,
        }),
      })

      let savedTaskId: number | null = null
      if (saveResponse.ok) {
        const saveData = await saveResponse.json()
        savedTaskId = saveData.data.taskId
        setCurrentTaskId(saveData.data.taskId)
        setHistoryRefreshTrigger(prev => prev + 1)
      } else {
        const errorData = await saveResponse.json().catch(() => ({}))
        console.error('保存分析结果失败:', errorData)
      }

      // 缓存到 sessionStorage，避免切换标签内容丢失
      cacheLatestAnalysis({
        keyword: mpInfo.nickname,
        total: articlesToAnalyze.length,
        articles: articlesToAnalyze,
        analysisResult: result,
        taskId: savedTaskId,
      })

      setProgress(100)
      setProgressText("分析完成！")
      setKeyword(mpInfo.nickname)  // 显示公众号名称

      setTimeout(() => {
        setIsAnalyzing(false)
        setShowReport(true)
      }, 500)

    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请重试')
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  // 查看历史报告
  const handleViewHistory = async (taskId: number) => {
    try {
      setViewingHistory(true)
      setShowReport(false)
      setError(null)

      const response = await fetch(`/api/analysis-tasks/${taskId}`)
      const data = await response.json()

      if (data.success && data.data.report) {
        const task = data.data
        setKeyword(task.keyword)
        setTotalArticles(task.totalArticles || 0)
        setArticles(task.report.rawArticles)
        setAnalysisResult({
          topLikesArticles: task.report.topLikesArticles,
          topEngagementArticles: task.report.topEngagementArticles,
          wordCloud: task.report.wordCloud,
          insights: task.report.insights,
          articleSummaries: task.report.articleSummaries || undefined,
          enhancedInsights: task.report.enhancedInsights || undefined,
          readDistribution: task.report.readDistribution || undefined,
          timeDistribution: task.report.timeDistribution || undefined,
        })
        setCurrentTaskId(taskId)
        setShowReport(true)

        cacheLatestAnalysis({
          keyword: task.keyword,
          total: task.totalArticles || (task.report.rawArticles?.length ?? 0),
          articles: task.report.rawArticles || [],
          analysisResult: {
            topLikesArticles: task.report.topLikesArticles,
            topEngagementArticles: task.report.topEngagementArticles,
            wordCloud: task.report.wordCloud,
            insights: task.report.insights,
            articleSummaries: task.report.articleSummaries || undefined,
            enhancedInsights: task.report.enhancedInsights || undefined,
            readDistribution: task.report.readDistribution || undefined,
            timeDistribution: task.report.timeDistribution || undefined,
          },
          taskId,
        })
      } else {
        setError('无法加载历史报告')
      }
    } catch (error) {
      console.error('加载历史报告失败:', error)
      setError('加载历史报告失败')
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* 左侧边栏 */}
      <HistorySidebar
        currentTaskId={currentTaskId}
        onSelectTask={handleViewHistory}
        onReanalyze={(kw) => handleAnalyze(kw)}
        refreshTrigger={historyRefreshTrigger}
        onRefresh={() => {
          // 刷新侧边栏会自动重新加载
        }}
      />

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {viewingHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewingHistory(false)
              setShowReport(false)
              setCurrentTaskId(null)
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回新分析
          </Button>
        )}

        <div>
          <h1 className="text-3xl font-bold tracking-tight">选题分析</h1>
          <p className="text-muted-foreground mt-2">
            基于关键词分析公众号文章，获取数据洞察和选题建议
          </p>
        </div>

        {/* 输入区 */}
        {!viewingHistory && (
          <Card>
            <CardHeader>
              <CardTitle>开始分析</CardTitle>
              <CardDescription>
                选择分析模式，输入关键词或公众号信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as 'keyword' | 'account')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="keyword">关键词搜索</TabsTrigger>
                  <TabsTrigger value="account">公众号历史</TabsTrigger>
                </TabsList>

                <TabsContent value="keyword">
                  <div className="flex gap-4">
                    <Input
                      placeholder="请输入关键词，例如：AI、内容创作、自媒体..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="flex-1"
                      disabled={isAnalyzing}
                    />
                    <Button
                      onClick={() => handleAnalyze()}
                      disabled={!keyword || isAnalyzing}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {isAnalyzing ? '分析中...' : '开始分析'}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="account">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="请输入公众号名称或文章链接"
                        value={accountInput}
                        onChange={(e) => setAccountInput(e.target.value)}
                        className="flex-1"
                        disabled={isAnalyzing}
                      />
                      <Button
                        onClick={handleAnalyzeAccount}
                        disabled={!accountInput || isAnalyzing}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        {isAnalyzing ? '分析中...' : '开始分析'}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      💡 支持输入公众号名称（如：36氪）或任意文章链接
                      <br />
                      📊 将自动获取该公众号最近的历史文章（按阅读量排序）并进行深度分析
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析进度 */}
        {isAnalyzing && (
          <Card>
            <CardHeader>
              <CardTitle>分析进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 洞察报告 */}
        {showReport && analysisResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {viewingHistory ? '历史' : ''}洞察报告
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  分析了 {totalArticles} 篇文章 · 关键词: {keyword}
                </p>
              </div>
            </div>

            <Tabs defaultValue="data-analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data-analysis">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  数据分析
                </TabsTrigger>
                <TabsTrigger value="insights">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  选题洞察
                </TabsTrigger>
              </TabsList>

              {/* 数据分析 Tab */}
              <TabsContent value="data-analysis" className="space-y-6">
                {/* 点赞TOP5 & 互动率TOP5 并列 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ThumbsUp className="h-5 w-5" />
                        点赞TOP5
                      </CardTitle>
                      <CardDescription>点赞量最高的5篇文章</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.topLikesArticles.map((article, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between pb-3 border-b last:border-0"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">{index + 1}</Badge>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm hover:text-primary flex items-center gap-1"
                                  title={article.title}
                                >
                                  <span className="line-clamp-1 break-all">{article.title.length > 50 ? article.title.slice(0, 50) + '...' : article.title}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {article.wxName} · 👁 {article.reads.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-medium ml-2 flex-shrink-0">
                              <ThumbsUp className="h-4 w-4" />
                              {article.likes.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        互动率TOP5
                      </CardTitle>
                      <CardDescription>互动率 = (点赞 + 在看) / 阅读</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.topEngagementArticles.map((article, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between pb-3 border-b last:border-0"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">{index + 1}</Badge>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm hover:text-primary flex items-center gap-1"
                                  title={article.title}
                                >
                                  <span className="line-clamp-1 break-all">{article.title.length > 50 ? article.title.slice(0, 50) + '...' : article.title}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {article.wxName} · 👁 {article.reads.toLocaleString()}
                              </p>
                            </div>
                            <Badge variant="secondary" className="ml-2 flex-shrink-0">
                              {article.engagement}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 高频词云 - 标签式 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      高频词云
                    </CardTitle>
                    <CardDescription>
                      从所有文章中提取的高频关键词
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.wordCloud.slice(0, 20).map((item, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm px-3 py-1 cursor-default hover:bg-secondary transition-colors"
                          style={{
                            fontSize: `${Math.max(12, item.weight / 6)}px`,
                            fontWeight: item.weight > 70 ? 600 : 400
                          }}
                        >
                          {item.word} ({item.weight})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 阅读量分布 & 发布时间分布 并列 */}
                {analysisResult.readDistribution && analysisResult.timeDistribution && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 阅读量分布 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">📊 阅读量分布</CardTitle>
                        <CardDescription>文章阅读量区间统计</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysisResult.readDistribution.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-20 text-right">
                                {item.label}
                              </span>
                              <div className="flex-1 relative">
                                <div className="w-full bg-gray-100 rounded h-7 overflow-hidden">
                                  <div
                                    className="bg-green-500 h-full flex items-center justify-end px-3 transition-all duration-300"
                                    style={{
                                      width: `${item.count > 0 ? Math.max(10, (item.count / totalArticles) * 100) : 0}%`
                                    }}
                                  >
                                    {item.count > 0 && (
                                      <span className="text-sm font-semibold text-white">
                                        {item.count}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 发布时间分布 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">🕐 发布时间分布</CardTitle>
                        <CardDescription>
                          文章发布时间段统计
                          {(() => {
                            const maxSlot = analysisResult.timeDistribution.reduce((prev, current) =>
                              current.count > prev.count ? current : prev
                            )
                            return maxSlot.count > 0 ? ` · 最佳: ${maxSlot.label}` : ''
                          })()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysisResult.timeDistribution
                            .filter(item => item.count > 0)
                            .map((item, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <span className="text-sm font-medium w-28 text-right">
                                  {item.label}
                                </span>
                                <div className="flex-1 relative">
                                  <div className="w-full bg-gray-100 rounded h-7 overflow-hidden">
                                    <div
                                      className="bg-orange-500 h-full flex items-center justify-end px-3 transition-all duration-300"
                                      style={{
                                        width: `${Math.max(10, (item.count / totalArticles) * 100)}%`
                                      }}
                                    >
                                      <span className="text-sm font-semibold text-white">
                                        {item.count}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 完整文章列表 */}
                {articles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          📑 完整文章列表
                        </span>
                        <Badge variant="secondary">{articles.length}篇</Badge>
                      </CardTitle>
                      <CardDescription>
                        所有已获取的文章数据（按阅读量排序）
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(showAllArticles ? articles : articles.slice(0, 5)).map((article, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                          >
                            <Badge variant="outline" className="mt-1 flex-shrink-0">
                              {index + 1}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-sm hover:text-primary flex items-center gap-1 mb-1"
                              >
                                <span className="line-clamp-2">{article.title}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{article.wx_name}</span>
                                <span className="flex items-center gap-1">
                                  👁 {article.read.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  👍 {article.praise.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  👀 {article.looking.toLocaleString()}
                                </span>
                                <span>{new Date(article.publish_time * 1000).toLocaleDateString('zh-CN')}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {articles.length > 5 && (
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => setShowAllArticles(!showAllArticles)}
                          >
                            {showAllArticles ? (
                              <>
                                <ChevronUp className="mr-2 h-4 w-4" />
                                收起列表
                              </>
                            ) : (
                              <>
                                <ChevronDown className="mr-2 h-4 w-4" />
                                展开查看全部 {articles.length} 篇文章
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 选题洞察 Tab - 保持原样 */}
              <TabsContent value="insights">
                <Card>
                  <CardHeader>
                    <CardTitle>AI 深度选题洞察</CardTitle>
                    <CardDescription>
                      基于 TOP 文章的深度分析，生成 5 个可操作的选题方向
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(analysisResult.enhancedInsights || analysisResult.insights.map((insight, i) => ({
                        ...insight,
                        category: '选题建议',
                        targetAudience: '未指定',
                        contentAngle: '',
                        suggestedOutline: [],
                        referenceArticles: [],
                        confidence: 50,
                        reasons: []
                      }))).map((insight: EnhancedInsight | any, index: number) => {
                        const isExpanded = expandedInsights.has(index)
                        const hasEnhancedData = 'category' in insight && insight.suggestedOutline && insight.suggestedOutline.length > 0

                        return (
                          <div
                            key={index}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            {/* 标题行 */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <Badge variant="default">{index + 1}</Badge>
                                {hasEnhancedData && (
                                  <Badge variant="outline" className="text-xs">
                                    {insight.category}
                                  </Badge>
                                )}
                                <h3 className="font-semibold text-lg">{insight.title}</h3>
                                {hasEnhancedData && insight.confidence && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {insight.confidence}% 置信度
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                {hasEnhancedData && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleInsightExpand(index)}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        收起
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        展开
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // 保存当前洞察到 sessionStorage 并跳转到内容创作
                                    try {
                                      sessionStorage.setItem(
                                        "content-creation-source",
                                        JSON.stringify({
                                          taskId: currentTaskId ?? null,
                                          keyword,
                                          insight: insight,
                                          insights: analysisResult?.enhancedInsights || analysisResult?.insights || [],
                                        })
                                      )
                                    } catch (err) {
                                      console.error("缓存创作选题失败:", err)
                                    }
                                    router.push("/content-creation")
                                  }}
                                >
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  一键创作
                                </Button>
                              </div>
                            </div>

                            {/* 描述 */}
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {insight.description}
                            </p>

                            {/* 增强信息（可展开） */}
                            {hasEnhancedData && isExpanded && (
                              <div className="space-y-4 pt-4 border-t">
                                {/* 目标受众 */}
                                {insight.targetAudience && insight.targetAudience !== '未指定' && (
                                  <div className="flex items-start gap-2">
                                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">目标受众</p>
                                      <p className="text-sm">{insight.targetAudience}</p>
                                    </div>
                                  </div>
                                )}

                                {/* 内容切入角度 */}
                                {insight.contentAngle && (
                                  <div className="flex items-start gap-2">
                                    <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">内容切入角度</p>
                                      <p className="text-sm">{insight.contentAngle}</p>
                                    </div>
                                  </div>
                                )}

                                {/* 建议大纲 */}
                                {insight.suggestedOutline && insight.suggestedOutline.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">建议大纲</p>
                                    <ul className="space-y-1">
                                      {insight.suggestedOutline.map((point: string, i: number) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                          <span className="text-muted-foreground">{i + 1}.</span>
                                          <span className="flex-1">{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* 推荐理由 */}
                                {insight.reasons && insight.reasons.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">推荐理由</p>
                                    <div className="space-y-1">
                                      {insight.reasons.map((reason: string, i: number) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                          <p className="text-sm flex-1">{reason}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 参考文章 */}
                                {insight.referenceArticles && insight.referenceArticles.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">参考文章</p>
                                    <div className="flex flex-wrap gap-2">
                                      {insight.referenceArticles.map((article: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {article}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {!viewingHistory && (
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => {
                  setShowReport(false)
                  setKeyword("")
                }}>
                  重新分析
                </Button>
                <Button
                  onClick={handleStartCreation}
                  disabled={!analysisResult}
                >
                  基于洞察开始创作
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
