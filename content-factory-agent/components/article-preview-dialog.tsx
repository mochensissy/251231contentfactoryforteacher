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
            className="prose prose-sm max-w-none dark:prose-invert break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
