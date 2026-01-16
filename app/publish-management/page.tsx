"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Share2,
  Copy,
  Trash2,
  Loader2,
  RefreshCw,
  Save
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { QRCodeDialog } from "@/components/qr-code-dialog"
import { ArticlePreviewDialog } from "@/components/article-preview-dialog"
import { getEnabledWechatAccounts, type WechatAccount } from "@/lib/wechat-accounts"
import { getImageApiConfig, getPromptSettings } from "@/lib/api-config"

// 平台类型
type PlatformFilter = "all" | "wechat" | "xiaohongshu" | "twitter"

// 平台配置
const PLATFORM_CONFIG: Record<Exclude<PlatformFilter, "all">, { name: string; icon: string }> = {
  wechat: { name: "公众号", icon: "📱" },
  xiaohongshu: { name: "小红书", icon: "📕" },
  twitter: { name: "推特", icon: "🐦" },
}

type ArticleStatus = "draft" | "pending_review" | "published"

interface Article {
  id: number
  title: string
  content: string
  platform: string
  status: ArticleStatus
  summary: string | null
  createdAt: string
  updatedAt: string
  publishRecords: Array<{
    platform: string
    status: string
  }>
}

const statusConfig: Record<ArticleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "草稿", variant: "outline" },
  pending_review: { label: "待审核", variant: "secondary" },
  published: { label: "已发布", variant: "default" },
}

export default function PublishManagementPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "all">("all")
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all")
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<number | null>(null)
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null)

  // 推特文案改写
  const [twitterDialogOpen, setTwitterDialogOpen] = useState(false)
  const [twitterContent, setTwitterContent] = useState("")
  const [twitterLoading, setTwitterLoading] = useState(false)
  const [twitterArticle, setTwitterArticle] = useState<Article | null>(null)
  const [twitterError, setTwitterError] = useState<string | null>(null)

  // 小红书文案改写
  const [xhsDialogOpen, setXhsDialogOpen] = useState(false)
  const [xhsContent, setXhsContent] = useState("")
  const [xhsLoading, setXhsLoading] = useState(false)
  const [xhsArticle, setXhsArticle] = useState<Article | null>(null)
  const [xhsError, setXhsError] = useState<string | null>(null)
  const [xhsSaving, setXhsSaving] = useState(false)

  // 短视频脚本改写
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoContent, setVideoContent] = useState("")
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoArticle, setVideoArticle] = useState<Article | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSaving, setVideoSaving] = useState(false)

  // 二维码弹窗状态
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrDialogData, setQrDialogData] = useState<{
    url: string
    qrImageUrl?: string
    title: string
  } | null>(null)

  // 预览弹窗状态
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // 状态修改弹窗
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [newStatus, setNewStatus] = useState<ArticleStatus>("draft")

  // 公众号配置
  const [wechatAccounts, setWechatAccounts] = useState<WechatAccount[]>([])

  // 加载文章列表和公众号配置
  useEffect(() => {
    loadArticles()
    // 加载公众号配置
    const accounts = getEnabledWechatAccounts()
    setWechatAccounts(accounts)
  }, [])

  const loadArticles = async () => {
    try {
      const response = await fetch('/api/articles')
      const data = await response.json()

      if (data.success) {
        setArticles(data.data)
      }
    } catch (error) {
      console.error('加载文章列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 发布到公众号（动态账号）
  const handlePublishToWechatGeneric = async (articleId: number, account: WechatAccount) => {
    if (publishingId) {
      alert('有文章正在发布中，请稍候...')
      return
    }

    const confirmed = confirm(`确定要发布到【${account.name}】公众号吗？\n\n流程：AI排版 → 生成封面 → 推送到草稿箱\n预计需要30-60秒`)
    if (!confirmed) return

    setPublishingId(articleId)
    setPublishingPlatform(`wechat_${account.id}`)

    try {
      const response = await fetch('/api/publish/wechat-generic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          account: {
            name: account.name,
            appId: account.appId,
            appSecret: account.appSecret,
            webhookUrl: account.webhookUrl,
          },
          imageApiConfig: getImageApiConfig(),
          coverPrompt: getPromptSettings().coverPrompt,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ ' + data.data.message)
        // 刷新列表
        loadArticles()
      } else {
        alert('❌ 发布失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('发布失败:', error)
      alert('❌ 发布失败：' + (error instanceof Error ? error.message : '网络错误'))
    } finally {
      setPublishingId(null)
      setPublishingPlatform(null)
    }
  }

  // 复制小红书内容（替代API发布）
  const handleCopyXiaohongshuContent = async (articleId: number) => {
    try {
      const response = await fetch(`/api/articles/${articleId}`)
      const data = await response.json()

      if (!data.success || !data.data) {
        alert('❌ 加载文章失败')
        return
      }

      const article = data.data
      // 转换为小红书格式的纯文本
      let content = article.content
        // 移除 Markdown 标题标记
        .replace(/^#{1,6}\s+/gm, '')
        // 移除图片标记
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // 移除链接，保留文字
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // 移除加粗
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // 移除斜体
        .replace(/\*(.*?)\*/g, '$1')
        // 清理多余空行
        .replace(/\n\n+/g, '\n\n')
        .trim()

      // 添加标题
      const fullContent = `${article.title}\n\n${content}`

      await navigator.clipboard.writeText(fullContent)
      alert('✅ 内容已复制到剪贴板！\n\n请打开小红书网页版或APP粘贴发布。')
    } catch (error) {
      console.error('复制失败:', error)
      alert('❌ 复制失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 预览文章
  const handlePreview = async (articleId: number) => {
    try {
      const response = await fetch(`/api/articles/${articleId}`)
      const data = await response.json()

      if (data.success) {
        setPreviewArticle(data.data)
        setPreviewOpen(true)
      } else {
        alert('❌ 加载文章失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      alert('❌ 加载文章失败')
    }
  }

  // 编辑文章
  const handleEdit = (articleId: number) => {
    router.push(`/content-creation?articleId=${articleId}&mode=manual`)
  }

  // 复制文章
  const handleDuplicate = async (articleId: number) => {
    const confirmed = confirm('确定要复制这篇文章吗？')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/articles/${articleId}/duplicate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 文章复制成功')
        loadArticles() // 刷新列表
      } else {
        alert('❌ 复制失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('复制文章失败:', error)
      alert('❌ 复制失败')
    }
  }

  // 删除文章
  const handleDelete = async (articleId: number) => {
    const confirmed = confirm('确定要删除这篇文章吗？此操作不可恢复！')
    if (!confirmed) return

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 文章删除成功')
        loadArticles() // 刷新列表
      } else {
        alert('❌ 删除失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('删除文章失败:', error)
      alert('❌ 删除失败')
    }
  }

  // 改写为推特文案
  const handleRewriteTwitter = async (article: Article) => {
    setTwitterArticle(article)
    setTwitterDialogOpen(true)
    setTwitterLoading(true)
    setTwitterError(null)

    try {
      // 获取AI配置
      const { getAiApiConfig } = await import('@/lib/api-config')
      const aiConfig = getAiApiConfig()

      const response = await fetch(`/api/articles/${article.id}/rewrite-twitter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model
        }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setTwitterContent(data.data.tweet)
      } else {
        setTwitterError(data.error || '改写失败，请稍后重试')
      }
    } catch (error) {
      console.error('改写推特文案失败:', error)
      setTwitterError(error instanceof Error ? error.message : '改写失败，请稍后重试')
    } finally {
      setTwitterLoading(false)
    }
  }


  // 重写（再次调用）
  const handleRetryTwitter = () => {
    if (!twitterArticle) return
    void handleRewriteTwitter(twitterArticle)
  }

  // 复制推特文案
  const handleCopyTwitter = async () => {
    if (!twitterContent) return
    try {
      await navigator.clipboard.writeText(twitterContent)
      alert('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  // 关闭弹窗时重置错误/加载状态
  useEffect(() => {
    if (!twitterDialogOpen) {
      setTwitterError(null)
      setTwitterLoading(false)
    }
  }, [twitterDialogOpen])

  // 改写为小红书文案
  const handleRewriteXiaohongshu = async (article: Article) => {
    setXhsArticle(article)
    setXhsDialogOpen(true)
    setXhsLoading(true)
    setXhsError(null)

    try {
      // 获取AI配置
      const { getAiApiConfig } = await import('@/lib/api-config')
      const aiConfig = getAiApiConfig()

      const response = await fetch(`/api/articles/${article.id}/rewrite-xiaohongshu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model
        }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setXhsContent(data.data.content)
      } else {
        setXhsError(data.error || '改写失败，请稍后重试')
      }
    } catch (error) {
      console.error('改写小红书文案失败:', error)
      setXhsError(error instanceof Error ? error.message : '改写失败，请稍后重试')
    } finally {
      setXhsLoading(false)
    }
  }

  // 重写小红书文案
  const handleRetryXiaohongshu = () => {
    if (!xhsArticle) return
    void handleRewriteXiaohongshu(xhsArticle)
  }

  // 复制小红书文案
  const handleCopyXiaohongshu = async () => {
    if (!xhsContent) return
    try {
      await navigator.clipboard.writeText(xhsContent)
      alert('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  // 保存小红书文案为新文章
  const handleSaveXiaohongshu = async () => {
    if (!xhsContent || !xhsArticle) return
    setXhsSaving(true)
    try {
      // 提取标题（第一行）
      const lines = xhsContent.split('\n')
      const title = lines[0].replace(/^[📕🔥💡✨🎯🌟📌🎉]+\s*/, '').trim() || `${xhsArticle.title}（小红书版）`

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: xhsContent,
          summary: `改写自：${xhsArticle.title}`,
          platform: 'xiaohongshu',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 已保存到文章库')
        setXhsDialogOpen(false)
        loadArticles() // 刷新列表
      } else {
        alert('❌ 保存失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('❌ 保存失败')
    } finally {
      setXhsSaving(false)
    }
  }

  // 关闭小红书弹窗时重置状态
  useEffect(() => {
    if (!xhsDialogOpen) {
      setXhsError(null)
      setXhsLoading(false)
    }
  }, [xhsDialogOpen])

  // 改写为短视频脚本
  const handleRewriteVideoScript = async (article: Article) => {
    setVideoArticle(article)
    setVideoDialogOpen(true)
    setVideoLoading(true)
    setVideoError(null)

    try {
      // 获取AI配置
      const { getAiApiConfig } = await import('@/lib/api-config')
      const aiConfig = getAiApiConfig()

      const response = await fetch(`/api/articles/${article.id}/rewrite-video-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiApiUrl: aiConfig.apiUrl,
          aiApiKey: aiConfig.apiKey,
          aiModel: aiConfig.model
        }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setVideoContent(data.data.content)
      } else {
        setVideoError(data.error || '改写失败，请稍后重试')
      }
    } catch (error) {
      console.error('改写短视频脚本失败:', error)
      setVideoError(error instanceof Error ? error.message : '改写失败，请稍后重试')
    } finally {
      setVideoLoading(false)
    }
  }

  // 重写短视频脚本
  const handleRetryVideoScript = () => {
    if (!videoArticle) return
    void handleRewriteVideoScript(videoArticle)
  }

  // 复制短视频脚本
  const handleCopyVideoScript = async () => {
    if (!videoContent) return
    try {
      await navigator.clipboard.writeText(videoContent)
      alert('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  // 保存短视频脚本为新文章
  const handleSaveVideoScript = async () => {
    if (!videoContent || !videoArticle) return
    setVideoSaving(true)
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${videoArticle.title}（短视频脚本）`,
          content: videoContent,
          summary: `改写自：${videoArticle.title}`,
          platform: 'video',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 已保存到文章库')
        setVideoDialogOpen(false)
        loadArticles() // 刷新列表
      } else {
        alert('❌ 保存失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('❌ 保存失败')
    } finally {
      setVideoSaving(false)
    }
  }

  // 关闭短视频弹窗时重置状态
  useEffect(() => {
    if (!videoDialogOpen) {
      setVideoError(null)
      setVideoLoading(false)
    }
  }, [videoDialogOpen])

  // 打开状态修改对话框
  const handleOpenStatusDialog = (article: Article) => {
    setEditingArticle(article)
    setNewStatus(article.status)
    setStatusDialogOpen(true)
  }

  // 更新文章状态
  const handleUpdateStatus = async () => {
    if (!editingArticle) return

    try {
      const response = await fetch(`/api/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 状态更新成功')
        setStatusDialogOpen(false)
        loadArticles() // 刷新列表
      } else {
        alert('❌ 更新失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('更新状态失败:', error)
      alert('❌ 更新失败')
    }
  }

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || article.status === statusFilter
    const matchesPlatform = platformFilter === "all" || article.platform === platformFilter
    return matchesSearch && matchesStatus && matchesPlatform
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">文章库</h1>
        <p className="text-muted-foreground mt-2">
          管理所有内容，按平台分类查看
        </p>
      </div>

      {/* 平台筛选标签 */}
      <Tabs value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="wechat" className="flex items-center gap-1">
            <span>📱</span> 公众号
          </TabsTrigger>
          <TabsTrigger value="xiaohongshu" className="flex items-center gap-1">
            <span>📕</span> 小红书
          </TabsTrigger>
          <TabsTrigger value="twitter" className="flex items-center gap-1">
            <span>🐦</span> 推特
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 操作栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索文章标题..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ArticleStatus | "all")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending_review">待审核</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => router.push('/content-creation?mode=manual')}>
              <Plus className="mr-2 h-4 w-4" />
              新建文章
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 文章列表 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-[80px]">平台</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[130px]">创建时间</TableHead>
                  <TableHead className="w-[130px]">更新时间</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                      {loading ? '加载中...' : '暂无文章'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.id}</TableCell>
                      <TableCell>
                        <div className="max-w-[400px] truncate font-medium">
                          {article.title}
                        </div>
                        {article.summary && (
                          <div className="text-xs text-muted-foreground mt-1 truncate max-w-[400px]">
                            {article.summary}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {article.platform && PLATFORM_CONFIG[article.platform as Exclude<PlatformFilter, "all">] ? (
                          <span className="flex items-center gap-1 text-sm">
                            <span>{PLATFORM_CONFIG[article.platform as Exclude<PlatformFilter, "all">].icon}</span>
                            <span className="text-muted-foreground">{PLATFORM_CONFIG[article.platform as Exclude<PlatformFilter, "all">].name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[article.status].variant}>
                          {statusConfig[article.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(article.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(article.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px] bg-background">
                            <DropdownMenuItem onClick={() => handlePreview(article.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              预览
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(article.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenStatusDialog(article)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              更改状态
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(article.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              复制
                            </DropdownMenuItem>
                            {article.status !== "published" && (
                              <>
                                {/* 动态生成公众号发布选项 */}
                                {wechatAccounts.length > 0 ? (
                                  wechatAccounts.map((account, index) => (
                                    <DropdownMenuItem
                                      key={account.id}
                                      className={index === 0 ? "text-green-600" : "text-teal-600"}
                                      onClick={() => handlePublishToWechatGeneric(article.id, account)}
                                      disabled={publishingId !== null}
                                    >
                                      {publishingId === article.id && publishingPlatform === `wechat_${account.id}` ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          发布中...
                                        </>
                                      ) : (
                                        <>
                                          <Share2 className="mr-2 h-4 w-4" />
                                          发布到公众号（{account.name}）
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <DropdownMenuItem
                                    className="text-muted-foreground"
                                    disabled
                                  >
                                    请先在设置中配置公众号
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-orange-600"
                                  onClick={() => handleRewriteXiaohongshu(article)}
                                  disabled={xhsLoading}
                                >
                                  {xhsLoading && xhsArticle?.id === article.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      改写中...
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      改写成小红书文案
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-blue-600"
                              onClick={() => handleRewriteTwitter(article)}
                              disabled={twitterLoading}
                            >
                              {twitterLoading && twitterArticle?.id === article.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  改写中...
                                </>
                              ) : (
                                <>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  改写成推特文案
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-purple-600"
                              onClick={() => handleRewriteVideoScript(article)}
                              disabled={videoLoading}
                            >
                              {videoLoading && videoArticle?.id === article.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  改写中...
                                </>
                              ) : (
                                <>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  改写成短视频脚本
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(article.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* 统计信息 */}
          {!loading && filteredArticles.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                共 {filteredArticles.length} 篇文章
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {articles.filter(a => a.status === "draft").length}
            </div>
            <p className="text-sm text-muted-foreground">草稿</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {articles.filter(a => a.status === "pending_review").length}
            </div>
            <p className="text-sm text-muted-foreground">待审核</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {articles.filter(a => a.status === "published").length}
            </div>
            <p className="text-sm text-muted-foreground">已发布</p>
          </CardContent>
        </Card>
      </div>

      {/* 二维码弹窗 */}
      {qrDialogData && (
        <QRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          title={qrDialogData.title}
          url={qrDialogData.url}
          qrImageUrl={qrDialogData.qrImageUrl}
          description="请使用手机扫描下方二维码查看发布结果"
        />
      )}

      {/* 预览弹窗 */}
      <ArticlePreviewDialog
        article={previewArticle}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* 推特文案预览 */}
      <Dialog open={twitterDialogOpen} onOpenChange={setTwitterDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>推特文案预览</DialogTitle>
            <DialogDescription>
              {twitterArticle ? `基于文章《${twitterArticle.title}》` : '改写后的推特文案'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {twitterLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在改写，请稍候...
              </div>
            )}
            {twitterError && !twitterLoading && (
              <div className="text-destructive text-sm">
                {twitterError}
              </div>
            )}
            {!twitterLoading && !twitterError && (
              <Textarea
                value={twitterContent}
                readOnly
                className="min-h-[180px] resize-none"
              />
            )}
            <div className="text-xs text-muted-foreground">
              单条推文需控制在 140 字内，可多次重写直到满意
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetryTwitter}
                disabled={twitterLoading || !twitterArticle}
              >
                {twitterLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重写中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重写
                  </>
                )}
              </Button>
              <Button
                onClick={handleCopyTwitter}
                disabled={!twitterContent || twitterLoading}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 小红书文案预览 */}
      <Dialog open={xhsDialogOpen} onOpenChange={setXhsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>小红书文案改写</DialogTitle>
            <DialogDescription>
              {xhsArticle ? `基于文章《${xhsArticle.title}》` : '改写后的小红书文案'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {xhsLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在智能改写中，请稍候...
              </div>
            )}
            {xhsError && !xhsLoading && (
              <div className="text-destructive text-sm p-2 flex items-center justify-center bg-red-50 rounded-md">
                <span className="mr-2">❌</span> {xhsError}
              </div>
            )}
            {!xhsLoading && !xhsError && (
              <Textarea
                value={xhsContent}
                onChange={(e) => setXhsContent(e.target.value)}
                placeholder="生成的内容将显示在这里..."
                className="min-h-[300px] resize-none font-sans"
              />
            )}
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
              <p>💡 提示：改写结果包含标题、正文和话题标签。您可以直接手动修改内容。</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2 pt-2 border-t">
            <Button
              variant="secondary"
              onClick={handleSaveXiaohongshu}
              disabled={xhsSaving || !xhsContent || xhsLoading}
              className="sm:w-auto"
            >
              {xhsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存到文章库
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetryXiaohongshu}
                disabled={xhsLoading || !xhsArticle}
              >
                {xhsLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重写中
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重写
                  </>
                )}
              </Button>
              <Button
                onClick={handleCopyXiaohongshu}
                disabled={!xhsContent || xhsLoading}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 短视频脚本预览 */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>短视频脚本改写</DialogTitle>
            <DialogDescription>
              {videoArticle ? `基于文章《${videoArticle.title}》` : '改写后的视频脚本'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {videoLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成口播脚本，请稍候...
              </div>
            )}
            {videoError && !videoLoading && (
              <div className="text-destructive text-sm p-2 flex items-center justify-center bg-red-50 rounded-md">
                <span className="mr-2">❌</span> {videoError}
              </div>
            )}
            {!videoLoading && !videoError && (
              <Textarea
                value={videoContent}
                onChange={(e) => setVideoContent(e.target.value)}
                placeholder="生成的脚本将显示在这里..."
                className="min-h-[300px] resize-none font-sans"
              />
            )}
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
              <p>💡 提示：脚本包含口播文案和画面建议，适合60-90秒视频。</p>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2 pt-2 border-t">
            <Button
              variant="secondary"
              onClick={handleSaveVideoScript}
              disabled={videoSaving || !videoContent || videoLoading}
              className="sm:w-auto"
            >
              {videoSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存到文章库
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetryVideoScript}
                disabled={videoLoading || !videoArticle}
              >
                {videoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重写中
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重写
                  </>
                )}
              </Button>
              <Button
                onClick={handleCopyVideoScript}
                disabled={!videoContent || videoLoading}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 状态修改弹窗 */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>更改文章状态</DialogTitle>
            <DialogDescription>
              选择新的状态并保存
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">文章标题</Label>
              <div className="text-sm text-muted-foreground">
                {editingArticle?.title}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">当前状态</Label>
              <Badge variant={statusConfig[editingArticle?.status || "draft"].variant} className="w-fit">
                {statusConfig[editingArticle?.status || "draft"].label}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">新状态</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ArticleStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="pending_review">待审核</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
