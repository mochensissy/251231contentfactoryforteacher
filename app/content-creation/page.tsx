"use client"

import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
import { Wand2, RefreshCw, Save, Search, ChevronDown, ChevronUp, Send, Loader2, PenLine, Sparkles } from "lucide-react"
import { marked } from "marked"
import type { EnhancedInsight } from "@/lib/types"
import { getEnabledWechatAccounts, type WechatAccount } from "@/lib/wechat-accounts"
import { MultiPlatformPublish } from "@/components/multi-platform-publish"
import { getAiApiConfig, getImageApiConfig, getPromptSettings } from "@/lib/api-config"

interface AnalysisTask {
  id: number
  keyword: string
  totalArticles: number
  createdAt: string
  report?: {
    enhancedInsights?: EnhancedInsight[]
  }
}

type ArticleStatus = "draft" | "pending_review" | "published"

const statusConfig: Record<ArticleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "草稿", variant: "outline" },
  pending_review: { label: "待审核", variant: "secondary" },
  published: { label: "已发布", variant: "default" },
}

// 公众号样式的CSS
const WECHAT_STYLE = `
  <style>
    .wechat-article {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.75;
      color: #333;
      background: #fff;
      padding: 20px;
    }
    .wechat-article h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px; }
    .wechat-article h2 { font-size: 22px; font-weight: bold; margin: 18px 0 10px; }
    .wechat-article h3 { font-size: 20px; font-weight: bold; margin: 16px 0 10px; }
    .wechat-article p { margin: 10px 0; text-align: justify; }
    .wechat-article strong { font-weight: bold; color: #000; }
    .wechat-article blockquote { border-left: 4px solid #e0e0e0; padding-left: 16px; margin: 16px 0; color: #666; }
    .wechat-article code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .wechat-article pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 16px 0; }
    .wechat-article ul, .wechat-article ol { margin: 10px 0; padding-left: 24px; }
    .wechat-article li { margin: 6px 0; }
    .wechat-article img { max-width: 100%; height: auto; display: block; margin: 16px auto; }
  </style>
`

export default function ContentCreationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 创作模式：ai = AI智能创作，manual = 手动编辑
  const [creationMode, setCreationMode] = useState<"ai" | "manual">("ai")

  // 编辑模式（从文章库跳转）
  const [articleId, setArticleId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // ========== AI创作相关状态 ==========
  const [source, setSource] = useState<"insight" | "custom">("insight")
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = useState<string>("")
  const [generatedSummary, setGeneratedSummary] = useState<string>("")
  const [generatedImages, setGeneratedImages] = useState<string[]>([])

  // 洞察报告相关
  const [analysisTasks, setAnalysisTasks] = useState<AnalysisTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [availableInsights, setAvailableInsights] = useState<EnhancedInsight[]>([])
  const [selectedInsight, setSelectedInsight] = useState<EnhancedInsight | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set())
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

  // 多轮优化
  const [showOptimization, setShowOptimization] = useState(false)
  const [optimizationRequest, setOptimizationRequest] = useState("")
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([])

  // ========== 手动编辑相关状态 ==========
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<ArticleStatus>("draft")

  const [saving, setSaving] = useState(false)
  // 动态发布状态 - 每个账号一个状态
  const [publishingMap, setPublishingMap] = useState<Record<string, boolean>>({})

  // 多公众号配置
  const [wechatAccounts, setWechatAccountsState] = useState<WechatAccount[]>([])

  // 撤销重做
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<string[]>([""])
  const historyIndexRef = useRef(0)

  // 初始化
  useEffect(() => {
    // 加载公众号配置
    const accounts = getEnabledWechatAccounts()
    setWechatAccountsState(accounts)

    // 检查URL参数
    const mode = searchParams.get("mode")
    const editId = searchParams.get("articleId")

    if (mode === "manual") {
      setCreationMode("manual")
    }

    if (editId) {
      setArticleId(parseInt(editId))
      setIsEditing(true)
      setCreationMode("manual")
      loadArticle(parseInt(editId))
    }

    // 加载分析任务
    loadAnalysisTasks()

    // 检查创作缓存
    try {
      const cached = sessionStorage.getItem("content-creation-source")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.taskId || parsed.insight) {
          if (parsed.taskId) setSelectedTaskId(parsed.taskId)
          setSource("insight")

          // 如果有具体的洞察信息，直接设置
          if (parsed.insight) {
            setSelectedInsight(parsed.insight)
          }

          // 如果有洞察列表，直接设置可用洞察（避免等待API加载）
          if (parsed.insights && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
            setAvailableInsights(parsed.insights)
          }

          // 清除缓存，避免重复读取
          sessionStorage.removeItem("content-creation-source")
        }
      }
    } catch (err) {
      console.error("读取创作缓存失败:", err)
    }
  }, [searchParams])

  // 加载分析任务
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

  // 加载文章（编辑模式）
  const loadArticle = async (id: number) => {
    try {
      const response = await fetch(`/api/articles/${id}`)
      const data = await response.json()
      if (data.success) {
        setTitle(data.data.title)
        setContent(data.data.content)
        setSummary(data.data.summary || "")
        setStatus(data.data.status)
        resetHistory(data.data.content)
      }
    } catch (error) {
      console.error('加载文章失败:', error)
    }
  }

  // 加载洞察
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskInsights(selectedTaskId)
    }
  }, [selectedTaskId])

  const loadTaskInsights = async (taskId: number) => {
    try {
      const response = await fetch(`/api/analysis-tasks/${taskId}`)
      const data = await response.json()
      if (data.success && data.data.report?.enhancedInsights) {
        setAvailableInsights(data.data.report.enhancedInsights)
      }
    } catch (error) {
      console.error('加载洞察失败:', error)
    }
  }

  // ========== 手动编辑相关函数 ==========
  const resetHistory = (initialValue: string) => {
    historyRef.current = [initialValue]
    historyIndexRef.current = 0
  }

  const pushHistory = (nextValue: string) => {
    const history = historyRef.current
    const currentIndex = historyIndexRef.current
    if (history[currentIndex] === nextValue) return
    const nextHistory = history.slice(0, currentIndex + 1)
    nextHistory.push(nextValue)
    if (nextHistory.length > 200) nextHistory.shift()
    historyRef.current = nextHistory
    historyIndexRef.current = nextHistory.length - 1
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    pushHistory(value)
  }

  const handleUndo = () => {
    const currentIndex = historyIndexRef.current
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      historyIndexRef.current = newIndex
      setContent(historyRef.current[newIndex])
    }
  }

  const handleRedo = () => {
    const history = historyRef.current
    const currentIndex = historyIndexRef.current
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      historyIndexRef.current = newIndex
      setContent(history[newIndex])
    }
  }

  const handleEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.metaKey) return
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) handleRedo()
      else handleUndo()
    }
  }

  // 预览HTML（手动模式）
  const previewHtml = useMemo(() => {
    try {
      const isMarkdown = content.includes('#') || content.includes('**') || content.includes('- ')
      if (isMarkdown && !content.includes('<p>') && !content.includes('<div>')) {
        const html = marked(content) as string
        return WECHAT_STYLE + `<div class="wechat-article">${html}</div>`
      }
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    } catch (error) {
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    }
  }, [content])

  // AI生成内容预览HTML
  const aiPreviewHtml = useMemo(() => {
    if (!generatedContent) return ''
    try {
      const isMarkdown = generatedContent.includes('#') || generatedContent.includes('**') || generatedContent.includes('- ')
      if (isMarkdown && !generatedContent.includes('<p>') && !generatedContent.includes('<div>')) {
        const html = marked(generatedContent) as string
        return WECHAT_STYLE + `<div class="wechat-article">${html}</div>`
      }
      return WECHAT_STYLE + `<div class="wechat-article">${generatedContent}</div>`
    } catch (error) {
      return WECHAT_STYLE + `<div class="wechat-article">${generatedContent}</div>`
    }
  }, [generatedContent])

  // ========== 保存和发布 ==========
  const handleSaveManual = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请输入标题和内容')
      return
    }

    setSaving(true)
    try {
      const url = isEditing ? `/api/articles/${articleId}` : '/api/articles'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, summary: summary || null, status }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        alert('✅ 保存成功')
        router.push('/publish-management')
      } else {
        alert('❌ 保存失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      alert('❌ 保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 手动编辑模式发布（动态账号）
  const handlePublish = async (account: WechatAccount) => {
    if (!title.trim() || !content.trim()) {
      alert('请输入标题和内容')
      return
    }

    const confirmed = confirm(`确定要保存并发布到${account.name}公众号吗？`)
    if (!confirmed) return

    setPublishingMap(prev => ({ ...prev, [account.id]: true }))

    try {
      // 保存文章
      const url = isEditing ? `/api/articles/${articleId}` : '/api/articles'
      const method = isEditing ? 'PUT' : 'POST'

      const saveResponse = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, summary: summary || null, status: 'published' }),
      })

      const saveData = await saveResponse.json()
      if (!saveResponse.ok || !saveData.success) {
        alert('❌ 保存失败：' + (saveData.error || '未知错误'))
        return
      }

      const savedArticleId = isEditing ? articleId : saveData.data.id

      // 发布到动态账号
      const publishResponse = await fetch('/api/publish/wechat-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: savedArticleId,
          account: {
            name: account.name,
            appId: account.appId,
            appSecret: account.appSecret,
            webhookUrl: account.webhookUrl,
          }
        }),
      })

      const publishData = await publishResponse.json()
      if (publishResponse.ok && publishData.success) {
        alert('✅ ' + publishData.data.message)
        router.push('/publish-management')
      } else {
        alert('❌ 发布失败：' + (publishData.error || '未知错误'))
      }
    } catch (error) {
      alert('❌ 发布失败')
    } finally {
      setPublishingMap(prev => ({ ...prev, [account.id]: false }))
    }
  }

  // ========== AI创作 ==========
  const handleAICreate = async () => {
    const topic = source === "insight" ? selectedInsight?.title : customTopic
    if (!topic) {
      alert("请选择或输入选题")
      return
    }

    setIsCreating(true)
    setProgress(0)
    setProgressMessage("正在分析选题...")

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return prev }
          return prev + 5
        })
      }, 500)

      setProgress(10)
      setProgressMessage("AI正在创作文章...")

      // 获取 AI API 配置和提示词设置
      const aiConfig = getAiApiConfig()
      const promptSettings = getPromptSettings()

      const response = await fetch("/api/content-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          description: source === "insight" ? selectedInsight?.description : customDesc,
          wordCount,
          style,
          imageCount: parseInt(imageCount),
          taskId: selectedTaskId,
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model,
          // 传递用户自定义的文章生成提示词模板
          customPromptTemplate: promptSettings.articlePrompt || undefined,
        }),
      })

      if (!response.ok) {
        clearInterval(progressInterval)
        const errorData = await response.json()
        throw new Error(errorData.error || "生成失败")
      }

      const data = await response.json()
      setGeneratedTitle(data.data.title)
      setGeneratedContent(data.data.content)
      setGeneratedSummary(data.data.summary || "")

      setProgress(60)
      setProgressMessage("文章创作完成，正在生成配图...")

      // 如果需要配图，调用硅基流动API生成真实图片
      let generatedImgUrls: string[] = []
      const numImages = parseInt(imageCount)

      if (numImages > 0) {
        const imageApiConfig = getImageApiConfig()
        const promptSettings = getPromptSettings()

        // 只有配置了硅基流动API才生成真实图片
        if (imageApiConfig.siliconflow?.apiKey) {
          try {
            // 使用文章标题和主题生成配图提示词
            let imagePrompt = `专业的文章配图，主题：${topic}，风格：现代商业插图，简洁大气`

            // 如果用户配置了自定义配图提示词模板，使用用户的模板
            if (promptSettings.illustrationPrompt) {
              imagePrompt = promptSettings.illustrationPrompt.replace('{title}', topic)
            }

            setProgressMessage(`正在生成配图 (共${numImages}张)...`)

            const imageResponse = await fetch("/api/image-generation/siliconflow", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: imagePrompt,
                negativePrompt: "低质量, 模糊, 变形, 文字, 水印, 丑陋",
                imageSize: "1024x1024",
                numImages: numImages,
                apiUrl: imageApiConfig.siliconflow.apiUrl || undefined,
                apiKey: imageApiConfig.siliconflow.apiKey,
                model: imageApiConfig.siliconflow.model || undefined,
              }),
            })

            if (imageResponse.ok) {
              const imageData = await imageResponse.json()
              generatedImgUrls = imageData.data?.images || []
              console.log(`✅ 生成了 ${generatedImgUrls.length} 张配图`)
            } else {
              console.warn("配图生成失败，使用占位符")
            }
          } catch (imgError) {
            console.error("配图生成出错:", imgError)
          }
        } else {
          console.log("未配置硅基流动API，跳过配图生成")
        }
      }

      setGeneratedImages(generatedImgUrls)

      clearInterval(progressInterval)
      setProgress(100)
      setProgressMessage("创作完成！")

      setTimeout(() => {
        setIsCreating(false)
        setProgress(0)
      }, 500)
    } catch (error) {
      console.error("创作失败:", error)
      alert(error instanceof Error ? error.message : "创作失败")
      setIsCreating(false)
      setProgress(0)
    }
  }

  const handleSaveAI = async () => {
    if (!generatedContent || !generatedTitle) {
      alert('没有可保存的内容')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          content: generatedContent,
          summary: generatedSummary,
          images: generatedImages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失败')
      }

      const data = await response.json()
      alert(`文章已保存！`)
      router.push('/publish-management')
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // AI生成内容发布（动态账号）
  const handlePublishAI = async (account: WechatAccount) => {
    if (!generatedContent || !generatedTitle) {
      alert('没有可发布的内容')
      return
    }

    const confirmed = confirm(`确定要保存并发布到${account.name}公众号吗？`)
    if (!confirmed) return

    setPublishingMap(prev => ({ ...prev, [account.id]: true }))

    try {
      // 先保存文章
      const saveResponse = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          content: generatedContent,
          summary: generatedSummary,
          status: 'published',
        }),
      })

      const saveData = await saveResponse.json()
      if (!saveResponse.ok || !saveData.success) {
        alert('❌ 保存失败：' + (saveData.error || '未知错误'))
        return
      }

      const savedArticleId = saveData.data.id

      // 发布到动态账号
      const publishResponse = await fetch('/api/publish/wechat-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: savedArticleId,
          account: {
            name: account.name,
            appId: account.appId,
            appSecret: account.appSecret,
            webhookUrl: account.webhookUrl,
          }
        }),
      })

      const publishData = await publishResponse.json()
      if (publishResponse.ok && publishData.success) {
        alert('✅ ' + publishData.data.message)
        router.push('/publish-management')
      } else {
        alert('❌ 发布失败：' + (publishData.error || '未知错误'))
      }
    } catch (error) {
      alert('❌ 发布失败')
    } finally {
      setPublishingMap(prev => ({ ...prev, [account.id]: false }))
    }
  }

  // 切换到手动编辑（从AI生成结果）
  const switchToManualEdit = () => {
    setTitle(generatedTitle)
    setContent(generatedContent || "")
    setSummary(generatedSummary)
    setCreationMode("manual")
    resetHistory(generatedContent || "")
  }

  // 过滤洞察
  const filteredInsights = useMemo(() => {
    let results = availableInsights
    if (searchKeyword) {
      results = results.filter((i: EnhancedInsight) =>
        i.title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        i.suggestedOutline?.some((p: string) => p.toLowerCase().includes(searchKeyword.toLowerCase()))
      )
    }
    if (categoryFilter !== "all") {
      results = results.filter(i => i.category === categoryFilter)
    }
    return results
  }, [availableInsights, searchKeyword, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set(availableInsights.map(i => i.category).filter(Boolean))
    return Array.from(cats)
  }, [availableInsights])

  const isWorking = isCreating || saving || Object.values(publishingMap).some(v => v)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">内容创作</h1>
          <p className="text-muted-foreground mt-2">
            AI智能创作或手动编辑，支持一键发布到公众号
          </p>
        </div>
        {isEditing && (
          <Badge variant="secondary">编辑模式 - ID: {articleId}</Badge>
        )}
      </div>

      {/* 创作模式切换 */}
      <Card>
        <CardHeader>
          <CardTitle>创作方式</CardTitle>
          <CardDescription>选择AI智能创作或手动编辑</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as "ai" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI 智能创作
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                手动编辑
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* ========== AI 创作模式 ========== */}
      {creationMode === "ai" && (
        <>
          {/* 选题来源 */}
          <Card>
            <CardHeader>
              <CardTitle>选题来源</CardTitle>
              <CardDescription>选择从洞察报告中选择选题，或自定义输入</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={source} onValueChange={(v) => setSource(v as "insight" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="insight">从洞察报告选择</TabsTrigger>
                  <TabsTrigger value="custom">自定义输入</TabsTrigger>
                </TabsList>

                <TabsContent value="insight" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>选择分析任务</Label>
                    <Select
                      value={selectedTaskId?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedTaskId(value ? parseInt(value) : null)
                        setSelectedInsight(null)
                      }}
                    >
                      <SelectTrigger ref={taskSelectRef}>
                        <SelectValue placeholder="请选择一个分析任务..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {analysisTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.keyword} ({task.totalArticles}篇)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {availableInsights.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="搜索洞察..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="分类筛选" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="all">全部分类</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat || ""}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredInsights.map((insight, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedInsight === insight ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                            onClick={() => setSelectedInsight(insight)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{insight.title}</span>
                                  {insight.category && (
                                    <Badge variant="outline" className="text-xs">{insight.category}</Badge>
                                  )}
                                </div>
                                {expandedInsights.has(index) && insight.suggestedOutline && (
                                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                                    {insight.suggestedOutline.slice(0, 3).map((p: string, i: number) => (
                                      <li key={i}>• {p}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedInsights((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(index)) next.delete(index)
                                    else next.add(index)
                                    return next
                                  })
                                }}
                              >
                                {expandedInsights.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>选题标题</Label>
                    <Input
                      placeholder="例如：如何用AI提升工作效率"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>补充说明（可选）</Label>
                    <Textarea
                      placeholder="描述你希望文章包含的要点、风格等..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 创作参数 */}
          <Card>
            <CardHeader>
              <CardTitle>创作参数</CardTitle>
              <CardDescription>设置文章的风格、长度等参数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>文章长度</Label>
                  <Select value={wordCount} onValueChange={setWordCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="500-800">500-800字（短文）</SelectItem>
                      <SelectItem value="1000-1500">1000-1500字（中等）</SelectItem>
                      <SelectItem value="2000-3000">2000-3000字（长文）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>写作风格</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="professional">专业严谨</SelectItem>
                      <SelectItem value="casual">轻松活泼</SelectItem>
                      <SelectItem value="storytelling">故事叙述</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>配图数量</Label>
                  <Select value={imageCount} onValueChange={setImageCount}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="0">不需要配图</SelectItem>
                      <SelectItem value="3">3张</SelectItem>
                      <SelectItem value="5">5张</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleAICreate}
              disabled={isCreating || (source === "insight" ? !selectedInsight : !customTopic)}
            >
              <Wand2 className="mr-2 h-5 w-5" />
              {isCreating ? "创作中..." : "开始AI创作"}
            </Button>
          </div>

          {/* 创作进度 */}
          {isCreating && (
            <Card>
              <CardHeader><CardTitle>创作进度</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} />
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>{progressMessage}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI生成结果 - 多平台发布 */}
          {generatedContent && !isCreating && (
            <div className="space-y-4">
              {/* 顶部工具栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">编辑与发布</h2>
                  <Badge variant="secondary">AI生成</Badge>
                </div>
                <Button variant="outline" onClick={handleAICreate} disabled={isWorking}>
                  <RefreshCw className="mr-2 h-4 w-4" />重新生成原文
                </Button>
              </div>

              {/* 基本信息 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>标题</Label>
                      <Input
                        value={generatedTitle}
                        onChange={(e) => setGeneratedTitle(e.target.value)}
                        placeholder="文章标题"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>摘要</Label>
                      <Input
                        value={generatedSummary}
                        onChange={(e) => setGeneratedSummary(e.target.value)}
                        placeholder="文章摘要（可选）"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 多平台发布面板 */}
              <MultiPlatformPublish
                originalContent={generatedContent}
                originalTitle={generatedTitle}
                originalSummary={generatedSummary}
                onSave={handleSaveAI}
                onPublish={handlePublishAI}
                saving={saving}
                publishingMap={publishingMap}
              />
            </div>
          )}
        </>
      )}

      {/* ========== 手动编辑模式 ========== */}
      {creationMode === "manual" && (
        <>
          {/* 顶部工具栏 */}
          <div className="flex items-center justify-between">
            <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveManual} disabled={isWorking} variant="outline">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</> : <><Save className="mr-2 h-4 w-4" />保存</>}
              </Button>
              {wechatAccounts.length > 0 ? (
                wechatAccounts.map((account, index) => (
                  <Button
                    key={account.id}
                    onClick={() => handlePublish(account)}
                    disabled={isWorking}
                    className={index % 2 === 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-600 hover:bg-teal-700"}
                  >
                    {publishingMap[account.id] ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />发布中...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" />发布到{account.name}</>
                    )}
                  </Button>
                ))
              ) : (
                <Link href="/settings?tab=platform">
                  <Button variant="outline" className="text-muted-foreground">
                    <Send className="mr-2 h-4 w-4" />
                    去设置中添加公众号
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* 基本信息 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>标题</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入文章标题" />
                </div>
                <div className="space-y-2">
                  <Label>摘要</Label>
                  <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="请输入文章摘要（可选）" />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="pending_review">待审核</SelectItem>
                      <SelectItem value="published">已发布</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 编辑器和预览 */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="flex flex-col">
              <CardHeader className="pb-3"><CardTitle>编辑内容</CardTitle></CardHeader>
              <CardContent className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  placeholder="请输入文章内容（支持Markdown和HTML）"
                  className="font-mono text-sm w-full resize-none min-h-[600px]"
                />
              </CardContent>
            </Card>
            <Card className="flex flex-col">
              <CardHeader className="pb-3"><CardTitle>公众号样式预览</CardTitle></CardHeader>
              <CardContent className="flex-1">
                <div className="border rounded-lg p-6 bg-white min-h-[600px] overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
