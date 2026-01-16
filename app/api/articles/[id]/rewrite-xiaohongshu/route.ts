import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiClient } from '@/lib/ai-client'
import { markdownToPlainText } from '@/lib/text-utils'

const XIAOHONGSHU_PROMPT = `# Role
你是一位专业的小红书爆款文案创作者,擅长写出吸引人的种草笔记。

# Style guardrails
- 语气亲切自然,像朋友分享一样
- 标题必须吸睛,使用数字/痛点/好处结构
- 正文分段清晰,每段2-3句话
- 适当使用emoji增加可读性(每段1-2个)
- 多用"姐妹们""宝子们""真的绝了"等小红书常用语
- 字数控制在400-600字
- 结尾加入5-8个相关话题标签

# Structure
标题(20字以内,带emoji)

开头(1-2句话引起共鸣或抛出痛点)

正文(分3-5个要点,每点简洁有力)

结尾(总结+互动引导)

#话题1 #话题2 #话题3 #话题4 #话题5

# Output
直接输出完整的小红书笔记内容,不要解释、不要代码块。`

/**
 * 构建向大模型发送的改写请求内容
 */
function buildPrompt(title: string, content: string): string {
    const safeContent = content.slice(0, 6000)
    return `${XIAOHONGSHU_PROMPT}

原始标题：${title}

原始正文：
${safeContent}`
}

// POST /api/articles/[id]/rewrite-xiaohongshu - 将文章改写为小红书笔记
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const id = parseInt(params.id)

        // 解析请求体获取AI配置（如果有）
        let aiConfig = {}
        try {
            const body = await request.json()
            aiConfig = {
                apiUrl: body.aiApiUrl,
                apiKey: body.aiApiKey,
                model: body.aiModel
            }
        } catch (e) {
            // 忽略JSON解析错误，可能没有请求体
        }

        if (Number.isNaN(id)) {
            return NextResponse.json({ error: '无效的文章ID' }, { status: 400 })
        }

        const article = await prisma.article.findUnique({
            where: { id },
        })

        if (!article) {
            return NextResponse.json({ error: '文章不存在' }, { status: 404 })
        }

        const plainText = markdownToPlainText(article.content || '')
        if (!plainText) {
            return NextResponse.json({ error: '文章内容为空，无法改写' }, { status: 400 })
        }

        const prompt = buildPrompt(article.title, plainText)

        console.log('🚀 开始改写小红书笔记', { articleId: id, title: article.title })

        // 使用传入配置或默认配置初始化客户端
        // 需要从 lib/ai-client 导入 AIClient 类而不是实例
        const { AIClient } = await import('@/lib/ai-client')
        const client = new AIClient(aiConfig)

        const response = await client.chat(
            [
                {
                    role: 'system',
                    content:
                        '你是精通小红书的爆款笔记专家。擅长写出高互动的种草文案,风格亲切自然。',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            {
                temperature: 0.7,
                maxTokens: 1500,
            }
        )

        // 清理输出
        const content = response.trim()
            .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
            .trim()

        if (!content) {
            console.error('❌ AI 返回内容为空', { rawResponse: response })
            throw new Error('AI 生成内容为空，请重试')
        }

        return NextResponse.json({
            success: true,
            data: {
                content,
                title: article.title,
            },
        })
    } catch (error) {
        console.error('❌ 小红书改写失败:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '改写失败' },
            { status: 500 }
        )
    }
}
