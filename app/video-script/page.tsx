"use client"

import { useState, useEffect } from "react"
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
import { Wand2, Download, Save, RefreshCw, Copy, Check, FileText } from "lucide-react"

interface StoryboardItem {
    seq: number
    timeRange: string
    scene: string
    script: string
    bgm: string
    notes: string
}

interface GeneratedScript {
    id: number
    title: string
    platform: string
    videoType: string
    duration: number
    content: string
    storyboard: StoryboardItem[] | null
    coverTitles: string[]
    sourceArticleId?: number
}

interface Article {
    id: number
    title: string
    content: string
    summary: string | null
    createdAt: string
}

const VIDEO_TYPES = [
    { value: "知识分享", label: "知识分享", desc: "专业深度内容，适合教学" },
    { value: "产品测评", label: "产品测评", desc: "客观分析产品优缺点" },
    { value: "Vlog", label: "Vlog", desc: "个人日常、生活记录" },
    { value: "口播", label: "口播", desc: "直接面对镜头表达" },
    { value: "剧情", label: "剧情短片", desc: "有故事情节的内容" },
]

const PLATFORMS = [
    { value: "bilibili", label: "Bilibili / B站" },
    { value: "youtube", label: "YouTube" },
]

const DURATIONS = [
    { value: 60, label: "1分钟（短视频）" },
    { value: 180, label: "3分钟（中等）" },
    { value: 300, label: "5分钟（长视频）" },
]

export default function VideoScriptPage() {
    // 来源选择
    const [source, setSource] = useState<"topic" | "article">("topic")
    const [articles, setArticles] = useState<Article[]>([])
    const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

    const [platform, setPlatform] = useState("bilibili")
    const [videoType, setVideoType] = useState("知识分享")
    const [duration, setDuration] = useState(180)
    const [topic, setTopic] = useState("")

    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressMessage, setProgressMessage] = useState("")

    const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null)
    const [editedContent, setEditedContent] = useState("")
    const [editedStoryboard, setEditedStoryboard] = useState<StoryboardItem[]>([])
    const [copiedCover, setCopiedCover] = useState<number | null>(null)

    // 加载文章列表
    useEffect(() => {
        loadArticles()
    }, [])

    // 当选择文章时，更新选中的文章详情
    useEffect(() => {
        if (selectedArticleId) {
            const article = articles.find((a) => a.id === selectedArticleId)
            setSelectedArticle(article || null)
            if (article) {
                setTopic(article.title) // 自动填充主题
            }
        } else {
            setSelectedArticle(null)
        }
    }, [selectedArticleId, articles])

    const loadArticles = async () => {
        try {
            const response = await fetch("/api/articles?limit=50")
            const data = await response.json()
            if (data.success) {
                setArticles(data.data)
            }
        } catch (error) {
            console.error("加载文章列表失败:", error)
        }
    }

    const handleGenerate = async () => {
        // 验证输入
        if (source === "topic" && !topic.trim()) {
            alert("请输入视频主题")
            return
        }
        if (source === "article" && !selectedArticleId) {
            alert("请选择来源文章")
            return
        }

        setIsGenerating(true)
        setProgress(0)
        setProgressMessage("正在分析内容...")
        setGeneratedScript(null)

        try {
            // 模拟进度
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval)
                        return prev
                    }
                    return prev + 10
                })
            }, 500)

            setProgress(20)
            setProgressMessage(source === "article" ? "正在改编文章为视频脚本..." : "AI正在创作脚本...")

            const response = await fetch("/api/video-script/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    platform,
                    videoType,
                    duration,
                    topic: source === "topic" ? topic : selectedArticle?.title,
                    sourceArticleId: source === "article" ? selectedArticleId : null,
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
            setEditedContent(data.data.content)
            setEditedStoryboard(data.data.storyboard || [])

            // 延迟隐藏进度条
            setTimeout(() => {
                setIsGenerating(false)
                setProgress(0)
            }, 500)
        } catch (error) {
            console.error("生成失败:", error)
            alert(error instanceof Error ? error.message : "生成失败，请重试")
            setIsGenerating(false)
            setProgress(0)
        }
    }

    const handleSave = async () => {
        if (!generatedScript) return

        try {
            const response = await fetch(`/api/video-script/${generatedScript.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: editedContent,
                    storyboard: editedStoryboard,
                }),
            })

            if (!response.ok) throw new Error("保存失败")

            alert("保存成功！")
        } catch (error) {
            console.error("保存失败:", error)
            alert("保存失败，请重试")
        }
    }

    const handleExportMarkdown = () => {
        if (!generatedScript) return

        const storyboardTable = editedStoryboard.length > 0
            ? `\n\n---\n\n## 分镜头建议\n\n| 序号 | 时间段 | 画面描述 | 文案/口播 | BGM | 备注 |\n|:----:|:------:|:---------|:----------|:----|:-----|\n${editedStoryboard
                .map(
                    (s) =>
                        `| ${s.seq} | ${s.timeRange} | ${s.scene} | ${s.script} | ${s.bgm} | ${s.notes} |`
                )
                .join("\n")}`
            : ""

        const coverSection = generatedScript.coverTitles?.length > 0
            ? `\n\n---\n\n## 封面标题建议\n\n${generatedScript.coverTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
            : ""

        const sourceInfo = generatedScript.sourceArticleId
            ? `\n- 来源文章ID：${generatedScript.sourceArticleId}`
            : ""

        const markdown = `# 视频脚本：${generatedScript.title}

## 基本信息
- 目标平台：${generatedScript.platform === "bilibili" ? "Bilibili" : "YouTube"}
- 视频时长：${Math.floor(generatedScript.duration / 60)}分${generatedScript.duration % 60}秒
- 视频类型：${generatedScript.videoType}${sourceInfo}

---

${editedContent}${storyboardTable}${coverSection}
`

        const blob = new Blob([markdown], { type: "text/markdown" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `视频脚本_${generatedScript.title}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleCopyCover = (index: number, title: string) => {
        navigator.clipboard.writeText(title)
        setCopiedCover(index)
        setTimeout(() => setCopiedCover(null), 2000)
    }

    const updateStoryboardItem = (index: number, field: keyof StoryboardItem, value: string | number) => {
        setEditedStoryboard((prev) => {
            const newList = [...prev]
            newList[index] = { ...newList[index], [field]: value }
            return newList
        })
    }

    const canGenerate = source === "topic" ? topic.trim() : selectedArticleId

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">视频脚本生成</h1>
                <p className="text-muted-foreground mt-2">
                    AI一键生成短视频脚本，支持从文章改编或自定义主题
                </p>
            </div>

            {/* 来源选择 */}
            <Card>
                <CardHeader>
                    <CardTitle>脚本来源</CardTitle>
                    <CardDescription>选择从已有文章改编或自定义主题</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={source} onValueChange={(v) => setSource(v as "topic" | "article")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="topic">自定义主题</TabsTrigger>
                            <TabsTrigger value="article">从文章改编</TabsTrigger>
                        </TabsList>

                        <TabsContent value="topic" className="mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="topic">视频主题 *</Label>
                                <Input
                                    id="topic"
                                    placeholder="例如：如何用 AI 提升工作效率、5个必备的效率工具..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="article" className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <Label>选择来源文章</Label>
                                <Select
                                    value={selectedArticleId?.toString() || ""}
                                    onValueChange={(v) => setSelectedArticleId(v ? parseInt(v) : null)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="请选择一篇文章..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background max-h-[300px]">
                                        {articles.length === 0 ? (
                                            <SelectItem value="empty" disabled>
                                                暂无文章，请先创建文章
                                            </SelectItem>
                                        ) : (
                                            articles.map((article) => (
                                                <SelectItem key={article.id} value={article.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <span>{article.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({new Date(article.createdAt).toLocaleDateString()})
                                                        </span>
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
                                        <Badge variant="secondary" className="mt-2">
                                            将基于此文章改编为视频脚本
                                        </Badge>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* 参数设置 */}
            <Card>
                <CardHeader>
                    <CardTitle>视频参数</CardTitle>
                    <CardDescription>设置视频的类型、平台和时长</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 视频类型选择 */}
                    <div className="space-y-3">
                        <Label>视频类型</Label>
                        <Tabs value={videoType} onValueChange={setVideoType}>
                            <TabsList className="grid w-full grid-cols-5">
                                {VIDEO_TYPES.map((type) => (
                                    <TabsTrigger key={type.value} value={type.value}>
                                        {type.label}
                                    </TabsTrigger>
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
                            <Select value={platform} onValueChange={setPlatform}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                    {PLATFORMS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>视频时长</Label>
                            <Select
                                value={duration.toString()}
                                onValueChange={(v) => setDuration(parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                    {DURATIONS.map((d) => (
                                        <SelectItem key={d.value} value={d.value.toString()}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                        <Button
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || !canGenerate}
                        >
                            <Wand2 className="mr-2 h-5 w-5" />
                            {isGenerating ? "生成中..." : source === "article" ? "改编为脚本" : "生成脚本"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 生成进度 */}
            {isGenerating && (
                <Card>
                    <CardHeader>
                        <CardTitle>生成进度</CardTitle>
                    </CardHeader>
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
            {generatedScript && !isGenerating && (
                <div className="space-y-4">
                    {/* 操作栏 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold">脚本预览</h2>
                            {generatedScript.sourceArticleId && (
                                <Badge variant="outline">
                                    <FileText className="mr-1 h-3 w-3" />
                                    从文章改编
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleGenerate}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                重新生成
                            </Button>
                            <Button variant="outline" onClick={handleExportMarkdown}>
                                <Download className="mr-2 h-4 w-4" />
                                导出 Markdown
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                保存修改
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
                                            {copiedCover === i ? (
                                                <Check className="ml-2 h-3 w-3 text-green-500" />
                                            ) : (
                                                <Copy className="ml-2 h-3 w-3 opacity-50" />
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 分栏预览 */}
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* 左侧：脚本正文 */}
                        <Card className="h-[600px] flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">脚本正文</CardTitle>
                                <CardDescription>可直接编辑修改</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden">
                                <Textarea
                                    className="h-full resize-none font-mono text-sm"
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                />
                            </CardContent>
                        </Card>

                        {/* 右侧：分镜头建议 */}
                        <Card className="h-[600px] flex flex-col">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">分镜头建议</CardTitle>
                                <CardDescription>可直接编辑修改</CardDescription>
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
                                                        onChange={(e) =>
                                                            updateStoryboardItem(index, "timeRange", e.target.value)
                                                        }
                                                    />
                                                    <Input
                                                        className="flex-1 h-7 text-xs"
                                                        placeholder="BGM风格"
                                                        value={item.bgm}
                                                        onChange={(e) =>
                                                            updateStoryboardItem(index, "bgm", e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Input
                                                        className="text-sm"
                                                        placeholder="画面描述"
                                                        value={item.scene}
                                                        onChange={(e) =>
                                                            updateStoryboardItem(index, "scene", e.target.value)
                                                        }
                                                    />
                                                    <Input
                                                        className="text-sm"
                                                        placeholder="文案/口播"
                                                        value={item.script}
                                                        onChange={(e) =>
                                                            updateStoryboardItem(index, "script", e.target.value)
                                                        }
                                                    />
                                                    <Input
                                                        className="text-sm text-muted-foreground"
                                                        placeholder="备注"
                                                        value={item.notes}
                                                        onChange={(e) =>
                                                            updateStoryboardItem(index, "notes", e.target.value)
                                                        }
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
        </div>
    )
}
