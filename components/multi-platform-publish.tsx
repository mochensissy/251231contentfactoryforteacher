"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { XiaohongshuPreview } from "@/components/xiaohongshu-preview"
import { TwitterPreview } from "@/components/twitter-preview"
import { getEnabledWechatAccounts, type WechatAccount } from "@/lib/wechat-accounts"
import { RefreshCw, Copy, Check, Loader2, Send, Save } from "lucide-react"
import { marked } from "marked"
import Link from "next/link"
import { getAiApiConfig } from "@/lib/api-config"

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
    .wechat-article h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px; }
    .wechat-article h2 { font-size: 22px; font-weight: bold; margin: 18px 0 10px; }
    .wechat-article h3 { font-size: 20px; font-weight: bold; margin: 16px 0 10px; }
    .wechat-article p { margin: 10px 0; text-align: justify; }
    .wechat-article strong { font-weight: bold; color: #000; }
    .wechat-article blockquote { border-left: 4px solid #e0e0e0; padding-left: 16px; margin: 16px 0; color: #666; }
    .wechat-article code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .wechat-article pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 16px 0; }
    .wechat-article ul, .wechat-article ol { margin: 10px 0; padding-left: 24px; }
    .wechat-article li { margin: 6px 0; }
    .wechat-article img { max-width: 100%; height: auto; display: block; margin: 16px auto; }
  </style>
`

interface MultiPlatformPublishProps {
    originalContent: string
    originalTitle: string
    originalSummary?: string
    onSave?: () => void
    onPublish?: (account: WechatAccount) => void
    saving?: boolean
    publishingMap?: Record<string, boolean>
}

type Platform = 'wechat' | 'xiaohongshu' | 'twitter'

export function MultiPlatformPublish({
    originalContent,
    originalTitle,
    originalSummary = '',
    onSave,
    onPublish,
    saving = false,
    publishingMap = {}
}: MultiPlatformPublishProps) {
    const [activePlatform, setActivePlatform] = useState<Platform>('wechat')
    const [wechatAccounts, setWechatAccounts] = useState<WechatAccount[]>([])

    // 各平台内容状态
    const [wechatContent, setWechatContent] = useState(originalContent)
    const [xiaohongshuContent, setXiaohongshuContent] = useState('')
    const [twitterContent, setTwitterContent] = useState('')

    // 转换状态
    const [transforming, setTransforming] = useState<Platform | null>(null)
    const [copied, setCopied] = useState(false)

    // 加载公众号配置
    useEffect(() => {
        setWechatAccounts(getEnabledWechatAccounts())
    }, [])

    // 当原始内容变化时更新微信内容
    useEffect(() => {
        setWechatContent(originalContent)
    }, [originalContent])

    // 转换内容到指定平台
    const transformContent = async (platform: Platform) => {
        if (platform === 'wechat') {
            setWechatContent(originalContent)
            return
        }

        setTransforming(platform)
        try {
            // 获取 AI API 配置
            const aiConfig = getAiApiConfig()

            const response = await fetch('/api/content-transform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: originalContent,
                    title: originalTitle,
                    summary: originalSummary,
                    platform,
                    aiApiUrl: aiConfig.apiUrl,
                    aiApiKey: aiConfig.apiKey,
                    aiModel: aiConfig.model,
                }),
            })

            const data = await response.json()
            if (data.success) {
                if (platform === 'xiaohongshu') {
                    setXiaohongshuContent(data.data.content)
                } else if (platform === 'twitter') {
                    setTwitterContent(data.data.content)
                }
            } else {
                alert(`转换失败: ${data.error}`)
            }
        } catch (error) {
            console.error('转换失败:', error)
            alert('转换失败，请重试')
        } finally {
            setTransforming(null)
        }
    }

    // 切换平台时自动转换内容
    const handlePlatformChange = async (platform: Platform) => {
        setActivePlatform(platform)

        // 如果该平台还没有内容，自动转换
        if (platform === 'xiaohongshu' && !xiaohongshuContent) {
            await transformContent('xiaohongshu')
        } else if (platform === 'twitter' && !twitterContent) {
            await transformContent('twitter')
        }
    }

    // 复制内容到剪贴板
    const copyToClipboard = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('复制失败:', error)
            alert('复制失败')
        }
    }

    // 获取微信预览HTML
    const getWechatPreviewHtml = () => {
        try {
            const isMarkdown = wechatContent.includes('#') || wechatContent.includes('**') || wechatContent.includes('- ')
            if (isMarkdown && !wechatContent.includes('<p>') && !wechatContent.includes('<div>')) {
                const html = marked(wechatContent) as string
                return WECHAT_STYLE + `<div class="wechat-article">${html}</div>`
            }
            return WECHAT_STYLE + `<div class="wechat-article">${wechatContent}</div>`
        } catch {
            return WECHAT_STYLE + `<div class="wechat-article">${wechatContent}</div>`
        }
    }

    const isWorking = saving || Object.values(publishingMap).some(v => v) || transforming !== null

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        多平台发布
                        <Badge variant="secondary">3个平台</Badge>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activePlatform} onValueChange={(v) => handlePlatformChange(v as Platform)}>
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="wechat" className="flex items-center gap-1">
                            <span>📱</span> 微信公众号
                        </TabsTrigger>
                        <TabsTrigger value="xiaohongshu" className="flex items-center gap-1">
                            <span>📕</span> 小红书
                        </TabsTrigger>
                        <TabsTrigger value="twitter" className="flex items-center gap-1">
                            <span>🐦</span> 推特/X
                        </TabsTrigger>
                    </TabsList>

                    {/* 微信公众号 */}
                    <TabsContent value="wechat" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* 编辑区 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">编辑内容</span>
                                </div>
                                <Textarea
                                    value={wechatContent}
                                    onChange={(e) => setWechatContent(e.target.value)}
                                    className="font-mono text-sm min-h-[400px] resize-none"
                                    placeholder="编辑文章内容..."
                                />
                            </div>

                            {/* 预览区 */}
                            <div className="space-y-2">
                                <span className="text-sm font-medium">公众号预览</span>
                                <div className="border rounded-lg p-4 bg-white min-h-[400px] overflow-auto">
                                    <div dangerouslySetInnerHTML={{ __html: getWechatPreviewHtml() }} />
                                </div>
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 justify-end pt-2 border-t">
                            <Button variant="outline" onClick={onSave} disabled={isWorking}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                保存草稿
                            </Button>
                            {wechatAccounts.length > 0 ? (
                                wechatAccounts.map((account, index) => (
                                    <Button
                                        key={account.id}
                                        onClick={() => onPublish?.(account)}
                                        disabled={isWorking}
                                        className={index % 2 === 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-600 hover:bg-teal-700"}
                                    >
                                        {publishingMap[account.id] ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />发布中...</>
                                        ) : (
                                            <><Send className="mr-2 h-4 w-4" />发布到{account.name}</>
                                        )}
                                    </Button>
                                ))
                            ) : (
                                <Link href="/settings?tab=platform">
                                    <Button variant="outline" className="text-muted-foreground">
                                        <Send className="mr-2 h-4 w-4" />
                                        去设置中添加公众号
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </TabsContent>

                    {/* 小红书 */}
                    <TabsContent value="xiaohongshu" className="space-y-4">
                        {transforming === 'xiaohongshu' ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-[#FF2442]" />
                                <span className="ml-3 text-lg">正在转换为小红书风格...</span>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* 编辑区 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">编辑内容</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => transformContent('xiaohongshu')}
                                                disabled={isWorking}
                                            >
                                                <RefreshCw className="mr-1 h-3 w-3" />
                                                重新生成
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={xiaohongshuContent}
                                            onChange={(e) => setXiaohongshuContent(e.target.value)}
                                            className="font-mono text-sm min-h-[400px] resize-none"
                                            placeholder="小红书笔记内容..."
                                        />
                                    </div>

                                    {/* 预览区 */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium">小红书预览</span>
                                        <div className="min-h-[400px] flex items-start justify-center py-4 bg-gray-50 rounded-lg overflow-auto">
                                            <XiaohongshuPreview content={xiaohongshuContent} />
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-2 justify-end pt-2 border-t">
                                    <Button
                                        onClick={() => copyToClipboard(xiaohongshuContent)}
                                        disabled={!xiaohongshuContent || isWorking}
                                        className="bg-[#FF2442] hover:bg-[#E61F3D]"
                                    >
                                        {copied ? (
                                            <><Check className="mr-2 h-4 w-4" />已复制</>
                                        ) : (
                                            <><Copy className="mr-2 h-4 w-4" />一键复制</>
                                        )}
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        复制后打开小红书App粘贴发布
                                    </span>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* 推特/X */}
                    <TabsContent value="twitter" className="space-y-4">
                        {transforming === 'twitter' ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <span className="ml-3 text-lg">正在转换为推特风格...</span>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* 编辑区 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">编辑内容</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => transformContent('twitter')}
                                                disabled={isWorking}
                                            >
                                                <RefreshCw className="mr-1 h-3 w-3" />
                                                重新生成
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={twitterContent}
                                            onChange={(e) => setTwitterContent(e.target.value)}
                                            className="font-mono text-sm min-h-[400px] resize-none"
                                            placeholder="推文内容..."
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            💡 使用 1/、2/、3/ 格式或分隔线(---)创建推文串(Thread)
                                        </p>
                                    </div>

                                    {/* 预览区 */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium">推特预览</span>
                                        <div className="min-h-[400px] py-4 bg-gray-50 rounded-lg overflow-auto">
                                            <TwitterPreview content={twitterContent} />
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-2 justify-end pt-2 border-t">
                                    <Button
                                        onClick={() => copyToClipboard(twitterContent)}
                                        disabled={!twitterContent || isWorking}
                                        className="bg-black hover:bg-gray-800"
                                    >
                                        {copied ? (
                                            <><Check className="mr-2 h-4 w-4" />已复制</>
                                        ) : (
                                            <><Copy className="mr-2 h-4 w-4" />一键复制</>
                                        )}
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        复制后打开推特粘贴发布
                                    </span>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
