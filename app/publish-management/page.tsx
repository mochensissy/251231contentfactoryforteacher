"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { QRCodeDialog } from "@/components/qr-code-dialog"
import { ArticlePreviewDialog } from "@/components/article-preview-dialog"

type ArticleStatus = "draft" | "pending_review" | "published"

interface Article {
  id: number
  title: string
  content: string
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

  // 加载文章列表
  useEffect(() => {
    loadArticles()
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

  // 发布到公众号（HR进化派）
  const handlePublishToWechat = async (articleId: number) => {
    if (publishingId) {
      alert('有文章正在发布中，请稍候...')
      return
    }

    const confirmed = confirm('确定要发布到HR进化派公众号吗？\n\n流程：AI排版（褐黄色） → 生成封面 → 推送到草稿箱\n预计需要30-60秒')
    if (!confirmed) return

    setPublishingId(articleId)
    setPublishingPlatform('wechat')

    try {
      const response = await fetch('/api/publish/wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
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

  // 发布到公众号（闻思修AI手记）
  const handlePublishToWechatPGZ = async (articleId: number) => {
    if (publishingId) {
      alert('有文章正在发布中，请稍候...')
      return
    }

    const confirmed = confirm('确定要发布到闻思修AI手记公众号吗？\n\n流程：AI排版（赭黄色，与HR进化派一致） → 生成封面 → 推送到草稿箱\n预计需要30-60秒')
    if (!confirmed) return

    setPublishingId(articleId)
    setPublishingPlatform('wechat_pgz')

    try {
      const response = await fetch('/api/publish/wechat-pgz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
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

  // 发布到小红书
  const handlePublishToXiaohongshu = async (articleId: number) => {
    if (publishingId) {
      alert('有文章正在发布中，请稍候...')
      return
    }

    const confirmed = confirm('确定要发布到小红书吗？\n\n流程：图文分离 → 小红书风格改写 → 图片置顶 → 调用发布API\n预计需要10-20秒')
    if (!confirmed) return

    setPublishingId(articleId)
    setPublishingPlatform('xiaohongshu')

    try {
      const response = await fetch('/api/publish/xiaohongshu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 显示二维码弹窗
        setQrDialogData({
          url: data.data.publishUrl,
          qrImageUrl: data.data.qrCodeUrl,
          title: '小红书发布成功',
        })
        setQrDialogOpen(true)

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
    router.push(`/article-edit?id=${articleId}`)
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
      const response = await fetch(`/api/articles/${article.id}/rewrite-twitter`, {
        method: 'POST',
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
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">发布管理</h1>
        <p className="text-muted-foreground mt-2">
          管理所有文章，发布到微信公众号和小红书
        </p>
      </div>

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
            <Button onClick={() => router.push('/article-new')}>
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
                  <TableHead className="w-[120px]">状态</TableHead>
                  <TableHead className="w-[140px]">创建时间</TableHead>
                  <TableHead className="w-[140px]">更新时间</TableHead>
                  <TableHead className="w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
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
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => handlePublishToWechat(article.id)}
                                  disabled={publishingId !== null}
                                >
                                  {publishingId === article.id && publishingPlatform === 'wechat' ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      发布中...
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      发布到公众号（HR进化派）
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-teal-600"
                                  onClick={() => handlePublishToWechatPGZ(article.id)}
                                  disabled={publishingId !== null}
                                >
                                  {publishingId === article.id && publishingPlatform === 'wechat_pgz' ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      发布中...
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      发布到公众号（闻思修AI手记）
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-orange-600"
                                  onClick={() => handlePublishToXiaohongshu(article.id)}
                                  disabled={publishingId !== null}
                                >
                                  {publishingId === article.id && publishingPlatform === 'xiaohongshu' ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      发布中...
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="mr-2 h-4 w-4" />
                                      发布到小红书
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
