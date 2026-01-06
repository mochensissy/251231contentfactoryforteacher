import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileEdit, FolderOpen, TrendingUp, Users, FileText, Video } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">欢迎使用内容工厂 Agent</h1>
        <p className="text-muted-foreground mt-2">
          AI驱动的内容创作与发布平台，让内容创作更高效
        </p>
      </div>

      {/* 快速操作 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/topic-analysis">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">选题分析</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                基于关键词分析公众号文章，获取选题洞察
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">开始分析</Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/content-creation">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">内容创作</CardTitle>
                <FileEdit className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                AI智能创作或手动编辑，一键发布到公众号
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">开始创作</Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/video-script">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">视频脚本</CardTitle>
                <Video className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                AI生成短视频脚本，自动分镜建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">生成脚本</Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/publish-management">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">文章库</CardTitle>
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                管理所有文章，发布到公众号和小红书
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">查看文章</Button>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* 数据概览 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">数据概览</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                总文章数
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                暂无数据
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                已发布
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                暂无数据
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                分析任务
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                暂无数据
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 最近活动 */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">最近活动</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>暂无活动记录</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
