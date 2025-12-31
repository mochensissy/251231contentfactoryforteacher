"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, ThumbsUp, Share2, TrendingUp, List, ExternalLink, Sparkles } from "lucide-react"
import type { AccountHistoryData } from "@/lib/types"
import { ArticleCard } from "@/components/article-card"

interface AccountHistoryViewProps {
  data: AccountHistoryData
  onAnalyzeTop20?: () => void
}

export function AccountHistoryView({ data, onAnalyzeTop20 }: AccountHistoryViewProps) {
  const { mpInfo, allArticles, top20 } = data

  return (
    <div className="space-y-6">
      {/* 公众号信息卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {mpInfo.headImg && (
              <img
                src={mpInfo.headImg}
                alt={mpInfo.nickname}
                className="w-16 h-16 rounded-full border-2 border-border"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{mpInfo.nickname}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>总文章数: {allArticles.length} 篇</span>
                <span>·</span>
                <span>
                  平均阅读:{' '}
                  {(
                    allArticles.reduce((sum, a) => sum + a.read, 0) / allArticles.length
                  ).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                </span>
                <span>·</span>
                <span>
                  最高阅读: {Math.max(...allArticles.map((a) => a.read)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 两个列表的 Tab 切换 */}
      <Tabs defaultValue="top20" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="top20" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              阅读量 TOP20
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <List className="h-4 w-4" />
              全部历史文章
            </TabsTrigger>
          </TabsList>

          {onAnalyzeTop20 && (
            <Button onClick={onAnalyzeTop20} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              基于 TOP20 进行深度分析
            </Button>
          )}
        </div>

        {/* TOP20 列表 */}
        <TabsContent value="top20" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>阅读量 TOP20</CardTitle>
              <CardDescription>
                根据阅读量排序的前 20 篇高质量文章，适合用于选题参考和内容分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top20.map((article, index) => (
                  <ArticleCard key={article.url} article={article} rank={index + 1} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 全部文章表格 */}
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>全部历史文章</CardTitle>
              <CardDescription>
                共 {allArticles.length} 篇文章 · 按发布时间倒序排列
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">标题</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4" />
                          阅读
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          点赞
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Share2 className="h-4 w-4" />
                          在看
                        </div>
                      </TableHead>
                      <TableHead>发表日期</TableHead>
                      <TableHead className="text-center">类型</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allArticles.map((article) => (
                      <TableRow key={article.url}>
                        <TableCell>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary flex items-center gap-1 group"
                          >
                            <span className="line-clamp-2">{article.title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {article.read.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {article.praise.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {article.looking.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {article.publish_time_str}
                        </TableCell>
                        <TableCell className="text-center">
                          {article.is_original === 1 && (
                            <Badge variant="secondary" className="text-xs">
                              原创
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 统计信息 */}
              <div className="mt-4 text-sm text-muted-foreground text-center">
                共 {allArticles.length} 篇文章
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
