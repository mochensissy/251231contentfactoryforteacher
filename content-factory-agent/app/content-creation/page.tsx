"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Wand2, RefreshCw, Save, Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
import type { EnhancedInsight } from "@/lib/types"

interface AnalysisTask {
  id: number
  keyword: string
  totalArticles: number
  createdAt: string
  report?: {
    enhancedInsights?: EnhancedInsight[]
  }
}

export default function ContentCreationPage() {
  const [source, setSource] = useState<"insight" | "custom">("insight")
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = useState<string>("")
  const [generatedSummary, setGeneratedSummary] = useState<string>("")
  const [generatedImages, setGeneratedImages] = useState<string[]>([])

  // 洞察报告相关状态
  const [analysisTasks, setAnalysisTasks] = useState<AnalysisTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [availableInsights, setAvailableInsights] = useState<EnhancedInsight[]>([])
  const [selectedInsight, setSelectedInsight] = useState<EnhancedInsight | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set())
  const [pendingPrefill, setPendingPrefill] = useState<{
    taskId: number | null
    insight?: EnhancedInsight | null
    insights?: EnhancedInsight[]
  } | null>(null)

  // UI refs
  const taskSelectRef = useRef<HTMLButtonElement | null>(null)

  // 搜索和筛选
  const [searchKeyword, setSearchKeyword] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // 创作参数
  const [wordCount, setWordCount] = useState("1000-1500")
  const [style, setStyle] = useState("professional")
  const [imageCount, setImageCount] = useState("3")

  // 自定义选题
  const [customTopic, setCustomTopic] = useState("")
  const [customDesc, setCustomDesc] = useState("")

  // 多轮对话优化
  const [showOptimization, setShowOptimization] = useState(false)
  const [optimizationRequest, setOptimizationRequest] = useState("")
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([])

  // 加载分析任务列表
  useEffect(() => {
    loadAnalysisTasks()
    // 从选题分析页传入的缓存
    try {
      const cached = sessionStorage.getItem("content-creation-source")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.taskId || parsed.insight) {
          setPendingPrefill({ taskId: parsed.taskId ?? null, insight: parsed.insight, insights: parsed.insights })
          if (parsed.taskId) {
            setSelectedTaskId(parsed.taskId)
          }
          setSource("insight")
        }
      }
    } catch (err) {
      console.error("读取创作缓存失败:", err)
    }
  }, [])

  const handleTabChange = (v: string) => {
    setSource(v as "insight" | "custom")
    if (v === "insight") {
      // 聚焦到任务下拉，提升可见性
      setTimeout(() => taskSelectRef.current?.focus(), 50)
    }
  }

  // 加载选中任务的洞察
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskInsights(selectedTaskId)
    }
  }, [selectedTaskId])

  const loadAnalysisTasks = async () => {
    try {
      const response = await fetch('/api/analysis-tasks?sortBy=createdAt&sortOrder=desc&limit=50')
      const data = await response.json()
      if (data.success) {
        setAnalysisTasks(data.data)
      }
    } catch (error) {
      console.error('加载分析任务失败:', error)
    }
  }

  const loadTaskInsights = async (taskId: number) => {
    try {
      const response = await fetch(`/api/analysis-tasks/${taskId}`)
      const data = await response.json()
      if (data.success && data.data.report) {
        const report = data.data.report

        // 优先增强洞察，若缺失则从基础洞察转换
        let insights: EnhancedInsight[] | undefined = report.enhancedInsights
        if (!insights || insights.length === 0) {
          insights = (report.insights || []).map((i: any) => ({
            title: i.title,
            description: i.description,
            category: "洞察",
            targetAudience: "通用",
            contentAngle: "",
            suggestedOutline: [],
            referenceArticles: [],
            confidence: 50,
            reasons: [],
          }))
        }

        if (insights) {
          const sorted = insights.sort((a: any, b: any) => b.confidence - a.confidence)
          setAvailableInsights(sorted)

          // 预填选中的洞察（从选题分析页传入）
          if (pendingPrefill?.taskId === taskId) {
            prefillInsight(sorted, pendingPrefill.insight)
            setPendingPrefill(null)
          }
        }
      }
    } catch (error) {
      console.error('加载洞察失败:', error)
    }
  }

  // 处理无 taskId 场景：直接使用缓存里的洞察列表
  useEffect(() => {
    if (pendingPrefill && pendingPrefill.taskId === null && pendingPrefill.insights?.length) {
      const insights = pendingPrefill.insights
      setAvailableInsights(insights)
      prefillInsight(insights, pendingPrefill.insight)
      setPendingPrefill(null)
    }
  }, [pendingPrefill])

  const prefillInsight = (insights: EnhancedInsight[], target?: EnhancedInsight | null) => {
    if (!insights || insights.length === 0) return
    if (target) {
      const match = insights.find((i) => i.title === target.title) || insights[0]
      setSelectedInsight(match || null)
    } else {
      setSelectedInsight(insights[0] || null)
    }
    document.getElementById('creation-params')?.scrollIntoView({ behavior: 'smooth' })
  }

  // 筛选洞察
  const filteredInsights = availableInsights.filter(insight => {
    const matchSearch = !searchKeyword ||
      insight.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      insight.description.toLowerCase().includes(searchKeyword.toLowerCase())

    const matchCategory = categoryFilter === 'all' || insight.category === categoryFilter

    return matchSearch && matchCategory
  })

  // 获取所有分类
  const categories = Array.from(new Set(availableInsights.map(i => i.category)))

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

  const selectInsight = (insight: EnhancedInsight) => {
    setSelectedInsight(insight)
    // 自动滚动到创作参数区域
    document.getElementById('creation-params')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCreate = async () => {
    setIsCreating(true)
    setGeneratedContent(null)
    setProgress(0)
    setProgressMessage("正在准备...")
    setOptimizationHistory([])

    try {
      // 构建请求参数
      const topic = source === 'insight' && selectedInsight
        ? selectedInsight.title
        : customTopic

      const description = source === 'insight' && selectedInsight
        ? selectedInsight.description
        : customDesc

      const outline = source === 'insight' && selectedInsight
        ? selectedInsight.suggestedOutline
        : undefined

      if (!topic) {
        alert('请选择选题或输入自定义标题')
        setIsCreating(false)
        return
      }

      const imgCount = parseInt(imageCount)

      // 进度模拟
      setProgress(10)
      setProgressMessage("正在分析选题...")

      setTimeout(() => {
        setProgress(20)
        setProgressMessage("AI正在创作文章内容...")
      }, 500)

      // 调用AI生成文章
      const response = await fetch('/api/content-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          description,
          outline,
          wordCount,
          style,
          imageCount: imgCount,
        }),
      })

      setProgress(50)
      setProgressMessage("文章内容已生成...")

      if (imgCount > 0) {
        setProgress(60)
        setProgressMessage("正在分析文章内容，生成配图提示词...")

        // 模拟图片生成进度
        const imageProgressSteps = imgCount
        const progressPerImage = 30 / imageProgressSteps

        for (let i = 0; i < imageProgressSteps; i++) {
          setTimeout(() => {
            setProgress(60 + (i + 1) * progressPerImage)
            setProgressMessage(`正在生成第 ${i + 1}/${imgCount} 张配图...`)
          }, 1000 + i * 1000)
        }
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成失败')
      }

      const data = await response.json()
      setProgress(100)
      setProgressMessage("创作完成！")

      // 显示生成的内容
      setTimeout(() => {
        setIsCreating(false)
        setGeneratedTitle(data.data.title)
        setGeneratedContent(data.data.content)
        setGeneratedSummary(data.data.summary)
        setGeneratedImages(data.data.images || [])
        setShowOptimization(false)
      }, 500)

    } catch (error) {
      console.error('生成文章失败:', error)
      alert(error instanceof Error ? error.message : '生成失败，请重试')
      setIsCreating(false)
      setProgress(0)
      setProgressMessage("")
    }
  }

  const handleOptimize = async () => {
    if (!generatedContent || !optimizationRequest) {
      alert('请输入优化要求')
      return
    }

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/articles/0/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalContent: generatedContent,
          optimizationRequest,
          conversationHistory: optimizationHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '优化失败')
      }

      const data = await response.json()

      // 更新内容
      setGeneratedContent(data.data.content)

      // 保存对话历史
      setOptimizationHistory([
        ...optimizationHistory,
        {
          role: 'user',
          content: `优化要求: ${optimizationRequest}`,
        },
        {
          role: 'assistant',
          content: `${data.data.explanation}\n\n${data.data.content}`,
        },
      ])

      // 清空输入框
      setOptimizationRequest("")

      alert(`优化完成！${data.data.explanation}`)

    } catch (error) {
      console.error('优化失败:', error)
      alert(error instanceof Error ? error.message : '优化失败，请重试')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent || !generatedTitle) {
      alert('没有可保存的内容')
      return
    }

    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedTitle,
          content: generatedContent,
          summary: generatedSummary,
          wordCount,
          writeStyle: style,
          imageCount: parseInt(imageCount),
          images: generatedImages,
          taskId: selectedTaskId,
          insightTitle: selectedInsight?.title,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失败')
      }

      const data = await response.json()
      alert(`文章已保存！ID: ${data.data.articleId}`)

    } catch (error) {
      console.error('保存失败:', error)
      alert(error instanceof Error ? error.message : '保存失败，请重试')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">内容创作</h1>
        <p className="text-muted-foreground mt-2">
          AI一键生成高质量文章，支持多轮优化
        </p>
      </div>

      {/* 选题来源选择 */}
      <Card>
        <CardHeader>
          <CardTitle>选题来源</CardTitle>
          <CardDescription>
            选择从洞察报告中选择选题，或自定义输入
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={source} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="insight">从洞察报告选择</TabsTrigger>
              <TabsTrigger value="custom">自定义输入</TabsTrigger>
            </TabsList>

            <TabsContent value="insight" className="space-y-4 mt-4">
              {/* 关键词选择 */}
              <div className="space-y-2">
                <Label>选择关键词分析任务</Label>
                <Select
                  value={selectedTaskId?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedTaskId(value ? parseInt(value) : null)
                    setSelectedInsight(null)
                    setSearchKeyword("")
                    setCategoryFilter("all")
                  }}
                >
                  <SelectTrigger ref={taskSelectRef}>
                    <SelectValue placeholder="请选择一个分析任务..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {analysisTasks.length === 0 ? (
                      <SelectItem value="empty" disabled>暂无分析任务</SelectItem>
                    ) : (
                      analysisTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.keyword} ({task.totalArticles}篇) - {new Date(task.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 搜索和筛选 */}
              {selectedTaskId && availableInsights.length > 0 && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索选题..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="all">所有分类</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 可用选题列表 */}
              {selectedTaskId && (
                <div className="space-y-2">
                  <Label>可用选题 ({filteredInsights.length})</Label>
                  {filteredInsights.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {searchKeyword || categoryFilter !== 'all' ? '没有匹配的选题' : '该任务暂无选题洞察'}
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {filteredInsights.map((insight, index) => {
                        const isExpanded = expandedInsights.has(index)
                        const isSelected = selectedInsight?.title === insight.title

                        return (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 transition-all ${
                              isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                            }`}
                          >
                            {/* 标题行 */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="radio"
                                  name="insight"
                                  checked={isSelected}
                                  onChange={() => selectInsight(insight)}
                                  className="h-4 w-4"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="default">{insight.category}</Badge>
                                  <h3 className="font-semibold">{insight.title}</h3>
                                  <Badge variant="secondary">{insight.confidence}%</Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleInsightExpand(index)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* 简短描述 */}
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {insight.description}
                            </p>

                            {/* 展开内容 */}
                            {isExpanded && (
                              <div className="space-y-3 pt-3 border-t mt-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">完整描述</p>
                                  <p className="text-sm">{insight.description}</p>
                                </div>

                                {insight.targetAudience && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">目标受众</p>
                                    <p className="text-sm">{insight.targetAudience}</p>
                                  </div>
                                )}

                                {insight.contentAngle && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">内容切入角度</p>
                                    <p className="text-sm">{insight.contentAngle}</p>
                                  </div>
                                )}

                                {insight.suggestedOutline && insight.suggestedOutline.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">建议大纲</p>
                                    <ul className="space-y-1">
                                      {insight.suggestedOutline.map((point, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                          <span className="text-muted-foreground">{i + 1}.</span>
                                          <span className="flex-1">{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {insight.reasons && insight.reasons.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">推荐理由</p>
                                    <div className="space-y-1">
                                      {insight.reasons.map((reason, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                          <p className="text-sm flex-1">{reason}</p>
                                        </div>
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
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="custom-topic">自定义选题/标题</Label>
                <Input
                  id="custom-topic"
                  placeholder="请输入文章主题或标题..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-desc">选题描述（可选）</Label>
                <Textarea
                  id="topic-desc"
                  placeholder="描述一下你想要的文章内容、角度、重点等..."
                  rows={4}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 创作参数 */}
      <Card id="creation-params">
        <CardHeader>
          <CardTitle>创作参数</CardTitle>
          <CardDescription>
            设置文章的风格、长度等参数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="word-count">文章长度</Label>
              <Select value={wordCount} onValueChange={setWordCount}>
                <SelectTrigger id="word-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="500-800">500-800字（短文）</SelectItem>
                  <SelectItem value="1000-1500">1000-1500字（中等）</SelectItem>
                  <SelectItem value="2000-3000">2000-3000字（长文）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">写作风格</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="professional">专业严谨</SelectItem>
                  <SelectItem value="casual">轻松活泼</SelectItem>
                  <SelectItem value="storytelling">故事叙事</SelectItem>
                  <SelectItem value="tutorial">教程指南</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">配图数量</Label>
              <Select value={imageCount} onValueChange={setImageCount}>
                <SelectTrigger id="images">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="0">不插入配图</SelectItem>
                  <SelectItem value="1">1张</SelectItem>
                  <SelectItem value="3">3张</SelectItem>
                  <SelectItem value="5">5张</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 开始创作按钮 */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full md:w-auto"
        >
          <Wand2 className="mr-2 h-5 w-5" />
          开始AI创作
        </Button>
      </div>

      {/* 创作进度 */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>创作进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-medium">{progressMessage}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                {progress < 30 && "AI正在理解您的选题需求..."}
                {progress >= 30 && progress < 60 && "内容创作中，这可能需要几秒钟..."}
                {progress >= 60 && progress < 90 && "正在使用可灵模型生成高质量配图..."}
                {progress >= 90 && "即将完成，请稍候..."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 文章预览 */}
      {generatedContent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">文章预览</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowOptimization(!showOptimization)}
              >
                {showOptimization ? '隐藏优化' : '优化文章'}
              </Button>
              <Button variant="outline" onClick={handleCreate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新生成
              </Button>
              <Button variant="default" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                保存文章
              </Button>
            </div>
          </div>

          {/* 多轮对话优化 */}
          {showOptimization && (
            <Card>
              <CardHeader>
                <CardTitle>文章优化</CardTitle>
                <CardDescription>
                  告诉AI你想如何改进这篇文章
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="例如：让开头更吸引人、增加数据支撑、调整语气更轻松..."
                    rows={3}
                    value={optimizationRequest}
                    onChange={(e) => setOptimizationRequest(e.target.value)}
                  />
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing || !optimizationRequest}
                  >
                    {isOptimizing ? '优化中...' : '优化'}
                  </Button>
                </div>
                {optimizationHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">优化历史：</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {optimizationHistory.filter(h => h.role === 'user').map((h, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {h.content}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-zinc max-w-none dark:prose-invert">
                <div
                  dangerouslySetInnerHTML={{
                    __html: generatedContent
                      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                      .replace(/^- (.*$)/gm, '<li>$1</li>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="w-full rounded-lg my-4" />')
                      .replace(/^(.+)$/gm, '<p>$1</p>')
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
