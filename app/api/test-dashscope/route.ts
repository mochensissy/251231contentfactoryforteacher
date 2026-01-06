import { NextRequest, NextResponse } from 'next/server'

// POST: 测试阿里云通义万相API连接
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { apiUrl, apiKey } = body

        if (!apiUrl || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'API地址和密钥不能为空' },
                { status: 400 }
            )
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-DashScope-Async': 'enable',
            },
            body: JSON.stringify({
                model: 'wanx-v1',
                input: { prompt: 'connection test' },
                parameters: { size: '1024*1024', n: 1 },
            }),
        })

        // 阿里云API可能返回200或202表示成功
        if (response.ok || response.status === 202) {
            return NextResponse.json({ success: true, message: '连接成功' })
        }

        const errorData = await response.text()
        return NextResponse.json(
            { success: false, error: `API返回 ${response.status}: ${errorData}` },
            { status: response.status }
        )
    } catch (error) {
        console.error('测试阿里云API失败:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '连接失败' },
            { status: 500 }
        )
    }
}
