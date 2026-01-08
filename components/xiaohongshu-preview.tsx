"use client"

import { cn } from "@/lib/utils"

interface XiaohongshuPreviewProps {
    content: string
    className?: string
}

export function XiaohongshuPreview({ content, className }: XiaohongshuPreviewProps) {
    // 解析内容，提取标题、正文和话题标签
    const lines = content.split('\n').filter(line => line.trim())

    // 尝试提取标题（通常是第一行）
    let title = ''
    let bodyLines: string[] = []
    let hashtags: string[] = []

    for (const line of lines) {
        // 提取话题标签
        const tagMatches = line.match(/#[^\s#]+/g)
        if (tagMatches && tagMatches.length >= 3) {
            hashtags = tagMatches
            continue
        }

        // 第一个非空行作为标题
        if (!title && !line.startsWith('#')) {
            title = line.replace(/^[📕🔥💡✨🎯]+\s*/, '') // 移除开头emoji
        } else if (title) {
            bodyLines.push(line)
        }
    }

    // 如果没有找到标题，使用第一行
    if (!title && lines.length > 0) {
        title = lines[0]
        bodyLines = lines.slice(1)
    }

    const bodyContent = bodyLines.join('\n')

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

                {/* 正文 */}
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {bodyContent || content}
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
