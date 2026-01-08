import { NextRequest, NextResponse } from 'next/server'

// POST /api/image-generation/siliconflow - 硅基流动图片生成
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            prompt,
            negativePrompt,
            imageSize = '1024x1024',
            numImages = 1,
            // API配置（从前端传入，优先使用）
            apiUrl: requestApiUrl,
            apiKey: requestApiKey,
            model: requestModel,
        } = body as {
            prompt: string
            negativePrompt?: string
            imageSize?: string
            numImages?: number
            apiUrl?: string
            apiKey?: string
            model?: string
        }

        if (!prompt) {
            return NextResponse.json(
                { error: '提示词不能为空' },
                { status: 400 }
            )
        }

        // 使用请求参数优先，否则使用环境变量
        const apiUrl = requestApiUrl || process.env.SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/images/generations'
        const apiKey = requestApiKey || process.env.SILICONFLOW_API_KEY || ''
        const model = requestModel || process.env.SILICONFLOW_MODEL || 'black-forest-labs/FLUX.1-schnell'

        if (!apiKey) {
            return NextResponse.json(
                { error: '硅基流动 API Key 未配置，请先在设置中配置' },
                { status: 400 }
            )
        }

        console.log('🖼️ 开始生成图片...')
        console.log(`- 模型: ${model}`)
        console.log(`- 尺寸: ${imageSize}`)
        console.log(`- 数量: ${numImages}`)
        console.log(`- 提示词: ${prompt.substring(0, 100)}...`)

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                prompt,
                negative_prompt: negativePrompt || '',
                image_size: imageSize,
                batch_size: Math.min(numImages, 4), // 最多4张
                num_inference_steps: 20,
                guidance_scale: 7.5,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('硅基流动API错误:', errorText)
            return NextResponse.json(
                { error: `图片生成失败: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('✅ 图片生成成功')

        // 提取图片URL列表
        const images = data.images?.map((img: { url: string }) => img.url) || []

        return NextResponse.json({
            success: true,
            data: {
                images,
                model,
                prompt,
            }
        })

    } catch (error) {
        console.error('❌ 图片生成失败:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '图片生成失败' },
            { status: 500 }
        )
    }
}
