import { NextRequest, NextResponse } from 'next/server'

// POST /api/content-generation - 生成文章内容
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            topic,
            description,
            outline,
            wordCount,
            style,
            imageCount,
            // API 配置参数（优先使用）
            aiApiUrl: requestAiApiUrl,
            aiApiKey: requestAiApiKey,
            aiModel: requestAiModel,
            // 自定义提示词模板（从设置传入）
            customPromptTemplate,
        } = body as {
            topic: string
            description?: string
            outline?: string[]
            wordCount: string
            style: string
            imageCount: number
            aiApiUrl?: string
            aiApiKey?: string
            aiModel?: string
            customPromptTemplate?: string
        }

        if (!topic) {
            return NextResponse.json(
                { error: '选题标题不能为空' },
                { status: 400 }
            )
        }

        // 使用请求参数优先，否则使用环境变量
        const apiUrl = requestAiApiUrl || process.env.OPENROUTER_API_URL || process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
        const apiKey = requestAiApiKey || process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || ''
        const model = requestAiModel || process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'google/gemini-2.0-flash-thinking-exp:free'

        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI API Key 未配置，请先在设置中配置API密钥' },
                { status: 400 }
            )
        }

        console.log('🚀 开始生成文章...')
        console.log(`- 选题: ${topic}`)
        console.log(`- 字数: ${wordCount}`)
        console.log(`- 风格: ${style}`)
        console.log(`- 配图: ${imageCount}张`)
        console.log(`- 使用自定义模板: ${customPromptTemplate ? '是' : '否'}`)

        // 构建Prompt - 如果有自定义模板则使用，否则使用默认模板
        let prompt: string

        if (customPromptTemplate) {
            // 使用自定义提示词模板，替换占位符
            prompt = customPromptTemplate
                .replace(/{topic}/g, topic)
                .replace(/{description}/g, description || '')
                .replace(/{wordCount}/g, wordCount)
                .replace(/{style}/g, style)
                .replace(/{imageCount}/g, String(imageCount))

            // 如果模板中没有topic占位符，在前面添加选题信息
            if (!customPromptTemplate.includes('{topic}')) {
                prompt = `选题标题：${topic}\n\n${prompt}`
            }
        } else {
            // 使用默认模板
            prompt = `你是一位专业的内容创作者。请根据以下要求创作一篇高质量的文章。

选题标题：${topic}`

            if (description) {
                prompt += `\n选题描述：${description}`
            }

            if (outline && outline.length > 0) {
                prompt += `\n\n建议大纲：\n${outline.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
            }

            prompt += `\n\n写作要求：
1. 字数范围：${wordCount}字
2. 写作风格：${style}
3. 文章格式：Markdown格式
4. 需要插入 ${imageCount} 张配图占位符（使用 ![描述](IMAGE_PLACEHOLDER_X) 格式，X为序号1-${imageCount}）

文章结构要求：
- 开头：吸引人的引入，说明文章价值
- 主体：清晰的层次结构，使用二级、三级标题
- 结尾：总结要点，给出可行建议
- 配图：在合适的位置插入配图占位符

请直接输出Markdown格式的文章内容，不要有其他说明。`
        }

        // 调用AI生成文章
        console.log('📝 步骤1: 生成文章内容...')
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://content-factory-agent.local',
                'X-Title': 'WenSiXiu Intelligence',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_tokens: 4000,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('AI API Error:', response.status, errorText)
            throw new Error(`AI API 调用失败: ${response.status}`)
        }

        const aiData = await response.json()
        const content = aiData.choices?.[0]?.message?.content || ''

        if (!content) {
            throw new Error('AI 返回内容为空')
        }

        // 生成摘要
        console.log('📝 步骤2: 生成摘要...')
        const summaryResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: `请为以下文章生成一个150字以内的摘要：\n\n${content.slice(0, 1000)}` }],
                temperature: 0.3,
                max_tokens: 300,
            }),
        })

        let summary = ''
        if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            summary = summaryData.choices?.[0]?.message?.content?.trim() || ''
        }

        // 图片生成（如果需要）
        let images: string[] = []
        let finalContent = content

        if (imageCount > 0) {
            console.log(`🎨 步骤3: 生成 ${imageCount} 张配图...`)

            // 使用占位图
            images = Array(imageCount).fill('').map((_, i) =>
                `https://placehold.co/800x400/EEE/999?text=Image+${i + 1}`
            )

            // 替换占位符
            images.forEach((imageUrl, index) => {
                const placeholder = `IMAGE_PLACEHOLDER_${index + 1}`
                finalContent = finalContent.replace(
                    new RegExp(`!\\[([^\\]]*)\\]\\(${placeholder}\\)`, 'g'),
                    `![$1](${imageUrl})`
                )
            })
        }

        console.log('✅ 文章生成完成')

        return NextResponse.json({
            success: true,
            data: {
                title: topic,
                content: finalContent,
                summary,
                images,
            },
        })

    } catch (error) {
        console.error('❌ 生成文章失败:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '生成文章失败' },
            { status: 500 }
        )
    }
}
