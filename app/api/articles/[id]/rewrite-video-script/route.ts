import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiClient } from '@/lib/ai-client'
import { markdownToPlainText } from '@/lib/text-utils'

const VIDEO_SCRIPT_PROMPT = `# Role
你是一位专业的短视频脚本创作者，擅长将文章内容改写为适合口播或视频形式的脚本。

# Style guardrails
- 语言口语化，适合说出来而非阅读
- 开头必须有钩子，3秒内抓住观众
- 节奏紧凑，避免冗余
- 每段配上【画面建议】帮助拍摄
- 时长控制在60-90秒（约250-350字）
- 结尾有明确CTA（关注/点赞/评论引导）

# Structure
【开场钩子】（0-3秒）
口播：...
画面：...

【核心内容】（主体，分2-3段）
口播：...
画面：...

【结尾收尾】（最后5秒）
口播：...
画面：...

# Output
直接输出完整的视频脚本，包含口播文案和画面建议，不要解释、不要代码块。`

/**
 * 构建向大模型发送的改写请求内容
 */
function buildPrompt(title: string, content: string): string {
    const safeContent = content.slice(0, 6000)
    return `${VIDEO_SCRIPT_PROMPT}

原始标题：${title}

原始正文：
${safeContent}`
}

// POST /api/articles/[id]/rewrite-video-script - 将文章改写为短视频脚本
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

        console.log('🚀 开始改写短视频脚本', { articleId: id, title: article.title })

        // 使用传入配置或默认配置初始化客户端
        // 需要从 lib/ai-client 导入 AIClient 类而不是实例
        const { AIClient } = await import('@/lib/ai-client')
        const client = new AIClient(aiConfig)

        const response = await client.chat(
            [
                {
                    role: 'system',
                    content:
                        '你是精通短视频的脚本专家。擅长将长文改写为节奏紧凑、适合口播的视频脚本。',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            {
                temperature: 0.6,
                maxTokens: 1200,
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
        console.error('❌ 短视频脚本改写失败:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '改写失败' },
            { status: 500 }
        )
    }
}
