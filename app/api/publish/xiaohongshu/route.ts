import { NextRequest, NextResponse } from 'next/server'

interface PublishRequest {
    title: string
    content: string
    coverImage: string
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
        const { title, content, coverImage, images = [], tags = [], apiConfig } = body

        // 验证API配置
        if (!apiConfig?.apiKey) {
            return NextResponse.json(
                { success: false, error: '小红书API密钥未配置，请在设置中配置' },
                { status: 400 }
            )
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
