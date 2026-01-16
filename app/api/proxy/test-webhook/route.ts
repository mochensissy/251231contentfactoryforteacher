
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { webhookUrl } = body

        if (!webhookUrl) {
            return NextResponse.json(
                { success: false, error: 'Webhook URL is required' },
                { status: 400 }
            )
        }

        console.log('Proxying webhook test to:', webhookUrl)

        // 发送测试请求到真正的 Webhook 地址
        // 使用 fetch 在服务器端发起请求，不受浏览器 CORS 限制
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Content-Factory-Agent/1.0',
            },
            body: JSON.stringify({
                test: true,
                timestamp: new Date().toISOString(),
                message: 'This is a test request from WenSiXiu Intelligence Platform'
            }),
        })

        // 尝试解析响应
        let data = {}
        try {
            const text = await response.text()
            try {
                data = JSON.parse(text)
            } catch {
                data = { text }
            }
        } catch (e) {
            console.warn('Failed to parse webhook response:', e)
        }

        if (response.ok) {
            return NextResponse.json({ success: true, data })
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: `Remote server returned ${response.status}`,
                    details: data
                },
                { status: response.status }
            )
        }

    } catch (error: any) {
        console.error('Webhook proxy error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
