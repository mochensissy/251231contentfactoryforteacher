"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ThumbsUp, Eye, Share2, ExternalLink, Award } from "lucide-react"
import type { WechatArticle } from "@/lib/types"

interface ArticleCardProps {
  article: WechatArticle
  rank?: number
  showStats?: boolean
}

export function ArticleCard({ article, rank, showStats = true }: ArticleCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          {/* 排名徽章 */}
          {rank && (
            <div className="flex-shrink-0">
              {rank <= 3 ? (
                <div className="relative">
                  <Award
                    className={`h-8 w-8 ${
                      rank === 1
                        ? 'text-yellow-500'
                        : rank === 2
                        ? 'text-gray-400'
                        : 'text-amber-600'
                    }`}
                    fill="currentColor"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {rank}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold text-muted-foreground">{rank}</span>
                </div>
              )}
            </div>
          )}

          {/* 文章内容 */}
          <div className="flex-1 min-w-0">
            {/* 标题 */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-base hover:text-primary transition-colors flex items-start gap-1 group"
            >
              <span className="line-clamp-2">{article.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* 标签和日期 */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {article.is_original === 1 && (
                <Badge variant="secondary" className="text-xs">
                  原创
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{article.publish_time_str}</span>
            </div>

            {/* 互动数据 */}
            {showStats && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{article.read.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <span>{article.praise.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span>{article.looking.toLocaleString()}</span>
                </div>
                {article.read > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    互动率:{' '}
                    {(((article.praise + article.looking) / article.read) * 100).toFixed(2)}%
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
