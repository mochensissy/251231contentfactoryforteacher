"use client"

import { cn } from "@/lib/utils"

interface TwitterPreviewProps {
    content: string
    className?: string
}

export function TwitterPreview({ content, className }: TwitterPreviewProps) {
    // 解析Thread格式（以数字编号或分隔线区分）
    const tweets = parseThread(content)

    return (
        <div className={cn("space-y-3 max-w-[500px] mx-auto", className)}>
            {tweets.map((tweet, index) => (
                <TweetCard
                    key={index}
                    content={tweet}
                    isThread={tweets.length > 1}
                    threadIndex={index + 1}
                    totalTweets={tweets.length}
                />
            ))}
        </div>
    )
}

function parseThread(content: string): string[] {
    // 尝试按照 1/、2/、3/ 格式分割
    const threadPattern = /^\d+[\/\.]\s*/gm
    const parts = content.split(threadPattern).filter(p => p.trim())

    if (parts.length > 1) {
        return parts
    }

    // 尝试按照分隔线分割
    const separatorPattern = /[-—]{3,}|={3,}/
    const separatedParts = content.split(separatorPattern).filter(p => p.trim())

    if (separatedParts.length > 1) {
        return separatedParts
    }

    // 单条推文
    return [content]
}

interface TweetCardProps {
    content: string
    isThread: boolean
    threadIndex: number
    totalTweets: number
}

function TweetCard({ content, isThread, threadIndex, totalTweets }: TweetCardProps) {
    // 280字符限制（中文约93字）
    const charCount = content.length
    const isOverLimit = charCount > 280

    // 提取话题标签
    const hashtags = content.match(/#[^\s#]+/g) || []

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* 头部 */}
            <div className="flex items-start gap-3">
                {/* 头像 */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                    X
                </div>

                <div className="flex-1 min-w-0">
                    {/* 用户信息 */}
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900 text-sm">Your Name</span>
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                        </svg>
                        <span className="text-gray-500 text-sm">@yourhandle</span>
                        {isThread && (
                            <span className="text-gray-400 text-xs ml-2">
                                {threadIndex}/{totalTweets}
                            </span>
                        )}
                    </div>

                    {/* 推文内容 */}
                    <div className="mt-2 text-gray-900 text-[15px] leading-relaxed whitespace-pre-wrap">
                        {content}
                    </div>

                    {/* 字符数统计 */}
                    <div className={cn(
                        "mt-2 text-xs",
                        isOverLimit ? "text-red-500" : "text-gray-400"
                    )}>
                        {charCount}/280 字符
                        {isOverLimit && " (超出限制)"}
                    </div>

                    {/* 互动栏 */}
                    <div className="mt-3 flex items-center justify-between text-gray-500 max-w-[320px]">
                        <button className="flex items-center gap-1 hover:text-blue-500 transition-colors p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-xs">回复</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-green-500 transition-colors p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-xs">转推</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-red-500 transition-colors p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="text-xs">喜欢</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-blue-500 transition-colors p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-xs">分享</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
