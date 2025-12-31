import { NextRequest, NextResponse } from 'next/server'
import pLimit from 'p-limit'
import type {
  PostHistoryResponse,
  ArticleStatsResponse,
  WechatArticle,
  AccountHistoryData,
  PostHistoryArticle,
} from '@/lib/types'

const API_KEY = 'JZL34baea50c020a325'
const POST_HISTORY_URL = 'https://www.dajiala.com/fbmain/monitor/v3/post_history'
const READ_ZAN_URL = 'https://www.dajiala.com/fbmain/monitor/v3/read_zan'

// 并发限制：同时最多 5 个请求，避免触发 API 限流
const limit = pLimit(5)

/**
 * 从 URL 中提取 biz 参数
 */
function extractBizFromUrl(url: string): string | null {
  const match = url.match(/__biz=([^&]+)/)
  return match ? match[1] : null
}

/**
 * 获取单篇文章的互动数据
 */
async function fetchArticleStats(articleUrl: string): Promise<{
  read: number
  praise: number
  looking: number
}> {
  try {
    const response = await fetch(READ_ZAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: articleUrl,
        key: API_KEY,
        verifycode: '',
      }),
    })

    if (!response.ok) {
      console.warn(`获取互动数据失败 (HTTP ${response.status}):`, articleUrl)
      return { read: 0, praise: 0, looking: 0 }
    }

    const data: ArticleStatsResponse = await response.json()

    if (data.code === 0 && data.data) {
      return {
        read: data.data.read || 0,
        praise: data.data.zan || 0,
        looking: data.data.looking || 0,
      }
    } else {
      console.warn(`API 返回错误 (code ${data.code}):`, data.msg, articleUrl)
      return { read: 0, praise: 0, looking: 0 }
    }
  } catch (error) {
    console.error('获取互动数据异常:', error, articleUrl)
    return { read: 0, praise: 0, looking: 0 }
  }
}

/**
 * 将历史文章格式转换为统一的 WechatArticle 格式
 */
function convertToWechatArticle(
  article: PostHistoryArticle & { read: number; praise: number; looking: number },
  mpInfo: {
    nickname?: string
    wxid?: string
    ghid?: string
  }
): WechatArticle {
  return {
    avatar: article.cover_url || article.pic_cdn_url_1_1 || '',
    classify: '',
    content: article.digest || '',
    ghid: mpInfo.ghid || '',
    ip_wording: '',
    is_original: article.original || 0,
    looking: article.looking,
    praise: article.praise,
    publish_time: article.post_time,
    publish_time_str: article.post_time_str,
    read: article.read,
    short_link: '',
    title: article.title,
    update_time: article.post_time,
    update_time_str: article.post_time_str,
    url: article.url,
    wx_id: mpInfo.wxid || '',
    wx_name: mpInfo.nickname || '未知公众号',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, url, biz, page = 1 } = await request.json()

    console.log('\n🔍 获取公众号历史文章...')
    console.log(`  - 公众号名称: ${name || '(未提供)'}`)
    console.log(`  - 文章链接: ${url || '(未提供)'}`)
    console.log(`  - Biz: ${biz || '(未提供)'}`)
    console.log(`  - 页码: ${page}`)

    // 如果提供了 URL，尝试提取 biz
    let finalBiz = biz
    if (!finalBiz && url) {
      finalBiz = extractBizFromUrl(url)
      console.log(`  - 从 URL 提取 Biz: ${finalBiz || '(提取失败)'}`)
    }

    // 验证参数
    if (!name && !url && !finalBiz) {
      return NextResponse.json(
        { error: '请至少提供公众号名称或文章链接' },
        { status: 400 }
      )
    }

    // ========== 步骤1: 获取历史文章列表 ==========
    console.log('\n📋 步骤 1/3: 获取历史文章列表...')

    const historyResponse = await fetch(POST_HISTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        biz: finalBiz || '',
        url: url || '',
        name: name || '',
        page,
        key: API_KEY,
        verifycode: '',
      }),
    })

    if (!historyResponse.ok) {
      throw new Error(`获取历史文章失败: HTTP ${historyResponse.status}`)
    }

    const historyData: PostHistoryResponse = await historyResponse.json()

    if (historyData.code !== 0) {
      console.error('❌ API 返回错误:', historyData.msg)
      return NextResponse.json(
        { error: historyData.msg || '获取历史文章失败' },
        { status: 400 }
      )
    }

    if (!historyData.data || historyData.data.length === 0) {
      return NextResponse.json(
        { error: '该公众号暂无历史文章' },
        { status: 404 }
      )
    }

    console.log(`✅ 获取到 ${historyData.data.length} 篇历史文章`)
    console.log(`  - 公众号: ${historyData.mp_nickname}`)
    console.log(`  - 总发文次数: ${historyData.total_num}`)

    // ========== 步骤2: 批量获取互动数据 ==========
    console.log(`\n📊 步骤 2/3: 批量获取互动数据 (并发限制: 5)...`)

    let completedCount = 0
    const totalCount = historyData.data.length

    const articlesWithStats = await Promise.all(
      historyData.data.map((article) =>
        limit(async () => {
          const stats = await fetchArticleStats(article.url)
          completedCount++

          if (completedCount % 10 === 0 || completedCount === totalCount) {
            console.log(`  ⏳ 进度: ${completedCount}/${totalCount}`)
          }

          return {
            ...article,
            ...stats,
          }
        })
      )
    )

    console.log(`✅ 互动数据获取完成`)

    // ========== 步骤3: 数据转换和排序 ==========
    console.log('\n🔄 步骤 3/3: 数据转换和排序...')

    const mpInfo = {
      nickname: historyData.mp_nickname,
      ghid: historyData.mp_ghid,
      wxid: historyData.mp_wxid,
    }

    // 转换为统一格式
    const convertedArticles = articlesWithStats.map((article) =>
      convertToWechatArticle(article, mpInfo)
    )

    // 计算阅读量 TOP20
    const top20 = [...convertedArticles]
      .sort((a, b) => b.read - a.read)
      .slice(0, 20)

    console.log(`✅ TOP20 文章计算完成`)
    console.log(`  - 最高阅读: ${top20[0]?.read.toLocaleString() || 0}`)
    console.log(`  - 最低阅读 (TOP20): ${top20[19]?.read.toLocaleString() || 0}`)

    // ========== 返回结果 ==========
    const result: AccountHistoryData = {
      mpInfo: {
        nickname: historyData.mp_nickname || name || '未知公众号',
        ghid: historyData.mp_ghid || '',
        wxid: historyData.mp_wxid || '',
        headImg: historyData.head_img || '',
      },
      allArticles: convertedArticles,
      top20,
      total: historyData.total_num,
      totalPage: historyData.total_page,
      currentPage: historyData.now_page,
    }

    console.log('✅ 历史文章获取完成！\n')

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('\n❌ 获取历史文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    )
  }
}
