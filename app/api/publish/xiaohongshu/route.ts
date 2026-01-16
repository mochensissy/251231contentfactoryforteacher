import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface PublishRequest {
    articleId?: number
    title?: string
    content?: string
    coverImage?: string
    images?: string[]
    tags?: string[]
    apiConfig: {
        apiUrl: string
        apiKey: string
    }
}

// POST /api/publish/xiaohongshu - 发布内容到小红书
export async function POST(request: NextRequest) {
    try {
        const body: PublishRequest = await request.json()
        const { articleId, apiConfig } = body
        let { title, content, coverImage, images = [], tags = [] } = body

        // 验证API配置
        if (!apiConfig?.apiKey) {
            return NextResponse.json(
                { success: false, error: '小红书API密钥未配置，请在设置中配置' },
                { status: 400 }
            )
        }

        // 如果提供了 articleId，从数据库获取文章
        if (articleId) {
            const article = await prisma.article.findUnique({
                where: { id: articleId },
            })

            if (!article) {
                return NextResponse.json(
                    { success: false, error: '文章不存在' },
                    { status: 404 }
                )
            }

            // 使用数据库中的文章数据
            title = article.title
            content = transformContentForXiaohongshu(article.content)

            // 解析文章中的图片
            if (article.images) {
                try {
                    const parsedImages = JSON.parse(article.images)
                    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                        images = parsedImages
                        // 使用第一张图作为封面（如果没有明确指定封面）
                        if (!coverImage) {
                            coverImage = parsedImages[0]
                        }
                    }
                } catch (e) {
                    console.warn('解析文章图片失败:', e)
                }
            }

            // 如果还没有封面，尝试从内容中提取
            if (!coverImage) {
                const imageMatch = article.content.match(/!\[.*?\]\((.*?)\)/)
                if (imageMatch) {
                    coverImage = imageMatch[1]
                    // 排除 placeholder 和 svg 图片，强制触发AI生成
                    if (coverImage.includes('placehold.co') || coverImage.endsWith('.svg')) {
                        coverImage = ''
                    }
                }
            }

            // 如果仍然没有封面图，尝试使用硅基流动自动生成
            if (!coverImage) {
                const siliconFlowKey = process.env.SILICONFLOW_API_KEY

                if (siliconFlowKey) {
                    try {
                        console.log('🎨 没有找到封面图，尝试使用硅基流动自动生成...')
                        const { generateImageWithSiliconFlow } = await import('@/lib/image-generation')

                        const prompt = `封面图，${article.title}，${article.summary || ''}，小红书风格，高质量，细节丰富，4k`

                        coverImage = await generateImageWithSiliconFlow({
                            apiKey: siliconFlowKey,
                            prompt,
                            width: 1024,
                            height: 1024, // 小红书使用正方形封面
                            model: process.env.SILICONFLOW_MODEL || undefined
                        })

                        console.log('✅ 封面图自动生成成功:', coverImage)
                    } catch (genError) {
                        console.warn('⚠️ 硅基流动生成封面失败:', genError)
                        // 继续执行，下面会检查是否为空并报错
                    }
                } else {
                    console.warn('⚠️ 硅基流动API Key未配置，无法自动生成封面')
                }
            }
        }

        // 验证必填参数
        if (!title && !content) {
            return NextResponse.json(
                { success: false, error: '标题和内容不能同时为空' },
                { status: 400 }
            )
        }

        if (!coverImage) {
            return NextResponse.json(
                { success: false, error: '封面图片不能为空' },
                { status: 400 }
            )
        }

        console.log('\n🚀 开始发布到小红书...')
        console.log(`- 标题: ${title}`)
        console.log(`- 内容长度: ${content?.length || 0} 字符`)
        console.log(`- 封面: ${coverImage}`)
        console.log(`- 配图数量: ${images.length}`)
        console.log(`- 标签: ${tags.join(', ')}`)

        // 构建请求体
        const requestBody: Record<string, unknown> = {
            title,
            content,
            coverImage,
        }

        if (images.length > 0) {
            requestBody.images = images
        }

        if (tags.length > 0) {
            requestBody.tags = tags
        }

        // 添加自定义笔记ID
        requestBody.noteId = `note_${Date.now()}`

        // 调用小红书发布API
        const apiUrl = apiConfig.apiUrl || 'https://note.limyai.com/api/openapi/publish_note'

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiConfig.apiKey,
            },
            body: JSON.stringify(requestBody),
        })

        const responseData = await response.json()

        // 处理错误响应
        if (!response.ok) {
            console.error('❌ 小红书API返回错误:')
            console.error('- 状态码:', response.status)
            console.error('- 响应内容:', JSON.stringify(responseData, null, 2))
            console.error('- 请求内容:', JSON.stringify(requestBody, null, 2))

            let errorMessage = '发布失败'
            switch (response.status) {
                case 401:
                    errorMessage = 'API密钥验证失败，请检查配置'
                    break
                case 400:
                    // 提取更详细的错误信息
                    const detailError = responseData.message || responseData.error || responseData.detail || '请检查标题、内容和封面图'
                    errorMessage = `参数验证失败：${detailError}`
                    break
                case 409:
                    errorMessage = '笔记ID已存在，请重试'
                    break
                case 500:
                    errorMessage = '服务器内部错误，请稍后重试'
                    break
                default:
                    errorMessage = `发布失败 (${response.status})：${responseData.error || responseData.message || '未知错误'}`
            }
            console.error('❌ 生成的错误信息:', errorMessage)
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: response.status }
            )
        }

        // 检查响应格式
        if (!responseData.success || !responseData.data) {
            return NextResponse.json(
                { success: false, error: '小红书API响应格式错误' },
                { status: 500 }
            )
        }

        console.log('✅ 小红书发布成功')
        console.log(`- 笔记ID: ${responseData.data.note_id}`)
        console.log(`- 发布链接: ${responseData.data.publish_url}`)
        console.log(`- 二维码URL: ${responseData.data.xiaohongshu_qr_image_url}`)

        return NextResponse.json({
            success: true,
            data: {
                noteId: responseData.data.note_id,
                publishUrl: responseData.data.publish_url,
                qrCodeUrl: responseData.data.xiaohongshu_qr_image_url,
                title: responseData.data.title,
                message: '发布成功，请扫描二维码完成发布',
            },
        })
    } catch (error) {
        console.error('❌ 发布失败:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '发布失败' },
            { status: 500 }
        )
    }
}

/**
 * 将Markdown格式的文章内容转换为小红书适合的纯文本格式
 * - 移除Markdown标记（#标题、**强调**等）
 * - 保留段落结构
 * - 添加适合小红书的emoji和排版
 */
function transformContentForXiaohongshu(markdown: string): string {
    let text = markdown
        // 移除标题标记，保留文字
        .replace(/^#{1,6}\s+/gm, '')
        // 将 **粗体** 转换为普通文本（或可以保留特殊标记）
        .replace(/\*\*(.*?)\*\*/g, '💡$1')
        // 移除图片标记
        .replace(/!\[.*?\]\(.*?\)/g, '')
        // 移除链接，保留文字
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // 清理多余的空行（保留段落间的单个空行）
        .replace(/\n\n+/g, '\n\n')
        // 移除首尾空白
        .trim()

    return text
}

