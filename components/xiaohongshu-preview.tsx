"use client"

import { cn } from "@/lib/utils"

interface XiaohongshuPreviewProps {
    content: string
    className?: string
}

// 将 Markdown 转换为小红书格式的纯文本（移除 Markdown 标记，保留格式化）
function parseMarkdownToText(markdown: string): {
    title: string
    body: string
    hashtags: string[]
} {
    const lines = markdown.split('\n')
    let title = ''
    const bodyLines: string[] = []
    const hashtags: string[] = []

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // 提取话题标签行
        const tagMatches = trimmedLine.match(/#[^\s#]+/g)
        if (tagMatches && tagMatches.length >= 3) {
            hashtags.push(...tagMatches)
            continue
        }

        // 处理标题（Markdown H1/H2）
        if (!title && (trimmedLine.startsWith('# ') || trimmedLine.startsWith('## '))) {
            title = trimmedLine.replace(/^#{1,2}\s+/, '').replace(/^[📕🔥💡✨🎯🌟📌🎉]+\s*/, '')
            continue
        }

        // 如果还没有标题，且这是第一个非空行，作为标题
        if (!title && !line.startsWith('#')) {
            title = trimmedLine.replace(/^[📕🔥💡✨🎯🌟📌🎉]+\s*/, '').replace(/\*\*/g, '')
            continue
        }

        bodyLines.push(trimmedLine)
    }

    // 处理正文：移除 Markdown 语法
    const processedBody = bodyLines
        .map(line => {
            return line
                // 移除 Markdown 标题标记
                .replace(/^#{1,6}\s+/, '')
                // 移除图片语法
                .replace(/!\[.*?\]\(.*?\)/g, '')
                // 移除链接语法，保留文字
                .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                // 移除加粗语法，保留文字
                .replace(/\*\*(.*?)\*\*/g, '$1')
                // 移除斜体语法，保留文字
                .replace(/\*(.*?)\*/g, '$1')
                // 移除行内代码
                .replace(/`([^`]+)`/g, '$1')
                // 移除笔记内容标记（如 **笔记内容：**）
                .replace(/^\*\*.*?[：:]\s*\*\*\s*/, '')
        })
        .join('\n\n')

    return { title, body: processedBody, hashtags }
}

export function XiaohongshuPreview({ content, className }: XiaohongshuPreviewProps) {
    const { title, body, hashtags } = parseMarkdownToText(content)

    return (
        <div className={cn("bg-white rounded-xl shadow-lg overflow-hidden max-w-[375px] mx-auto", className)}>
            {/* 小红书风格头部 */}
            <div className="bg-gradient-to-r from-[#FF2442] to-[#FF6B81] px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                        小
                    </div>
                    <span className="text-white font-medium text-sm">小红书笔记预览</span>
                </div>
            </div>

            {/* 封面图占位 */}
            <div className="aspect-[4/3] bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">📷</div>
                    <div className="text-sm">封面图</div>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="p-4 space-y-3">
                {/* 标题 */}
                <h2 className="font-bold text-base leading-snug text-gray-900">
                    {title || '笔记标题'}
                </h2>

                {/* 正文 - 渲染格式化后的内容 */}
                <div className="text-sm text-gray-700 leading-relaxed">
                    {body.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 last:mb-0">
                            {paragraph}
                        </p>
                    ))}
                </div>

                {/* 话题标签 */}
                {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                        {hashtags.map((tag, index) => (
                            <span
                                key={index}
                                className="text-[#FF2442] text-xs hover:underline cursor-pointer"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* 底部互动栏 */}
            <div className="border-t px-4 py-3 flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-1 text-sm hover:text-[#FF2442]">
                        <span>❤️</span>
                        <span>收藏</span>
                    </button>
                    <button className="flex items-center gap-1 text-sm hover:text-[#FF2442]">
                        <span>💬</span>
                        <span>评论</span>
                    </button>
                </div>
                <button className="flex items-center gap-1 text-sm hover:text-[#FF2442]">
                    <span>↗️</span>
                    <span>分享</span>
                </button>
            </div>
        </div>
    )
}

