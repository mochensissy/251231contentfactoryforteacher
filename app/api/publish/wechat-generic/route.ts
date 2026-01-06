import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: 发布文章到指定的微信公众号（通用接口）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { articleId, account } = body

        if (!articleId || !account) {
            return NextResponse.json(
                { success: false, error: '缺少必要参数' },
                { status: 400 }
            )
        }

        if (!account.webhookUrl) {
            return NextResponse.json(
                { success: false, error: '公众号webhook地址未配置' },
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
                // 如果配置了appId和appSecret，也传递
                appId: account.appId || undefined,
                appSecret: account.appSecret || undefined,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json(
                { success: false, error: `发布失败: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const result = await response.json().catch(() => ({}))

        // 更新文章状态
        await prisma.article.update({
            where: { id: articleId },
            data: {
                status: 'published',
                publishedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                message: `已发布到${account.name}`,
                result,
            },
        })
    } catch (error) {
        console.error('发布失败:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '发布失败' },
            { status: 500 }
        )
    }
}
