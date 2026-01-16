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
import {
  Wand2, RefreshCw, Save, Search, ChevronDown, ChevronUp, Send, Loader2,
  PenLine, Sparkles, Copy, Check, Download, FileText, Video, FileEdit
} from "lucide-react"
import { marked } from "marked"
import type { EnhancedInsight } from "@/lib/types"
import { getEnabledWechatAccounts, type WechatAccount } from "@/lib/wechat-accounts"
import { getAiApiConfig, getImageApiConfig, getPromptSettings, getXiaohongshuApiConfig } from "@/lib/api-config"
import { XiaohongshuPreview } from "@/components/xiaohongshu-preview"
import { TwitterPreview } from "@/components/twitter-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// 平台类型
type Platform = "wechat" | "xiaohongshu" | "twitter" | "video"

// 平台配置
const PLATFORM_CONFIG: Record<Platform, { name: string; icon: string; description: string }> = {
  wechat: { name: "微信公众号", icon: "📱", description: "创作公众号图文内容" },
  xiaohongshu: { name: "小红书", icon: "📕", description: "创作小红书笔记" },
  twitter: { name: "推特/X", icon: "🐦", description: "创作推文或Thread" },
  video: { name: "视频脚本", icon: "🎬", description: "生成短视频脚本" },
}

// 分析任务接口
interface AnalysisTask {
  id: number
  keyword: string
  totalArticles: number
  createdAt: string
  report?: {
    enhancedInsights?: EnhancedInsight[]
  }
}

// 文章接口
interface Article {
  id: number
  title: string
  content: string
  summary: string | null
  createdAt: string
}

// 视频脚本分镜
interface StoryboardItem {
  seq: number
  timeRange: string
  scene: string
  script: string
  bgm: string
  notes: string
}

// 视频类型配置
const VIDEO_TYPES = [
  { value: "知识分享", label: "知识分享", desc: "专业深度内容，适合教学" },
  { value: "产品测评", label: "产品测评", desc: "客观分析产品优缺点" },
  { value: "Vlog", label: "Vlog", desc: "个人日常、生活记录" },
  { value: "口播", label: "口播", desc: "直接面对镜头表达" },
  { value: "剧情", label: "剧情短片", desc: "有故事情节的内容" },
]

const VIDEO_PLATFORMS = [
  { value: "bilibili", label: "Bilibili / B站" },
  { value: "youtube", label: "YouTube" },
]

const VIDEO_DURATIONS = [
  { value: 60, label: "1分钟（短视频）" },
  { value: 180, label: "3分钟（中等）" },
  { value: 300, label: "5分钟（长视频）" },
]

// 公众号样式CSS
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

type ArticleStatus = "draft" | "pending_review" | "published"

export default function ContentCreationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ========== 通用状态 ==========
  const [activePlatform, setActivePlatform] = useState<Platform>("wechat")
  const [source, setSource] = useState<"insight" | "article" | "custom">("insight")

  // 洞察报告相关
  const [analysisTasks, setAnalysisTasks] = useState<AnalysisTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [availableInsights, setAvailableInsights] = useState<EnhancedInsight[]>([])
  const [selectedInsight, setSelectedInsight] = useState<EnhancedInsight | null>(null)
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // 自定义输入
  const [customTopic, setCustomTopic] = useState("")
  const [customDesc, setCustomDesc] = useState("")
  const [manualContent, setManualContent] = useState("")

  // 编辑模式状态
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null)
  const [loadingArticle, setLoadingArticle] = useState(false)

  // 公众号配置
  const [wechatAccounts, setWechatAccountsState] = useState<WechatAccount[]>([])

  // ========== 文章创作状态 ==========
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")

  // 创作参数
  const [wordCount, setWordCount] = useState("1000-1500")
  const [style, setStyle] = useState("professional")
  const [imageCount, setImageCount] = useState("3")

  // 生成结果
  const [generatedTitle, setGeneratedTitle] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [generatedSummary, setGeneratedSummary] = useState("")
  const [generatedImages, setGeneratedImages] = useState<string[]>([])

  // 平台适配内容 
  const [xiaohongshuContent, setXiaohongshuContent] = useState("")
  const [twitterContent, setTwitterContent] = useState("")

  // 保存和发布状态
  const [saving, setSaving] = useState(false)
  const [publishingMap, setPublishingMap] = useState<Record<string, boolean>>({})
  const [publishingXiaohongshu, setPublishingXiaohongshu] = useState(false)
  const [xhsPublishStatus, setXhsPublishStatus] = useState<string>('') // 发布状态文本
  const [transforming, setTransforming] = useState(false)
  const [copied, setCopied] = useState(false)

  // 小红书二维码弹窗状态
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrDialogData, setQrDialogData] = useState<{
    publishUrl: string
    qrCodeUrl: string
    title?: string
  } | null>(null)

  // ========== 视频脚本状态 ==========
  const [videoPlatform, setVideoPlatform] = useState("bilibili")
  const [videoType, setVideoType] = useState("知识分享")
  const [videoDuration, setVideoDuration] = useState(180)
  const [videoSource, setVideoSource] = useState<"topic" | "article">("topic")
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  // 视频脚本生成结果
  const [generatedScript, setGeneratedScript] = useState<{
    id: number
    title: string
    content: string
    storyboard: StoryboardItem[] | null
    coverTitles: string[]
    sourceArticleId?: number
  } | null>(null)
  const [editedScriptContent, setEditedScriptContent] = useState("")
  const [editedStoryboard, setEditedStoryboard] = useState<StoryboardItem[]>([])
  const [copiedCover, setCopiedCover] = useState<number | null>(null)

  // ========== 初始化 ==========
  useEffect(() => {
    // 加载公众号配置
    setWechatAccountsState(getEnabledWechatAccounts())

    // 加载分析任务
    loadAnalysisTasks()

    // 加载文章列表（视频脚本用）
    loadArticles()

    // 检查URL参数
    const platformParam = searchParams.get("platform")
    if (platformParam && ["wechat", "xiaohongshu", "twitter", "video"].includes(platformParam)) {
      setActivePlatform(platformParam as Platform)
    }

    // 检查 articleId 参数（编辑模式）
    const articleIdParam = searchParams.get("articleId")
    const modeParam = searchParams.get("mode")

    if (articleIdParam) {
      const id = parseInt(articleIdParam)
      if (!isNaN(id)) {
        loadArticleForEdit(id)
        // 如果 mode=manual，设置为自定义输入模式
        if (modeParam === "manual") {
          setSource("custom")
        }
      }
    }

    // 检查创作缓存
    try {
      const cached = sessionStorage.getItem("content-creation-source")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.taskId || parsed.insight) {
          if (parsed.taskId) setSelectedTaskId(parsed.taskId)
          setSource("insight")
          if (parsed.insight) setSelectedInsight(parsed.insight)
          if (parsed.insights?.length > 0) setAvailableInsights(parsed.insights)
          sessionStorage.removeItem("content-creation-source")
        }
      }
    } catch (err) {
      console.error("读取创作缓存失败:", err)
    }
  }, [searchParams])

  // 自动填充手动创作内容
  useEffect(() => {
    if (source === "custom" && customTopic && manualContent) {
      setGeneratedTitle(customTopic)
      setGeneratedContent(manualContent)
      setGeneratedSummary(customTopic)
    }
  }, [source, customTopic, manualContent])

  // 加载洞察
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskInsights(selectedTaskId)
    }
  }, [selectedTaskId])

  // 视频 - 当选择文章时
  useEffect(() => {
    if (selectedArticleId) {
      const article = articles.find((a) => a.id === selectedArticleId)
      setSelectedArticle(article || null)
      if (article) setCustomTopic(article.title)
    } else {
      setSelectedArticle(null)
    }
  }, [selectedArticleId, articles])

  // ========== 加载函数 ==========
  const loadAnalysisTasks = async () => {
    try {
      const response = await fetch('/api/analysis-tasks?sortBy=createdAt&sortOrder=desc&limit=50')
      const data = await response.json()
      if (data.success) setAnalysisTasks(data.data)
    } catch (error) {
      console.error('加载分析任务失败:', error)
    }
  }

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

  const loadArticles = async () => {
    try {
      const response = await fetch("/api/articles?limit=50")
      const data = await response.json()
      if (data.success) setArticles(data.data)
    } catch (error) {
      console.error("加载文章列表失败:", error)
    }
  }

  const loadArticleForEdit = async (articleId: number) => {
    setLoadingArticle(true)
    try {
      const response = await fetch(`/api/articles/${articleId}`)
      const data = await response.json()

      if (data.success && data.data) {
        const article = data.data
        setEditingArticleId(article.id)
        setGeneratedTitle(article.title)
        setGeneratedContent(article.content)
        setGeneratedSummary(article.summary || '')

        // 解析并设置图片（如果有）
        if (article.images) {
          try {
            const images = typeof article.images === 'string'
              ? JSON.parse(article.images)
              : article.images
            if (Array.isArray(images)) {
              setGeneratedImages(images)
            }
          } catch (e) {
            console.warn('解析文章图片失败:', e)
          }
        }

        // 设置平台（如果有）
        if (article.platform && ['wechat', 'xiaohongshu', 'twitter', 'video'].includes(article.platform)) {
          setActivePlatform(article.platform as Platform)
        }
      } else {
        alert('文章加载失败：' + (data.error || '文章不存在'))
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      alert('加载文章失败，请重试')
    } finally {
      setLoadingArticle(false)
    }
  }

  // ========== 工具函数 ==========
  const getWechatPreviewHtml = (content: string) => {
    try {
      const isMarkdown = content.includes('#') || content.includes('**') || content.includes('- ')
      if (isMarkdown && !content.includes('<p>') && !content.includes('<div>')) {
        const html = marked(content) as string
        return WECHAT_STYLE + `<div class="wechat-article">${html}</div>`
      }
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    } catch {
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      alert('复制失败')
    }
  }

  // ========== 内容创作函数 ==========
  const handleCreate = async () => {
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
          platform: activePlatform, // 传递目标平台
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model,
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

      // 如果是小红书或推特，自动转换
      if (activePlatform === "xiaohongshu" || activePlatform === "twitter") {
        setProgress(70)
        setProgressMessage(`正在转换为${PLATFORM_CONFIG[activePlatform].name}风格...`)
        await transformContent(activePlatform, data.data.content, data.data.title, data.data.summary)
      }

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

  // 转换内容到指定平台
  const transformContent = async (platform: Platform, content: string, title: string, summary: string) => {
    if (platform === 'wechat') return

    setTransforming(true)
    try {
      const aiConfig = getAiApiConfig()
      const response = await fetch('/api/content-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title,
          summary,
          platform,
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model,
        }),
      })

      const data = await response.json()
      if (data.success) {
        if (platform === 'xiaohongshu') {
          setXiaohongshuContent(data.data.content)
        } else if (platform === 'twitter') {
          setTwitterContent(data.data.content)
        }
      }
    } catch (error) {
      console.error('转换失败:', error)
    } finally {
      setTransforming(false)
    }
  }

  // 保存文章
  const handleSave = async () => {
    if (!generatedContent || !generatedTitle) {
      alert('没有可保存的内容')
      return
    }

    setSaving(true)
    try {
      // 根据平台选择保存的内容
      let contentToSave = generatedContent
      if (activePlatform === 'xiaohongshu' && xiaohongshuContent) {
        contentToSave = xiaohongshuContent
      } else if (activePlatform === 'twitter' && twitterContent) {
        contentToSave = twitterContent
      }

      // 检查是否是编辑模式
      const isEditing = editingArticleId !== null
      const url = isEditing ? `/api/articles/${editingArticleId}` : '/api/articles'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          content: contentToSave,
          summary: generatedSummary,
          platform: activePlatform,
          images: generatedImages,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失败')
      }

      alert(isEditing ? '文章已更新！' : '文章已保存！')
      router.push('/publish-management')
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 发布到公众号
  const handlePublish = async (account: WechatAccount) => {
    if (!generatedContent || !generatedTitle) {
      alert('没有可发布的内容')
      return
    }

    const confirmed = confirm(`确定要保存并发布到${account.name}公众号吗？`)
    if (!confirmed) return

    setPublishingMap(prev => ({ ...prev, [account.id]: true }))

    try {
      // 检查是否有配图/封面图
      let coverImage = generatedImages[0]
      let currentImages = [...generatedImages]

      // 如果没有图片，自动生成一张作为封面
      if (!coverImage) {
        // 检查DashScope/Tongyi配置
        const imageConfig = getImageApiConfig()

        // 如果没有配置API Key，询问用户是否继续（可能会失败）
        if (!imageConfig.dashscope?.apiKey) {
          const continueWithoutCover = confirm('未检测到配图且未配置阿里云DashScope API Key，发布可能会因为缺少封面图而失败。\n\n是否仍要继续尝试？')
          if (!continueWithoutCover) {
            setPublishingMap(prev => ({ ...prev, [account.id]: false }))
            return
          }
        } else {
          // 尝试自动生成封面
          try {
            const promptSettings = getPromptSettings()
            const coverPrompt = promptSettings.coverPrompt || `公众号封面，主题："${generatedTitle}"。要求：极简设计，明亮色调，单色背景，有现代感，中文大字标题。`

            // 更新UI提示
            // 这里的 setPublishingMap 可能会导致UI重新渲染，但在try/catch块中应该没问题
            // 更好的方式可能是加一个专门的 status state，但这里复用 publishingMap 只是 loading 状态

            console.log('🖼️ 正在生成公众号封面图...')

            const imageResponse = await fetch('/api/image-generation/dashscope', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: coverPrompt,
                imageSize: '1024*576', // 16:9 适合公众号
                numImages: 1,
                apiUrl: imageConfig.dashscope.apiUrl,
                apiKey: imageConfig.dashscope.apiKey,
              }),
            })

            const imageData = await imageResponse.json()
            if (imageResponse.ok && imageData.success && imageData.data?.images?.length > 0) {
              coverImage = imageData.data.images[0]
              currentImages = [coverImage]
              setGeneratedImages(currentImages) // 更新前端显示的图片
              console.log('✅ 封面图生成成功:', coverImage)
            } else {
              console.warn('封面生成失败:', imageData.error)
              // 生成失败不阻断流程，让后端报错或尝试其他方式
            }
          } catch (genError) {
            console.error('封面生成异常:', genError)
          }
        }
      }

      // 先保存
      const saveResponse = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          content: generatedContent,
          summary: generatedSummary,
          platform: 'wechat',
          status: 'published',
          images: currentImages, // 保存生成的图片
        }),
      })

      const saveData = await saveResponse.json()
      if (!saveResponse.ok || !saveData.success) {
        alert('保存失败：' + (saveData.error || '未知错误'))
        return
      }

      // 发布
      const publishResponse = await fetch('/api/publish/wechat-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: saveData.data.id,
          coverImage, // 显式传递封面图
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
        alert('发布失败：' + (publishData.error || '未知错误'))
      }
    } catch (error) {
      console.error('流程异常:', error)
      alert('发布失败')
    } finally {
      setPublishingMap(prev => ({ ...prev, [account.id]: false }))
    }
  }

  // 发布到小红书
  const handlePublishToXiaohongshu = async () => {
    const contentToPublish = xiaohongshuContent || generatedContent
    if (!contentToPublish || !generatedTitle) {
      alert('没有可发布的内容')
      return
    }

    // 获取小红书API配置
    const xhsConfig = getXiaohongshuApiConfig()
    if (!xhsConfig.apiKey) {
      alert('请先在设置中配置小红书API密钥\n\n路径：设置 → 平台配置 → 小红书发布配置')
      return
    }

    const confirmed = confirm('确定要发布到小红书吗？\n\n将使用当前已生成的小红书内容进行发布')
    if (!confirmed) return

    setPublishingXiaohongshu(true)
    setXhsPublishStatus('准备中...')

    try {
      // 检查封面图（使用第一张配图，如果没有则自动生成）
      let coverImage = generatedImages[0]

      if (!coverImage) {
        // 自动生成封面图
        setXhsPublishStatus('生成封面中...')
        console.log('📸 没有封面图，正在使用硅基流动自动生成...')

        const imageConfig = getImageApiConfig()
        if (!imageConfig.siliconflow?.apiKey) {
          alert('请先在设置中配置硅基流动API密钥\n\n路径：设置 → API配置 → 硅基流动')
          setPublishingXiaohongshu(false)
          return
        }

        // 构建小红书风格的封面提示词
        const coverPrompt = `小红书风格封面，主题："${generatedTitle}"。要求：极简设计，明亮色调，单色背景，有现代感，中文大字标题，适合小红书笔记封面。风格：ins风、清新、高级感。`

        const imageResponse = await fetch('/api/image-generation/siliconflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: coverPrompt,
            imageSize: '1024x1024',
            numImages: 1,
            apiUrl: imageConfig.siliconflow.apiUrl,
            apiKey: imageConfig.siliconflow.apiKey,
            model: imageConfig.siliconflow.model || 'Kwai-Kolors/Kolors',
          }),
        })

        const imageData = await imageResponse.json()
        if (imageResponse.ok && imageData.success && imageData.data?.images?.length > 0) {
          coverImage = imageData.data.images[0]
          console.log('✅ 封面图生成成功:', coverImage)
        } else {
          console.error('封面图生成失败:', imageData.error)
          alert('封面图生成失败：' + (imageData.error || '未知错误') + '\n\n请手动生成配图后再发布')
          setPublishingXiaohongshu(false)
          return
        }
      }

      // 直接调用发布API
      setXhsPublishStatus('发布中...')
      const publishResponse = await fetch('/api/publish/xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          content: contentToPublish,
          coverImage,
          images: generatedImages.slice(1), // 除封面外的其他图片
          apiConfig: xhsConfig,
        }),
      })

      const publishData = await publishResponse.json()

      if (publishResponse.ok && publishData.success) {
        // 显示二维码弹窗
        setQrDialogData({
          publishUrl: publishData.data.publishUrl,
          qrCodeUrl: publishData.data.qrCodeUrl,
          title: publishData.data.title,
        })
        setQrDialogOpen(true)
      } else {
        alert('发布失败：' + (publishData.error || '未知错误'))
      }
    } catch (error) {
      console.error('发布失败:', error)
      alert(error instanceof Error ? error.message : '发布失败')
    } finally {
      setPublishingXiaohongshu(false)
      setXhsPublishStatus('')
    }
  }

  // ========== 视频脚本函数 ==========
  const handleGenerateVideo = async () => {
    const topic = videoSource === "topic" ? customTopic : selectedArticle?.title
    if (!topic) {
      alert(videoSource === "topic" ? "请输入视频主题" : "请选择来源文章")
      return
    }

    setIsCreating(true)
    setProgress(0)
    setProgressMessage("正在分析内容...")
    setGeneratedScript(null)

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return prev }
          return prev + 10
        })
      }, 500)

      setProgress(20)
      setProgressMessage(videoSource === "article" ? "正在改编文章为视频脚本..." : "AI正在创作脚本...")

      const response = await fetch("/api/video-script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: videoPlatform,
          videoType,
          duration: videoDuration,
          topic,
          sourceArticleId: videoSource === "article" ? selectedArticleId : null,
          generateStoryboard: true,
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "生成失败")
      }

      setProgress(100)
      setProgressMessage("生成完成！")

      const data = await response.json()
      setGeneratedScript(data.data)
      setEditedScriptContent(data.data.content)
      setEditedStoryboard(data.data.storyboard || [])

      setTimeout(() => {
        setIsCreating(false)
        setProgress(0)
      }, 500)
    } catch (error) {
      console.error("生成失败:", error)
      alert(error instanceof Error ? error.message : "生成失败，请重试")
      setIsCreating(false)
      setProgress(0)
    }
  }

  const handleSaveVideo = async () => {
    if (!generatedScript) return
    try {
      const response = await fetch(`/api/video-script/${generatedScript.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedScriptContent, storyboard: editedStoryboard }),
      })
      if (!response.ok) throw new Error("保存失败")
      alert("保存成功！")
    } catch (error) {
      alert("保存失败，请重试")
    }
  }

  const handleExportMarkdown = () => {
    if (!generatedScript) return
    const markdown = `# 视频脚本：${generatedScript.title}\n\n${editedScriptContent}`
    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `视频脚本_${generatedScript.title}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateStoryboardItem = (index: number, field: keyof StoryboardItem, value: string | number) => {
    setEditedStoryboard((prev) => {
      const newList = [...prev]
      newList[index] = { ...newList[index], [field]: value }
      return newList
    })
  }

  const handleCopyCover = (index: number, title: string) => {
    navigator.clipboard.writeText(title)
    setCopiedCover(index)
    setTimeout(() => setCopiedCover(null), 2000)
  }

  // ========== 过滤洞察 ==========
  const filteredInsights = useMemo(() => {
    let results = availableInsights
    if (searchKeyword) {
      results = results.filter((i) =>
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

  const isWorking = isCreating || saving || Object.values(publishingMap).some(v => v) || transforming || publishingXiaohongshu

  // ========== 渲染素材来源组件 ==========
  const renderSourceSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle>素材来源</CardTitle>
        <CardDescription>从洞察报告、已保存文章或自定义输入中选择</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={source} onValueChange={(v) => setSource(v as "insight" | "article" | "custom")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insight">从洞察报告</TabsTrigger>
            <TabsTrigger value="article">从文章库选择</TabsTrigger>
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
                <SelectTrigger>
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

          <TabsContent value="article" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>选择已保存的文章</Label>
              <Select
                value={selectedArticleId?.toString() || ""}
                onValueChange={(v) => {
                  const id = v ? parseInt(v) : null
                  setSelectedArticleId(id)
                  if (id) {
                    const article = articles.find((a) => a.id === id)
                    if (article) {
                      setSelectedArticle(article)
                      // 自动填充到生成内容
                      setGeneratedTitle(article.title)
                      setGeneratedContent(article.content)
                      setGeneratedSummary(article.summary || "")
                      // 清空已转换的平台内容，以便重新转换
                      setXiaohongshuContent('')
                      setTwitterContent('')
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择一篇文章作为基础文稿..." />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {articles.length === 0 ? (
                    <SelectItem value="empty" disabled>暂无文章，请先在公众号模块创建</SelectItem>
                  ) : (
                    articles.map((article) => (
                      <SelectItem key={article.id} value={article.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{article.title}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedArticle && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedArticle.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {selectedArticle.summary || selectedArticle.content.substring(0, 200)}...
                  </p>
                  <Badge variant="secondary" className="mt-2">将基于此文章进行平台适配</Badge>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>文章标题</Label>
              <Input
                placeholder="输入文章标题"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>文章内容</Label>
              <Textarea
                placeholder="在这里直接输入或粘贴已写好的文章内容..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )

  // ========== 主页面渲染 ==========
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">内容创作</h1>
        <p className="text-muted-foreground mt-2">
          按平台创作内容，基于洞察报告或自定义素材生成
        </p>
      </div>

      {/* 平台选择标签页 */}
      <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as Platform)}>
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platform) => (
            <TabsTrigger key={platform} value={platform} className="flex items-center gap-2">
              <span>{PLATFORM_CONFIG[platform].icon}</span>
              {PLATFORM_CONFIG[platform].name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ========== 公众号内容创作 ========== */}
        <TabsContent value="wechat" className="space-y-4 mt-4">
          {renderSourceSelector()}


          {/* 创作参数 - 仅在非自定义输入时显示 */}
          {source !== "custom" && (
            <Card>
              <CardHeader>
                <CardTitle>创作参数</CardTitle>
                <CardDescription>设置公众号文章的风格和长度</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>文章长度</Label>
                    <Select value={wordCount} onValueChange={setWordCount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="500-800">500-800字(短文)</SelectItem>
                        <SelectItem value="1000-1500">1000-1500字(中等)</SelectItem>
                        <SelectItem value="2000-3000">2000-3000字(长文)</SelectItem>
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
          )}


          {/* 创作按钮 - 仅在非自定义输入时显示 */}
          {source !== "custom" && (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleCreate} disabled={isCreating || (source === "insight" ? !selectedInsight : !customTopic)}>
                <Wand2 className="mr-2 h-5 w-5" />
                {isCreating ? "创作中..." : "开始创作"}
              </Button>
            </div>
          )}

          {/* 进度显示 */}
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

          {/* 生成结果 */}
          {generatedContent && !isCreating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    编辑与发布
                    {source === "custom" ? (
                      <Badge variant="outline">手动创作</Badge>
                    ) : (
                      <Badge variant="secondary">AI生成</Badge>
                    )}
                  </CardTitle>
                  {source !== "custom" && (
                    <Button variant="outline" onClick={handleCreate} disabled={isWorking}>
                      <RefreshCw className="mr-2 h-4 w-4" /> 重新生成
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 标题和摘要 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>标题</Label>
                    <Input value={generatedTitle} onChange={(e) => setGeneratedTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>摘要</Label>
                    <Input value={generatedSummary} onChange={(e) => setGeneratedSummary(e.target.value)} />
                  </div>
                </div>

                {/* 内容和预览 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>编辑内容</Label>
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>公众号预览</Label>
                    <div className="border rounded-lg p-4 bg-white min-h-[400px] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: getWechatPreviewHtml(generatedContent) }} />
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={handleSave} disabled={isWorking}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存草稿
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
                      <Button variant="outline">去设置添加公众号</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== 小红书内容创作 ========== */}
        <TabsContent value="xiaohongshu" className="space-y-4 mt-4">
          {renderSourceSelector()}

          <div className="flex justify-center gap-2">
            {source === "article" ? (
              <Button
                size="lg"
                onClick={() => transformContent('xiaohongshu', generatedContent, generatedTitle, generatedSummary)}
                disabled={transforming || !selectedArticle}
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                {transforming ? "转换中..." : "转换为小红书风格"}
              </Button>
            ) : (
              <Button size="lg" onClick={handleCreate} disabled={isCreating || (source === "insight" ? !selectedInsight : !customTopic)}>
                <Wand2 className="mr-2 h-5 w-5" />
                {isCreating ? "创作中..." : "生成小红书笔记"}
              </Button>
            )}
          </div>

          {isCreating && (
            <Card>
              <CardHeader><CardTitle>创作进度</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} />
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-[#FF2442] animate-pulse" />
                  <span>{progressMessage}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {(xiaohongshuContent || generatedContent) && !isCreating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>小红书笔记</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => transformContent('xiaohongshu', generatedContent, generatedTitle, generatedSummary)} disabled={transforming}>
                    <RefreshCw className="mr-1 h-3 w-3" /> 重新转换
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>编辑内容</Label>
                    <Textarea
                      value={xiaohongshuContent || generatedContent}
                      onChange={(e) => setXiaohongshuContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>小红书预览</Label>
                    <div className="min-h-[400px] flex items-start justify-center py-4 bg-gray-50 rounded-lg">
                      <XiaohongshuPreview content={xiaohongshuContent || generatedContent} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t flex-wrap">
                  <Button variant="outline" onClick={handleSave} disabled={isWorking}>
                    <Save className="mr-2 h-4 w-4" /> 保存草稿
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(xiaohongshuContent || generatedContent)}
                  >
                    {copied ? <><Check className="mr-2 h-4 w-4" />已复制</> : <><Copy className="mr-2 h-4 w-4" />一键复制</>}
                  </Button>
                  <Button
                    onClick={handlePublishToXiaohongshu}
                    disabled={isWorking}
                    className="bg-[#FF2442] hover:bg-[#E61F3D]"
                  >
                    {publishingXiaohongshu ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{xhsPublishStatus || '发布中...'}</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" />一键发布</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== 推特内容创作 ========== */}
        <TabsContent value="twitter" className="space-y-4 mt-4">
          {renderSourceSelector()}

          <div className="flex justify-center gap-2">
            {source === "article" ? (
              <Button
                size="lg"
                onClick={() => transformContent('twitter', generatedContent, generatedTitle, generatedSummary)}
                disabled={transforming || !selectedArticle}
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                {transforming ? "转换中..." : "转换为推文"}
              </Button>
            ) : (
              <Button size="lg" onClick={handleCreate} disabled={isCreating || (source === "insight" ? !selectedInsight : !customTopic)}>
                <Wand2 className="mr-2 h-5 w-5" />
                {isCreating ? "创作中..." : "生成推文"}
              </Button>
            )}
          </div>

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

          {(twitterContent || generatedContent) && !isCreating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>推文内容</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => transformContent('twitter', generatedContent, generatedTitle, generatedSummary)} disabled={transforming}>
                    <RefreshCw className="mr-1 h-3 w-3" /> 重新转换
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>编辑内容</Label>
                    <Textarea
                      value={twitterContent || generatedContent}
                      onChange={(e) => setTwitterContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">💡 使用 1/、2/、3/ 格式或分隔线(---)创建推文串(Thread)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>推特预览</Label>
                    <div className="min-h-[400px] py-4 bg-gray-50 rounded-lg overflow-auto">
                      <TwitterPreview content={twitterContent || generatedContent} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={handleSave} disabled={isWorking}>
                    <Save className="mr-2 h-4 w-4" /> 保存草稿
                  </Button>
                  <Button onClick={() => copyToClipboard(twitterContent || generatedContent)} className="bg-black hover:bg-gray-800">
                    {copied ? <><Check className="mr-2 h-4 w-4" />已复制</> : <><Copy className="mr-2 h-4 w-4" />一键复制</>}
                  </Button>
                  <span className="text-sm text-muted-foreground self-center">复制后打开推特粘贴发布</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== 视频脚本创作 ========== */}
        <TabsContent value="video" className="space-y-4 mt-4">
          {/* 来源选择 */}
          <Card>
            <CardHeader>
              <CardTitle>脚本来源</CardTitle>
              <CardDescription>选择从已有文章改编或自定义主题</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={videoSource} onValueChange={(v) => setVideoSource(v as "topic" | "article")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="topic">自定义主题</TabsTrigger>
                  <TabsTrigger value="article">从文章改编</TabsTrigger>
                </TabsList>

                <TabsContent value="topic" className="mt-4">
                  <div className="space-y-2">
                    <Label>视频主题 *</Label>
                    <Input
                      placeholder="例如：如何用 AI 提升工作效率..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="article" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>选择来源文章</Label>
                    <Select value={selectedArticleId?.toString() || ""} onValueChange={(v) => setSelectedArticleId(v ? parseInt(v) : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择一篇文章..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background max-h-[300px]">
                        {articles.length === 0 ? (
                          <SelectItem value="empty" disabled>暂无文章，请先创建</SelectItem>
                        ) : (
                          articles.map((article) => (
                            <SelectItem key={article.id} value={article.id.toString()}>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{article.title}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedArticle && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{selectedArticle.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {selectedArticle.summary || selectedArticle.content.substring(0, 200)}...
                        </p>
                        <Badge variant="secondary" className="mt-2">将基于此文章改编为视频脚本</Badge>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 视频参数 */}
          <Card>
            <CardHeader>
              <CardTitle>视频参数</CardTitle>
              <CardDescription>设置视频的类型、平台和时长</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>视频类型</Label>
                <Tabs value={videoType} onValueChange={setVideoType}>
                  <TabsList className="grid w-full grid-cols-5">
                    {VIDEO_TYPES.map((type) => (
                      <TabsTrigger key={type.value} value={type.value}>{type.label}</TabsTrigger>
                    ))}
                  </TabsList>
                  {VIDEO_TYPES.map((type) => (
                    <TabsContent key={type.value} value={type.value}>
                      <p className="text-sm text-muted-foreground">{type.desc}</p>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>目标平台</Label>
                  <Select value={videoPlatform} onValueChange={setVideoPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      {VIDEO_PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>视频时长</Label>
                  <Select value={videoDuration.toString()} onValueChange={(v) => setVideoDuration(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background">
                      {VIDEO_DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleGenerateVideo}
              disabled={isCreating || (videoSource === "topic" ? !customTopic.trim() : !selectedArticleId)}
            >
              <Video className="mr-2 h-5 w-5" />
              {isCreating ? "生成中..." : videoSource === "article" ? "改编为脚本" : "生成脚本"}
            </Button>
          </div>

          {isCreating && (
            <Card>
              <CardHeader><CardTitle>生成进度</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} />
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>{progressMessage}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {generatedScript && !isCreating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">脚本预览</h2>
                  {generatedScript.sourceArticleId && (
                    <Badge variant="outline"><FileText className="mr-1 h-3 w-3" />从文章改编</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerateVideo}>
                    <RefreshCw className="mr-2 h-4 w-4" /> 重新生成
                  </Button>
                  <Button variant="outline" onClick={handleExportMarkdown}>
                    <Download className="mr-2 h-4 w-4" /> 导出 Markdown
                  </Button>
                  <Button onClick={handleSaveVideo}>
                    <Save className="mr-2 h-4 w-4" /> 保存修改
                  </Button>
                </div>
              </div>

              {/* 封面标题建议 */}
              {generatedScript.coverTitles?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">封面标题建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {generatedScript.coverTitles.map((title, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary/20 px-3 py-1.5 text-sm"
                          onClick={() => handleCopyCover(i, title)}
                        >
                          {title}
                          {copiedCover === i ? <Check className="ml-2 h-3 w-3 text-green-500" /> : <Copy className="ml-2 h-3 w-3 opacity-50" />}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 脚本内容 */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">脚本正文</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <Textarea
                      className="h-full resize-none font-mono text-sm"
                      value={editedScriptContent}
                      onChange={(e) => setEditedScriptContent(e.target.value)}
                    />
                  </CardContent>
                </Card>

                <Card className="h-[600px] flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">分镜头建议</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto">
                    {editedStoryboard.length > 0 ? (
                      <div className="space-y-3">
                        {editedStoryboard.map((item, index) => (
                          <div key={index} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{item.seq}</Badge>
                              <Input
                                className="w-24 h-7 text-xs"
                                value={item.timeRange}
                                onChange={(e) => updateStoryboardItem(index, "timeRange", e.target.value)}
                              />
                              <Input
                                className="flex-1 h-7 text-xs"
                                placeholder="BGM风格"
                                value={item.bgm}
                                onChange={(e) => updateStoryboardItem(index, "bgm", e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Input
                                className="text-sm"
                                placeholder="画面描述"
                                value={item.scene}
                                onChange={(e) => updateStoryboardItem(index, "scene", e.target.value)}
                              />
                              <Input
                                className="text-sm"
                                placeholder="文案/口播"
                                value={item.script}
                                onChange={(e) => updateStoryboardItem(index, "script", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        暂无分镜头数据
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 小红书发布成功二维码弹窗 */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎉 发布成功
            </DialogTitle>
            <DialogDescription>
              请使用小红书App扫描下方二维码完成发布
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            {qrDialogData?.qrCodeUrl && (
              <img
                src={qrDialogData.qrCodeUrl}
                alt="小红书发布二维码"
                className="w-48 h-48 border rounded-lg shadow-sm"
              />
            )}
            <p className="text-sm text-muted-foreground text-center">
              {qrDialogData?.title || '扫码后在小红书App中完成发布'}
            </p>
            {qrDialogData?.publishUrl && (
              <a
                href={qrDialogData.publishUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                或点击此处在浏览器中打开
              </a>
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={() => {
              setQrDialogOpen(false)
              router.push('/publish-management')
            }}>
              完成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
