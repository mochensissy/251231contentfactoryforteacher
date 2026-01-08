import { NextRequest, NextResponse } from 'next/server'

// POST /api/image-generation/dashscope - 阿里云通义万相图片生成
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            prompt,
            negativePrompt,
            imageSize = '1024*576', // 16:9 比例，适合公众号封面
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
        const apiUrl = requestApiUrl || process.env.DASHSCOPE_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis'
        const apiKey = requestApiKey || process.env.DASHSCOPE_API_KEY || ''
        const model = requestModel || 'wanx2.1-t2i-turbo' // 使用turbo版本更快

        if (!apiKey) {
            return NextResponse.json(
                { error: '阿里云通义万相 API Key 未配置，请先在设置中配置' },
                { status: 400 }
            )
        }

        console.log('🖼️ 开始生成封面图...')
        console.log(`- 模型: ${model}`)
        console.log(`- 尺寸: ${imageSize}`)
        console.log(`- 提示词: ${prompt.substring(0, 100)}...`)

        // 第一步：提交异步任务
        const submitResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-DashScope-Async': 'enable', // 启用异步模式
            },
            body: JSON.stringify({
                model,
                input: {
                    prompt,
                    negative_prompt: negativePrompt || '低质量, 模糊, 变形, 丑陋, 水印, 文字',
                },
                parameters: {
                    size: imageSize,
                    n: Math.min(numImages, 4),
                    seed: Math.floor(Math.random() * 2147483647), // 随机种子
                }
            }),
        })

        if (!submitResponse.ok) {
            const errorText = await submitResponse.text()
            console.error('通义万相提交任务失败:', errorText)
            return NextResponse.json(
                { error: `提交任务失败: ${submitResponse.status} - ${errorText}` },
                { status: submitResponse.status }
            )
        }

        const submitData = await submitResponse.json()
        const taskId = submitData.output?.task_id

        if (!taskId) {
            console.error('未获取到任务ID:', submitData)
            return NextResponse.json(
                { error: '未获取到任务ID' },
                { status: 500 }
            )
        }

        console.log(`📝 任务已提交，任务ID: ${taskId}`)

        // 第二步：轮询任务状态
        const taskStatusUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`
        let images: string[] = []
        let attempts = 0
        const maxAttempts = 60 // 最多等待60秒

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒

            const statusResponse = await fetch(taskStatusUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            })

            if (!statusResponse.ok) {
                console.error('查询任务状态失败:', await statusResponse.text())
                attempts++
                continue
            }

            const statusData = await statusResponse.json()
            const taskStatus = statusData.output?.task_status

            if (taskStatus === 'SUCCEEDED') {
                images = statusData.output?.results?.map((r: { url: string }) => r.url) || []
                console.log(`✅ 封面生成成功，共 ${images.length} 张`)
                break
            } else if (taskStatus === 'FAILED') {
                const errorMsg = statusData.output?.message || '任务执行失败'
                console.error('任务执行失败:', errorMsg)
                return NextResponse.json(
                    { error: errorMsg },
                    { status: 500 }
                )
            }

            // 任务仍在进行中
            attempts++
            if (attempts % 5 === 0) {
                console.log(`⏳ 等待任务完成... (${attempts}s)`)
            }
        }

        if (images.length === 0 && attempts >= maxAttempts) {
            return NextResponse.json(
                { error: '任务超时，请稍后重试' },
                { status: 504 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                images,
                model,
                prompt,
                taskId,
            }
        })

    } catch (error) {
        console.error('❌ 封面生成失败:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '封面生成失败' },
            { status: 500 }
        )
    }
}
