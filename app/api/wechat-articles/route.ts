import { NextRequest, NextResponse } from 'next/server'

// POST: 搜索公众号文章（用于测试连接和选题分析）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { keyword, page = 1, apiKey: requestApiKey, apiUrl: requestApiUrl } = body

        if (!keyword) {
            return NextResponse.json(
                { success: false, error: '关键词不能为空' },
                { status: 400 }
            )
        }

        // 大价啦API配置: 优先使用请求中的参数（测试连接时），否则使用环境变量
        const apiUrl = requestApiUrl || process.env.WECHAT_ARTICLE_API_URL || 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'
        const apiKey = requestApiKey || process.env.WECHAT_ARTICLE_API_KEY || ''

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API Key 未配置' },
                { status: 400 }
            )
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key: apiKey,
                keyword,
                page,
                page_size: 20,
            }),
        })

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: `API请求失败: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()

        if (data.code !== 0) {
            return NextResponse.json(
                { success: false, error: data.msg || '获取文章失败' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                articles: data.data || [],
                total: data.total || 0,
                page: data.page || page,
                totalPage: data.total_page || 1,
            },
        })
    } catch (error) {
        console.error('搜索公众号文章失败:', error)
        return NextResponse.json(
            { success: false, error: '搜索失败' },
            { status: 500 }
        )
    }
}
