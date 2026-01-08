import { NextRequest, NextResponse } from 'next/server'
import { PLATFORM_ARTICLE_PRESETS } from '@/lib/prompt-presets'

// 内容转换API - 将原始内容转换为各平台格式
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { content, title, platform, summary, aiApiUrl: requestAiApiUrl, aiApiKey: requestAiApiKey, aiModel: requestAiModel } = body

        if (!content) {
            return NextResponse.json(
                { success: false, error: '内容不能为空' },
                { status: 400 }
            )
        }

        if (!platform || !['xiaohongshu', 'twitter'].includes(platform)) {
            return NextResponse.json(
                { success: false, error: '不支持的平台' },
                { status: 400 }
            )
        }

        // 获取平台提示词
        const platformPreset = PLATFORM_ARTICLE_PRESETS[platform as keyof typeof PLATFORM_ARTICLE_PRESETS]
        if (!platformPreset || !('prompt' in platformPreset)) {
            return NextResponse.json(
                { success: false, error: '平台配置不存在' },
                { status: 400 }
            )
        }

        // 构建提示词
        const prompt = platformPreset.prompt
            .replace('{topic}', title || '未命名文章')
            .replace('{description}', summary || content.substring(0, 200))

        // 调用AI进行内容转换 - 优先使用请求参数，其次环境变量
        const aiApiUrl = requestAiApiUrl || process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
        const aiApiKey = requestAiApiKey || process.env.AI_API_KEY || ''
        const aiModel = requestAiModel || process.env.AI_MODEL || 'google/gemini-2.5-flash-lite'

        if (!aiApiKey) {
            return NextResponse.json(
                { success: false, error: 'AI API Key 未配置，请先在设置中配置' },
                { status: 500 }
            )
        }

        const systemPrompt = `你是一个专业的内容转换助手。用户会给你一篇原始文章，你需要根据目标平台的要求进行改写。

原始文章内容：
${content}

请根据上述平台要求，将原始文章改写为适合该平台的格式和风格。直接输出转换后的内容，不要有任何额外说明。`

        const response = await fetch(aiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
                model: aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 4000,
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('AI API 错误:', response.status, errorText)
            return NextResponse.json(
                { success: false, error: `AI API 请求失败: ${response.status}` },
                { status: 500 }
            )
        }

        const aiResponse = await response.json()
        const transformedContent = aiResponse.choices?.[0]?.message?.content || ''

        if (!transformedContent) {
            return NextResponse.json(
                { success: false, error: '内容转换失败' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                content: transformedContent,
                platform,
                originalTitle: title,
            }
        })
    } catch (error) {
        console.error('内容转换失败:', error)
        return NextResponse.json(
            { success: false, error: '内容转换失败' },
            { status: 500 }
        )
    }
}
