"use client"

import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { marked } from "marked"

type ArticleStatus = "draft" | "pending_review" | "published"

interface Article {
  id: number
  title: string
  content: string
  summary: string | null
  status: ArticleStatus
  createdAt: string
  updatedAt: string
}

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
    .wechat-article h1 {
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0 10px;
      line-height: 1.4;
    }
    .wechat-article h2 {
      font-size: 22px;
      font-weight: bold;
      margin: 18px 0 10px;
      line-height: 1.4;
    }
    .wechat-article h3 {
      font-size: 20px;
      font-weight: bold;
      margin: 16px 0 10px;
      line-height: 1.4;
    }
    .wechat-article p {
      margin: 10px 0;
      text-align: justify;
    }
    .wechat-article strong {
      font-weight: bold;
      color: #000;
    }
    .wechat-article em {
      font-style: italic;
    }
    .wechat-article blockquote {
      border-left: 4px solid #e0e0e0;
      padding-left: 16px;
      margin: 16px 0;
      color: #666;
    }
    .wechat-article code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "Courier New", monospace;
      font-size: 14px;
    }
    .wechat-article pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .wechat-article pre code {
      background: none;
      padding: 0;
    }
    .wechat-article ul, .wechat-article ol {
      margin: 10px 0;
      padding-left: 24px;
    }
    .wechat-article li {
      margin: 6px 0;
    }
    .wechat-article img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 16px auto;
    }
    .wechat-article hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 20px 0;
    }
  </style>
`

export default function ArticleEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const articleId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [summary, setSummary] = useState("")
  const [status, setStatus] = useState<ArticleStatus>("draft")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<string[]>([""])
  const historyIndexRef = useRef(0)

  /**
   * 重置内容历史栈，保证撤销基线正确。
   */
  const resetHistory = (initialValue: string) => {
    historyRef.current = [initialValue]
    historyIndexRef.current = 0
  }

  /**
   * 记录内容变更，支撑 Cmd+Z / Cmd+Shift+Z。
   */
  const pushHistory = (nextValue: string) => {
    const history = historyRef.current
    const currentIndex = historyIndexRef.current

    if (history[currentIndex] === nextValue) return

    const nextHistory = history.slice(0, currentIndex + 1)
    nextHistory.push(nextValue)

    const MAX_HISTORY = 200
    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift()
    }

    historyRef.current = nextHistory
    historyIndexRef.current = nextHistory.length - 1
  }

  /**
   * 处理内容输入并写入历史。
   */
  const handleContentChange = (value: string) => {
    setContent(value)
    pushHistory(value)
  }

  /**
   * 撤销一步。
   */
  const handleUndo = () => {
    const currentIndex = historyIndexRef.current
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      historyIndexRef.current = newIndex
      setContent(historyRef.current[newIndex])
    }
  }

  /**
   * 重做一步。
   */
  const handleRedo = () => {
    const history = historyRef.current
    const currentIndex = historyIndexRef.current
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      historyIndexRef.current = newIndex
      setContent(history[newIndex])
    }
  }

  /**
   * 捕获 Cmd+Z / Cmd+Shift+Z 快捷键。
   */
  const handleEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.metaKey) return
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        handleRedo()
      } else {
        handleUndo()
      }
    }
  }

  // 自动调整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [content])

  // 实时预览HTML
  const previewHtml = useMemo(() => {
    try {
      // 如果内容看起来像Markdown,就转换它
      const isMarkdown = content.includes('#') || content.includes('**') || content.includes('- ')
      if (isMarkdown && !content.includes('<p>') && !content.includes('<div>')) {
        const html = marked(content) as string
        return WECHAT_STYLE + `<div class="wechat-article">${html}</div>`
      }
      // 否则直接使用HTML
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    } catch (error) {
      return WECHAT_STYLE + `<div class="wechat-article">${content}</div>`
    }
  }, [content])

  // 加载文章
  useEffect(() => {
    if (articleId) {
      loadArticle(parseInt(articleId))
    } else {
      router.push('/publish-management')
    }
  }, [articleId])

  const loadArticle = async (id: number) => {
    try {
      const response = await fetch(`/api/articles/${id}`)
      const data = await response.json()

      if (data.success) {
        const articleData = data.data
        setArticle(articleData)
        setTitle(articleData.title)
        setContent(articleData.content)
        setSummary(articleData.summary || "")
        setStatus(articleData.status)
        resetHistory(articleData.content)
      } else {
        alert('❌ 加载文章失败：' + (data.error || '未知错误'))
        router.push('/publish-management')
      }
    } catch (error) {
      console.error('加载文章失败:', error)
      alert('❌ 加载文章失败')
      router.push('/publish-management')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!articleId) return

    if (!title.trim()) {
      alert('请输入文章标题')
      return
    }

    if (!content.trim()) {
      alert('请输入文章内容')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          summary: summary || null,
          status,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ 保存成功')
        router.push('/publish-management')
      } else {
        alert('❌ 保存失败：' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('❌ 保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/publish-management')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">编辑文章</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={statusConfig[status].variant}>
            {statusConfig[status].label}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入文章标题"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">摘要</label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="请输入文章摘要（可选）"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
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
        </CardContent>
      </Card>

      {/* 左右分栏：编辑器和预览 */}
      <div className="grid grid-cols-2 gap-8 -mx-6">
        {/* 左侧：编辑器 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>编辑内容</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              placeholder="请输入文章内容（支持Markdown和HTML）"
              className="font-mono text-sm w-full resize-none overflow-hidden min-h-[800px]"
            />
          </CardContent>
        </Card>

        {/* 右侧：预览 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>公众号样式预览</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="border rounded-lg p-6 bg-white min-h-[800px]">
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
