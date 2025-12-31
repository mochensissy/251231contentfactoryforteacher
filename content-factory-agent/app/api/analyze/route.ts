import { NextRequest, NextResponse } from 'next/server'
import type { WechatArticle, AnalysisResult, ArticleSummary, EnhancedInsight } from '@/lib/types'
import { aiClient } from '@/lib/ai-client'

// 计算互动率
function calculateEngagement(article: WechatArticle): number {
  if (article.read === 0) return 0
  return ((article.praise + article.looking) / article.read) * 100
}

// 提取高频词（简单实现）
function extractKeywords(articles: WechatArticle[]): { word: string; weight: number }[] {
  const wordCount = new Map<string, number>()

  articles.forEach(article => {
    // 优先使用标题，标题中的词汇权重更高
    const titleText = article.title.replace(/<[^>]*>/g, '')
    const titleMatches = titleText.match(/[\u4e00-\u9fa5]{2,6}/g) || []

    // 标题中的词汇权重×3
    titleMatches.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 3)
    })

    // 内容中的词汇作为补充，但只取前500字符避免噪音
    const contentPreview = article.content.slice(0, 500)
    const cleanContent = contentPreview.replace(/<[^>]*>/g, '')
    const contentMatches = cleanContent.match(/[\u4e00-\u9fa5]{2,6}/g) || []
    contentMatches.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })
  })

  const stopWords = [
    '的', '了', '和', '是', '在', '有', '我们', '一个', '可以', '就是',
    '这个', '那个', '什么', '如何', '怎么', '这些', '那些', '不是', '没有',
    '还是', '但是', '因为', '所以', '如果', '可能', '已经', '也是', '通过',
    '进行', '之后', '之前', '以及', '或者', '而且', '对于', '关于', '由于',
    '表示', '成为', '需要', '非常', '实现', '提供', '发现', '开始', '其他'
  ]

  const filtered = Array.from(wordCount.entries())
    .filter(([word]) => !stopWords.includes(word) && word.length >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const maxCount = filtered[0]?.[1] || 1
  return filtered.map(([word, count]) => ({
    word,
    weight: Math.round((count / maxCount) * 100)
  }))
}

// 去重文章（合并点赞TOP和互动率TOP）
function getTopArticles(articles: WechatArticle[]): WechatArticle[] {
  // 点赞TOP5
  const topLikes = [...articles]
    .sort((a, b) => b.praise - a.praise)
    .slice(0, 5)

  // 互动率TOP5
  const topEngagement = [...articles]
    .sort((a, b) => calculateEngagement(b) - calculateEngagement(a))
    .slice(0, 5)

  // 合并并去重
  const urlSet = new Set<string>()
  const result: WechatArticle[] = []

  for (const article of [...topLikes, ...topEngagement]) {
    if (!urlSet.has(article.url)) {
      urlSet.add(article.url)
      result.push(article)
    }
  }

  console.log(`📊 选取了 ${result.length} 篇 TOP 文章进行深度分析`)
  return result
}

// 计算阅读量分布
function calculateReadDistribution(articles: WechatArticle[]) {
  const ranges = [
    { label: '0-1k', min: 0, max: 1000 },
    { label: '1k-5k', min: 1000, max: 5000 },
    { label: '5k-10k', min: 5000, max: 10000 },
    { label: '10k-20k', min: 10000, max: 20000 },
    { label: '20k+', min: 20000, max: Infinity }
  ]

  return ranges.map(range => ({
    label: range.label,
    min: range.min,
    max: range.max === Infinity ? 999999 : range.max,
    count: articles.filter(a => a.read >= range.min && a.read < range.max).length
  }))
}

// 计算发布时间分布
function calculateTimeDistribution(articles: WechatArticle[]) {
  const timeSlots = [
    { label: '00:00-02:00', hour: 0 },
    { label: '02:00-04:00', hour: 2 },
    { label: '04:00-06:00', hour: 4 },
    { label: '06:00-08:00', hour: 6 },
    { label: '08:00-10:00', hour: 8 },
    { label: '10:00-12:00', hour: 10 },
    { label: '12:00-14:00', hour: 12 },
    { label: '14:00-16:00', hour: 14 },
    { label: '16:00-18:00', hour: 16 },
    { label: '18:00-20:00', hour: 18 },
    { label: '20:00-22:00', hour: 20 },
    { label: '22:00-24:00', hour: 22 }
  ]

  return timeSlots.map(slot => ({
    label: slot.label,
    hour: slot.hour,
    count: articles.filter(a => {
      const date = new Date(a.publish_time * 1000)
      const hour = date.getHours()
      return hour >= slot.hour && hour < slot.hour + 2
    }).length
  }))
}

export async function POST(request: NextRequest) {
  try {
    const { articles, keyword } = await request.json() as {
      articles: WechatArticle[]
      keyword?: string
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json(
        { error: '没有文章数据需要分析' },
        { status: 400 }
      )
    }

    console.log(`\n🚀 开始分析 ${articles.length} 篇文章...`)

    // ========== 第一步：基础数据分析 ==========
    console.log('📈 步骤 1/4: 计算基础指标...')

    // 1. 点赞TOP5
    const topLikesArticles = [...articles]
      .sort((a, b) => b.praise - a.praise)
      .slice(0, 5)
      .map(article => ({
        title: article.title,
        likes: article.praise,
        reads: article.read,
        url: article.url,
        wxName: article.wx_name,
      }))

    // 2. 互动率TOP5
    const topEngagementArticles = [...articles]
      .sort((a, b) => calculateEngagement(b) - calculateEngagement(a))
      .slice(0, 5)
      .map(article => ({
        title: article.title,
        engagement: parseFloat(calculateEngagement(article).toFixed(2)),
        reads: article.read,
        url: article.url,
        wxName: article.wx_name,
      }))

    // 3. 高频词云
    const wordCloud = extractKeywords(articles)
    console.log(`✅ 提取了 ${wordCloud.length} 个高频词`)

    // ========== 第二步：AI 摘要提取 ==========
    console.log('\n🤖 步骤 2/4: AI 提取文章摘要...')

    // 获取需要深度分析的 TOP 文章（5-8篇）
    const topArticles = getTopArticles(articles)

    // 并发调用 AI 提取摘要
    const summaryPromises = topArticles.map(article =>
      aiClient.extractArticleSummary({
        title: article.title,
        content: article.content,
        url: article.url,
        wxName: article.wx_name,
      })
    )

    let articleSummaries: ArticleSummary[] = []
    try {
      articleSummaries = await Promise.all(summaryPromises)
      console.log(`✅ 成功提取 ${articleSummaries.length} 篇文章摘要`)
    } catch (error) {
      console.error('⚠️ 部分文章摘要提取失败:', error)
      // 继续执行，使用已成功的摘要
      articleSummaries = (await Promise.allSettled(summaryPromises))
        .filter((result): result is PromiseFulfilledResult<ArticleSummary> =>
          result.status === 'fulfilled'
        )
        .map(result => result.value)
    }

    // ========== 第三步：AI 生成深度洞察 ==========
    console.log('\n💡 步骤 3/4: AI 生成深度洞察...')

    let enhancedInsights: EnhancedInsight[] = []
    try {
      enhancedInsights = await aiClient.generateInsights(
        keyword || '未知关键词',
        articleSummaries,
        wordCloud
      )
      console.log(`✅ 成功生成 ${enhancedInsights.length} 条深度洞察`)
    } catch (error) {
      console.error('❌ 生成洞察失败:', error)
      // 如果 AI 生成失败，返回错误
      return NextResponse.json(
        { error: '生成选题洞察失败，请检查 AI API 配置或重试' },
        { status: 500 }
      )
    }

    // ========== 第四步：构建返回结果 ==========
    console.log('\n📦 步骤 4/4: 构建分析结果...')

    // 计算统计数据
    const readDistribution = calculateReadDistribution(articles)
    const timeDistribution = calculateTimeDistribution(articles)
    console.log(`✅ 计算了阅读量分布和时间分布`)

    // 为了向后兼容，将增强洞察转换为简单格式
    const simpleInsights = enhancedInsights.map(insight => ({
      title: insight.title,
      description: insight.description,
    }))

    const result: AnalysisResult = {
      topLikesArticles,
      topEngagementArticles,
      wordCloud,
      insights: simpleInsights,
      // 新增字段
      articleSummaries,
      enhancedInsights,
      // 统计数据
      readDistribution,
      timeDistribution,
    }

    console.log('✅ 分析完成！\n')

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('❌ 分析文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '分析失败' },
      { status: 500 }
    )
  }
}
