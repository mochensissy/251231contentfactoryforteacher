import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { AnalysisResult, WechatArticle } from '@/lib/types'

// POST /api/analysis-tasks - 保存分析任务和结果
export async function POST(request: NextRequest) {
  try {
    const {
      keyword,
      articles,
      analysisResult,
      sourceType = 'keyword',  // 新增：来源类型
      mpName,                  // 新增：公众号名称
      mpGhid,                  // 新增：公众号ID
    } = await request.json() as {
      keyword: string
      articles: WechatArticle[]
      analysisResult: AnalysisResult
      sourceType?: string
      mpName?: string
      mpGhid?: string
    }

    if (!keyword || !articles || !analysisResult) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log('💾 保存分析结果...')
    console.log(`- 关键词: ${keyword}`)
    console.log(`- 来源类型: ${sourceType}`)
    console.log(`- 公众号: ${mpName || 'N/A'}`)
    console.log(`- 文章数: ${articles.length}`)
    console.log(`- 基础洞察: ${analysisResult.insights.length} 条`)
    console.log(`- 增强洞察: ${analysisResult.enhancedInsights?.length || 0} 条`)
    console.log(`- 文章摘要: ${analysisResult.articleSummaries?.length || 0} 条`)

    // 创建分析任务和报告（事务）
    const result = await prisma.analysisTask.create({
      data: {
        keyword,
        sourceType,      // 新增
        mpName,          // 新增
        mpGhid,          // 新增
        status: 'completed',
        totalArticles: articles.length,
        analyzedAt: new Date(),
        report: {
          create: {
            // 基础数据
            topLikesArticles: JSON.stringify(analysisResult.topLikesArticles),
            topEngagementArticles: JSON.stringify(analysisResult.topEngagementArticles),
            wordCloud: JSON.stringify(analysisResult.wordCloud),
            insights: JSON.stringify(analysisResult.insights),
            rawArticles: JSON.stringify(articles),

            // 新增：AI增强数据
            articleSummaries: analysisResult.articleSummaries
              ? JSON.stringify(analysisResult.articleSummaries)
              : null,
            enhancedInsights: analysisResult.enhancedInsights
              ? JSON.stringify(analysisResult.enhancedInsights)
              : null,

            // 新增：统计数据
            readDistribution: analysisResult.readDistribution
              ? JSON.stringify(analysisResult.readDistribution)
              : null,
            timeDistribution: analysisResult.timeDistribution
              ? JSON.stringify(analysisResult.timeDistribution)
              : null,
          }
        }
      },
      include: {
        report: true
      }
    })

    console.log('✅ 分析任务已保存:', result.id)

    return NextResponse.json({
      success: true,
      data: {
        taskId: result.id,
        reportId: result.report?.id
      }
    })

  } catch (error) {
    console.error('❌ 保存分析任务失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    )
  }
}

// GET /api/analysis-tasks - 获取历史记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'createdAt' // createdAt | totalArticles
    const sortOrder = searchParams.get('sortOrder') || 'desc' // asc | desc

    // 构建查询条件
    const where = search
      ? {
          keyword: {
            contains: search,
          },
        }
      : {}

    // 获取总数
    const total = await prisma.analysisTask.count({ where })

    // 获取分析任务列表
    const tasks = await prisma.analysisTask.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: limit,
      skip: offset,
      include: {
        report: {
          select: {
            id: true,
            createdAt: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: tasks,
      total,
      limit,
      offset,
    })

  } catch (error) {
    console.error('获取历史记录失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    )
  }
}
