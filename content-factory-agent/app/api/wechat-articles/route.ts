import { NextRequest, NextResponse } from 'next/server'
import type { WechatArticleResponse } from '@/lib/types'

const API_KEY = 'JZL34baea50c020a325'
const API_URL = 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'

export async function POST(request: NextRequest) {
  try {
    const { keyword, page = 1, period = 7 } = await request.json()

    console.log('收到请求，关键词:', keyword, '页码:', page, '时间范围:', period)

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      )
    }

    const requestBody = {
      kw: keyword,
      sort_type: 1,
      mode: 1,
      period: period,
      page: page,
      key: API_KEY,
      any_kw: '',
      ex_kw: '',
      verifycode: '',
      type: 1,
    }

    console.log('准备调用第三方API，请求参数:', requestBody)

    // 调用公众号文章API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('第三方API响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API请求失败，状态码:', response.status, '响应:', errorText)
      throw new Error(`API请求失败: ${response.status} - ${errorText}`)
    }

    const data: WechatArticleResponse = await response.json()
    console.log('API返回数据:', {
      code: data.code,
      msg: data.msg,
      data_number: data.data_number,
      total: data.total
    })

    // 检查API返回的状态码
    // 注意：这个API成功时返回code=0，而不是200
    if (data.code !== 0) {
      console.error('API返回错误码:', data.code, '错误信息:', data.msg)
      return NextResponse.json(
        { error: data.msg || 'API返回错误', code: data.code },
        { status: 400 }
      )
    }

    // 返回成功数据
    return NextResponse.json({
      success: true,
      data: data.data,
      total: data.total,
      page: data.page,
      totalPage: data.total_page,
      remainMoney: data.remain_money,
    })

  } catch (error) {
    console.error('获取公众号文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取文章失败' },
      { status: 500 }
    )
  }
}
