import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileEdit, FolderOpen, TrendingUp, Users, FileText } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="text-center py-6">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-primary">闻思修 / 智创平台</h1>
        <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto font-serif">
          以智慧驱动创作，让灵感自然流淌。
        </p>
      </div>

      {/* 核心功能区 */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="group relative overflow-hidden border transition-all hover:shadow-md hover:border-primary/20">
          <Link href="/topic-analysis" className="block h-full">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">选题分析</CardTitle>
              <CardDescription className="line-clamp-2">
                洞察全网趋势，捕捉创作灵感。基于深度分析挖掘最具潜力的内容选题。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start text-primary group-hover:translate-x-1 transition-transform p-0 hover:bg-transparent">
                开始分析 <span className="ml-2">→</span>
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="group relative overflow-hidden border transition-all hover:shadow-md hover:border-primary/20">
          <Link href="/content-creation" className="block h-full">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileEdit className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">内容创作</CardTitle>
              <CardDescription className="line-clamp-2">
                AI 辅助撰写，从大纲到正文。智能生成视频脚本，一键分发至多平台。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start text-primary group-hover:translate-x-1 transition-transform p-0 hover:bg-transparent">
                开始创作 <span className="ml-2">→</span>
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="group relative overflow-hidden border transition-all hover:shadow-md hover:border-primary/20">
          <Link href="/publish-management" className="block h-full">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FolderOpen className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">文章知识库</CardTitle>
              <CardDescription className="line-clamp-2">
                沉淀优质内容，管理发布矩阵。统一管理公众号、小红书等多渠道文章。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start text-primary group-hover:translate-x-1 transition-transform p-0 hover:bg-transparent">
                管理文章 <span className="ml-2">→</span>
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* 数据概览 */}
      <div className="pt-4">
        <h2 className="text-2xl font-serif font-bold tracking-tight mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          数据概览
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-secondary/30 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总文章数
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                持续积累财富
              </p>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已发布
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                影响力的延伸
              </p>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                分析任务
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                洞察市场的眼睛
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="pt-4">
        <h2 className="text-2xl font-serif font-bold tracking-tight mb-6">最近活动</h2>
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
              <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 opacity-50" />
              </div>
              <p className="font-medium">暂无活动记录</p>
              <p className="text-sm">开始您的第一次创作之旅吧</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
