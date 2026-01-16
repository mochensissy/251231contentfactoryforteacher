"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useMemo } from "react"

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

// 将 Markdown 转换为 HTML
function markdownToHtml(markdown: string): string {
  let html = markdown
    // 标题转换
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // 加粗转换
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // 斜体转换
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 图片转换  
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded my-2" />')
    // 链接转换
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank">$1</a>')
    // 分隔线
    .replace(/^---$/gm, '<hr class="my-4 border-gray-300" />')
    // 无序列表项（只转换单行）
    .replace(/^[\*\-]\s+(.*)$/gm, '<li class="ml-4">$1</li>')
    // 有序列表项
    .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4">$1</li>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    // 换行转段落（保留多个换行）
    .replace(/\n\n+/g, '</p><p class="mb-3">')
    // 单个换行转 <br>
    .replace(/\n/g, '<br />')

  return `<p class="mb-3">${html}</p>`
}

interface ArticlePreviewDialogProps {
  article: Article | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticlePreviewDialog({
  article,
  open,
  onOpenChange,
}: ArticlePreviewDialogProps) {
  // 使用 useMemo 缓存 HTML 转换结果
  const renderedContent = useMemo(() => {
    if (!article) return ''
    // 检测内容是否已经是 HTML（以 < 开头）
    if (article.content.trim().startsWith('<')) {
      return article.content
    }
    return markdownToHtml(article.content)
  }, [article])

  if (!article) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{article.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {article.summary}
              </DialogDescription>
            </div>
            <Badge variant={statusConfig[article.status].variant}>
              {statusConfig[article.status].label}
            </Badge>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground pt-2">
            <span>创建时间: {format(new Date(article.createdAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
            <span>更新时间: {format(new Date(article.updatedAt), "yyyy-MM-dd HH:mm", { locale: zhCN })}</span>
          </div>
        </DialogHeader>
        <div className="mt-6">
          <div
            className="prose prose-sm max-w-none dark:prose-invert break-words"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

