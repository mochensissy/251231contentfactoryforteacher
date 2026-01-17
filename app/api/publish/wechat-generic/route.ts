import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiClient } from '@/lib/ai-client'

// POST: 发布文章到指定的微信公众号（通用接口）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { articleId, account, coverImage, imageApiConfig, coverPrompt } = body

        if (!articleId || !account) {
            return NextResponse.json(
                { success: false, error: '缺少必要参数' },
                { status: 400 }
            )
        }

        // 获取文章
        const article = await prisma.article.findUnique({
            where: { id: articleId },
        })

        if (!article) {
            return NextResponse.json(
                { success: false, error: '文章不存在' },
                { status: 404 }
            )
        }

        // 模式 1: 使用 Webhook 发布 (n8n)
        if (account.webhookUrl) {
            // 调用webhook发布
            const response = await fetch(account.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: article.title,
                    content: article.content,
                    summary: article.summary,
                    coverImage: coverImage || undefined, // 传递封面图
                    // 如果配置了appId和appSecret，也传递
                    appId: account.appId || undefined,
                    appSecret: account.appSecret || undefined,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                return NextResponse.json(
                    { success: false, error: `Webhook发布失败: ${response.status} - ${errorText}` },
                    { status: response.status }
                )
            }

            const result = await response.json().catch(() => ({}))

            // 更新文章状态
            await prisma.article.update({
                where: { id: articleId },
                data: { status: 'published' },
            })

            return NextResponse.json({
                success: true,
                data: { message: `已通过Webhook发布到${account.name}`, result },
            })
        }

        // 模式 2: 直连微信 API 发布
        if (account.appId && account.appSecret) {
            try {
                // 动态导入以避免循环依赖或未使用的导入
                const { WechatApiClient } = await import('@/lib/wechat-api')
                const client = new WechatApiClient(account.appId, account.appSecret)

                // 1. 获取/验证 Access Token (这一步会验证 AppID/Secret 是否正确)
                await client.getAccessToken()

                // ========== 新增步骤: AI排版处理 (还原老版本逻辑) ==========
                console.log('\n🎨 正在进行AI排版处理...')

                const formattedResult = await formatArticleForWechatWithRetry({
                    title: article.title,
                    content: article.content,
                    coverPrompt, // 传入封面提示词设置
                }, 2) // 最多重试2次

                console.log('✅ 文章排版完成')
                console.log('✅ 生成图片提示词:', formattedResult.prompt.substring(0, 50) + '...')

                let thumbMediaId = ''
                let generatedCoverUrl = ''

                // 2. 如果有封面图，上传
                // 优先级: 显式传入的 coverImage > 文章 images 字段 (暂未解析) > 文章内容中的图片 > 自动生成 > 使用AI排版生成的提示词生成

                let targetCoverUrl = coverImage

                if (!targetCoverUrl) {
                    // 尝试从 content 中提取第一张图片作为封面 (使用原始内容提取，因为formattedResult是HTML)
                    const coverUrlMatches = article.content.match(/!\[.*?\]\((.*?)\)/)
                    if (coverUrlMatches) {
                        const candidates = coverUrlMatches[1];
                        // 排除 placeholder 和 svg 图片，强制触发AI生成
                        if (!candidates.includes('placehold.co') && !candidates.endsWith('.svg')) {
                            targetCoverUrl = candidates;
                        }
                    }
                }

                // 如果仍然没有封面图，尝试自动生成
                let generationError = null;

                // 检查是否可以使用 API 生成 (配置优先，环境变量次之)
                const dashscopeKey = imageApiConfig?.dashscope?.apiKey || process.env.DASHSCOPE_API_KEY
                const siliconFlowKey = imageApiConfig?.siliconflow?.apiKey || process.env.SILICONFLOW_API_KEY

                console.log('🔍 图片生成配置检查:')
                console.log('- imageApiConfig provided:', !!imageApiConfig)
                console.log('- DashScope Key (Config):', imageApiConfig?.dashscope?.apiKey ? 'Present' : 'Missing')
                console.log('- DashScope Key (Env):', process.env.DASHSCOPE_API_KEY ? 'Present' : 'Missing')
                console.log('- Final DashScope Key:', dashscopeKey ? 'Available' : 'Missing')
                console.log('- SiliconFlow Key (Config):', imageApiConfig?.siliconflow?.apiKey ? 'Present' : 'Missing')
                console.log('- SiliconFlow Key (Env):', process.env.SILICONFLOW_API_KEY ? 'Present' : 'Missing')
                console.log('- Final SiliconFlow Key:', siliconFlowKey ? 'Available' : 'Missing')

                if (!targetCoverUrl && (dashscopeKey || siliconFlowKey)) {
                    try {
                        const { generateImagewithDashscope, generateImageWithSiliconFlow } = await import('@/lib/image-generation')

                        // 使用 AI 排版生成的提示词，如果为空则回退到原来的逻辑
                        const prompt = formattedResult.prompt || `封面图，${article.title}，${article.summary || article.title}，高质量，细节丰富，4k`

                        // 根据用户选择的模型提供商调用对应API
                        const selectedProvider = imageApiConfig?.coverModelProvider || 'siliconflow'

                        if (selectedProvider === 'siliconflow' && siliconFlowKey) {
                            console.log('使用 SiliconFlow（免费）生成封面...')
                            try {
                                targetCoverUrl = await generateImageWithSiliconFlow({
                                    apiKey: siliconFlowKey,
                                    prompt,
                                    width: 1024,
                                    height: 576,
                                    model: imageApiConfig?.siliconflow?.model || undefined
                                })
                                generatedCoverUrl = targetCoverUrl
                            } catch (e) {
                                generationError = `SiliconFlow生成失败: ${e instanceof Error ? e.message : String(e)}`
                            }
                        } else if (selectedProvider === 'dashscope' && dashscopeKey) {
                            console.log('使用阿里云（收费）生成封面...')
                            try {
                                targetCoverUrl = await generateImagewithDashscope({
                                    apiKey: dashscopeKey,
                                    prompt,
                                    width: 1024,
                                    height: 576,
                                })
                                generatedCoverUrl = targetCoverUrl
                            } catch (e) {
                                generationError = `阿里云生成失败: ${e instanceof Error ? e.message : String(e)}`
                            }
                        } else if (siliconFlowKey) {
                            // 如果选择的提供商无Key，回退到可用的提供商
                            console.log('当前选择的提供商未配置Key，尝试使用 SiliconFlow...')
                            try {
                                targetCoverUrl = await generateImageWithSiliconFlow({
                                    apiKey: siliconFlowKey,
                                    prompt,
                                    width: 1024,
                                    height: 576,
                                    model: imageApiConfig?.siliconflow?.model || undefined
                                })
                                generatedCoverUrl = targetCoverUrl
                            } catch (e) {
                                generationError = `SiliconFlow生成失败: ${e instanceof Error ? e.message : String(e)}`
                            }
                        } else if (dashscopeKey) {
                            console.log('当前选择的提供商未配置Key，尝试使用阿里云...')
                            try {
                                targetCoverUrl = await generateImagewithDashscope({
                                    apiKey: dashscopeKey,
                                    prompt,
                                    width: 1024,
                                    height: 576,
                                })
                                generatedCoverUrl = targetCoverUrl
                            } catch (e) {
                                generationError = `阿里云生成失败: ${e instanceof Error ? e.message : String(e)}`
                            }
                        }
                    } catch (genError) {
                        console.warn('自动生成封面失败:', genError)
                    }
                }

                if (targetCoverUrl) {
                    try {
                        thumbMediaId = await client.uploadMaterial(targetCoverUrl)
                    } catch (e) {
                        console.warn('封面图上传失败，将尝试发布无封面文章:', e)
                    }
                }

                if (!thumbMediaId) {
                    // 如果没有封面，通过 API 发布草稿会失败 (errcode 40007, invalid media_id)
                    // 必须有一张图。这里如果没有图，只能报错提示用户
                    let errorMessage = '直连发布必须包含至少一张图片作为封面。'
                    if (generationError) {
                        errorMessage += `自动生成封面失败: ${generationError}。请检查API配置。`
                    } else {
                        errorMessage += '请确保文章内容中有图片，或在设置中配置阿里云/SiliconFlow API以自动生成封面。'
                    }

                    return NextResponse.json(
                        { success: false, error: errorMessage },
                        { status: 400 }
                    )
                }

                // 3. 创建草稿
                // 使用 AI 排版后的 HTML 内容 和 标题
                const result = await client.addDraft({
                    title: formattedResult.title,
                    content: formattedResult.html_content,
                    thumb_media_id: thumbMediaId,
                    digest: formattedResult.digest || (article.summary ? article.summary.substring(0, 120) : undefined)
                })

                // 更新文章状态
                await prisma.article.update({
                    where: { id: articleId },
                    data: { status: 'published' },
                })

                let message = `已直接发布到微信草稿箱`
                if (generatedCoverUrl) {
                    message += ` (已自动生成封面)`
                }

                return NextResponse.json({
                    success: true,
                    data: { message, result },
                })

            } catch (error: any) {
                return NextResponse.json(
                    { success: false, error: `直连发布失败: ${error.message}` },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json(
            { success: false, error: '未配置发布方式：请配置 Webhook 或 (AppID + AppSecret)' },
            { status: 400 }
        )

    } catch (error) {
        console.error('发布失败:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '发布失败' },
            { status: 500 }
        )
    }
}

/**
 * AI排版处理 - 带重试机制
 */
async function formatArticleForWechatWithRetry(
    params: {
        title: string
        content: string
        coverPrompt?: string
    },
    maxRetries: number = 2
): Promise<{
    title: string
    html_content: string
    prompt: string
    digest: string
}> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            if (attempt > 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000) // 指数退避，最多5秒
                console.log(`⏳ 重试 ${attempt - 1}/${maxRetries}，等待 ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }

            return await formatArticleForWechat(params)
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.error(`❌ 第 ${attempt} 次尝试失败:`, lastError.message)

            if (attempt === maxRetries + 1) {
                console.error('❌ AI排版多次失败，使用降级方案')
                // 最后失败时，直接使用降级方案
                return {
                    title: params.title,
                    html_content: markdownToSimpleHtml(params.content),
                    prompt: 'Cyberpunk style, neon lights, data tunnel, 3d render, octane render, 8k',
                    digest: ''
                }
            }
        }
    }

    // 这个理论上不会执行，但为了类型安全
    throw lastError || new Error('AI排版失败')
}

/**
 * AI排版处理 - 根据n8n工作流的Prompt生成HTML
 */
async function formatArticleForWechat(params: {
    title: string
    content: string
    coverPrompt?: string
}): Promise<{
    title: string
    html_content: string
    prompt: string
    digest: string // 新增：AI生成的爆款摘要
}> {
    const { title, content, coverPrompt } = params

    // 默认赛博朋克风格
    const defaultStyle = `### 【图像提示词生成指南 - 赛博朋克/霓虹科技风格】

1.  **核心风格 (必须严格遵守)**: 赛博朋克(Cyberpunk)风格，霓虹科技感，数据隧道。
2.  **色调**: 黑色背景为主，搭配高饱和度的荧光绿(#00FF00)和荧光紫(#8000FF/Magenta)作为主光源。
3.  **画面元素**: 发光的几何线条、浮空的HUD界面、流动的代码数据流、具有纵深感的科技走廊。
4.  **渲染质感**: C4D渲染，Octane渲染，3D立体感，光线追踪，8k分辨率。
5.  **构图**: 中心对称或具有强烈透视感的构图。
6.  **禁止出现**: 真人面孔、自然风景、复杂的汉字(使用抽象符号代替)。
7.  提示词应该基于文章内容生成，将文章核心概念转化为具象化的科技隐喻（例如“沟通”转化为“连接的数据线”，“困惑”转化为“迷宫般的代码”）。`

    // 如果用户提供了自定义提示词，则使用用户的，否则使用默认的
    const imageGuide = coverPrompt || defaultStyle

    const prompt = `你是一个专门为微信公众号文章排版AI助手。你的唯一任务是接收用户输入并排版，并输出一个包含标题、HTML内容、图像提示词和**爆款摘要**的JSON对象。你的所有输出，都必须严格遵循指定的JSON格式，绝不能包含任何额外的文字、解释或代码标记。

现在，请扮演一位顶级的微信公众号新媒体主编和专业的视觉艺术总监，根据用户提供的[文章内容]，完成以下任务，并将结果填入JSON对象的相应字段中：

1.  **主标题**：文章开头的主标题就使用推送过来的标题即可。
2.  **排版**：
    * **格式排版**：**在不删减任何已生成内容的前提下**，你必须对全文进行精细的HTML排版，严格遵循下方的【排版风格指南】。

3.  **生成图像提示词**：严格遵循下方的【图像提示词生成指南】，为文章创作一个风格专业、高度契合文章主题的AI绘画图像提示词。

4.  **撰写爆款摘要**：
    *   **目标**：极大提升点击率（Click-Through Rate）。
    *   **风格**：制造悬念、强调痛点、直接对话读者（使用“你”）。
    *   **字数限制**：必须严格控制在 60-100 字之间。
    *   **禁止**：不要只是简单概括文章，要写得像一条引人入胜的推文文案。
    *   **示例**：“你是否也在为升职加薪发愁？这篇文章揭示了管理者绝不会告诉你的3个秘密，第三个尤为重要...”

5. 不要自主发挥，给你什么文章，只需要排版就行。

---
### 【排版风格指南】

你必须将以下所有规则视为铁律，严格执行，以打造专业、清晰、高度可读的移动端阅读体验：

1.  **整体容器**:
    style="max-width: 680px; margin: 20px auto; padding: 30px; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing: 0.5px; line-height: 1.8;"

2.  **小标题 (H2)**:
    * **小标题前面绝不能出现任何表情符号。**
    * **【赭黄色】** 小标题的CSS样式必须为:
    style="font-size: 18px; font-weight: bold; color: #C08B40; text-align: center; margin-top: 45px; margin-bottom: 25px;"

3.  **段落 (P)**:
    * **(短段落铁律)** **每个段落严格限制在 1-2 句话。严禁出现任何超过3句话的长段落。**
    * style="margin-bottom: 20px; font-size: 15px;"

4.  **重点强调 (Strong)**:
    * **【赭黄色】** 必须为 <strong> 标签添加内联样式: style="color: #C08B40; font-weight: 600;"

5.  **引用/要点总结 (Blockquote)**:
    * **【新增样式】** 当需要引用名言或总结要点时，必须使用 <blockquote> 标签。
    * **【赭黄色】** <blockquote> 的CSS样式必须为:
    style="border-left: 4px solid #C08B40; background-color: #F8F8F8; padding: 15px 20px; margin: 30px 0; color: #555555; font-style: italic;"

---
${imageGuide}

---
[文章内容开始]
标题: ${title}

${content}
[文章内容结束]

请直接返回JSON格式的结果，格式如下：
{
  "title": "文章标题",
  "html_content": "<div>排版好的HTML内容</div>",
  "prompt": "图像生成提示词",
  "digest": "爆款摘要"
}`

    try {
        const response = await aiClient.chat([
            {
                role: 'user',
                content: prompt,
            },
        ], {
            temperature: 0.7,
            maxTokens: 4000,
        })

        // 尝试解析 JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('AI返回格式不是JSON')
        }

        const parsed = JSON.parse(jsonMatch[0])

        return {
            title: parsed.title || title,
            html_content: parsed.html_content || content,
            prompt: parsed.prompt || 'Cyberpunk style, neon lights, data tunnel, 3d render, octane render, 8k',
            digest: parsed.digest || '', // 返回生成的摘要
        }

    } catch (error) {
        console.error('❌ AI排版失败:', error)
        // 降级处理：使用简单的Markdown转HTML
        return {
            title,
            html_content: markdownToSimpleHtml(content),
            prompt: 'Cyberpunk style, neon lights, data tunnel, 3d render, octane render, 8k', // 降级也使用新风格
            digest: '',
        }
    }
}

/**
 * 简单的Markdown转HTML（降级方案）
 */
function markdownToSimpleHtml(markdown: string): string {
    let html = markdown
        .replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0;">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 style="font-size: 18px; font-weight: bold; color: #C08B40; text-align: center; margin-top: 45px; margin-bottom: 25px;">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 style="font-size: 16px; font-weight: bold; margin: 15px 0;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #C08B40; font-weight: 600;">$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin-bottom: 20px; font-size: 15px;">')
        .replace(/^(.+)$/gm, '<p style="margin-bottom: 20px; font-size: 15px;">$1</p>')

    return `<div style="max-width: 680px; margin: 20px auto; padding: 30px; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing: 0.5px; line-height: 1.8;">${html}</div>`
}
