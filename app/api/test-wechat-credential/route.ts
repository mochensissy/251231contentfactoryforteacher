
import { NextRequest, NextResponse } from 'next/server'
import { WechatApiClient } from '@/lib/wechat-api'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { appId, appSecret } = body

        if (!appId || !appSecret) {
            return NextResponse.json(
                { success: false, error: 'AppID 和 AppSecret 不能为空' },
                { status: 400 }
            )
        }

        const client = new WechatApiClient(appId, appSecret)

        // 尝试获取 Access Token，如果成功则说明凭证正确
        await client.getAccessToken()

        return NextResponse.json({
            success: true,
            data: { message: '凭证验证通过' }
        })

    } catch (error: any) {
        console.error('WeChat Credential Test Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || '验证失败' },
            { status: 400 }
        )
    }
}
