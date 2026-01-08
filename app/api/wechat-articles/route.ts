import { NextRequest, NextResponse } from 'next/server'

// POST: 搜索公众号文章（用于测试连接和选题分析）
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            keyword,
            page = 1,
            period = 7,
            limit,  // 限制返回条数
            apiKey: requestApiKey,
            apiUrl: requestApiUrl
        } = body

        if (!keyword) {
            return NextResponse.json(
                { success: false, error: '关键词不能为空' },
                { status: 400 }
            )
        }

        // 大价啦API配置: 优先使用请求中的参数，否则使用环境变量
        const apiUrl = requestApiUrl || process.env.WECHAT_ARTICLE_API_URL || 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'
        const apiKey = requestApiKey || process.env.WECHAT_ARTICLE_API_KEY || ''

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API Key 未配置，请在设置中配置大价啦API密钥' },
                { status: 400 }
            )
        }

        console.log('🔍 调用大价啦API:', { keyword, page, period, limit, apiUrl })

        // 使用正确的大价啦API请求格式
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                kw: keyword,           // 关键词
                sort_type: 1,          // 排序类型
                mode: 1,               // 搜索模式
                period: period,        // 时间范围（天）
                page: page,            // 页码
                key: apiKey,           // API密钥
                any_kw: '',            // 任意关键词
                ex_kw: '',             // 排除关键词
                verifycode: '',        // 验证码
                type: 1,               // 类型
                ...(limit ? { num: limit } : {}),  // 限制返回条数（减少API费用）
            }),
        })

        if (!response.ok) {
            console.error('大价啦API请求失败:', response.status)
            return NextResponse.json(
                { success: false, error: `API请求失败: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('📦 大价啦API返回:', { code: data.code, msg: data.msg, total: data.total })

        if (data.code !== 0) {
            return NextResponse.json(
                { success: false, error: data.msg || '获取文章失败' },
                { status: 400 }
            )
        }

        // 直接返回原始数据格式，与 types.ts 中的 WechatArticle 接口保持一致
        // 前端 types.ts 定义的字段：read, praise, looking, wx_name, publish_time 等
        return NextResponse.json({
            success: true,
            data: data.data || [],
            meta: {
                total: data.total || 0,
                page: data.page || page,
                totalPage: data.total_page || 1,
                remainMoney: data.remain_money,
                costMoney: data.cost_money,
            }
        })
    } catch (error) {
        console.error('搜索公众号文章失败:', error)
        return NextResponse.json(
            { success: false, error: '搜索失败，请检查网络连接' },
            { status: 500 }
        )
    }
}
