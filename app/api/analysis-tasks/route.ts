import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取分析任务列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const sortBy = searchParams.get('sortBy') || 'createdAt'
        const sortOrder = searchParams.get('sortOrder') || 'desc'
        const status = searchParams.get('status')

        const where: Record<string, string> = {}
        if (status) where.status = status

        const orderBy: Record<string, 'asc' | 'desc'> = {}
        orderBy[sortBy] = sortOrder as 'asc' | 'desc'

        const [tasks, total] = await Promise.all([
            prisma.analysisTask.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset,
                include: {
                    report: {
                        select: {
                            id: true,
                            enhancedInsights: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            prisma.analysisTask.count({ where }),
        ])

        // 解析 JSON 字段
        const data = tasks.map((task) => ({
            ...task,
            report: task.report
                ? {
                    ...task.report,
                    enhancedInsights: task.report.enhancedInsights
                        ? JSON.parse(task.report.enhancedInsights)
                        : [],
                }
                : null,
        }))

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                total,
                limit,
                offset,
            },
        })
    } catch (error) {
        console.error('获取分析任务列表失败:', error)
        return NextResponse.json(
            { success: false, error: '获取失败' },
            { status: 500 }
        )
    }
}

// POST: 保存分析任务和完整结果
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            keyword,
            articles,
            analysisResult,
            sourceType = 'keyword',
            mpName,
            mpGhid,
        } = body

        if (!keyword || !articles || !analysisResult) {
            return NextResponse.json(
                { success: false, error: '缺少必要参数' },
                { status: 400 }
            )
        }

        console.log('💾 保存分析结果...')
        console.log(`- 关键词: ${keyword}`)
        console.log(`- 来源类型: ${sourceType}`)
        console.log(`- 公众号: ${mpName || 'N/A'}`)
        console.log(`- 文章数: ${articles.length}`)
        console.log(`- 基础洞察: ${analysisResult.insights?.length || 0} 条`)
        console.log(`- 增强洞察: ${analysisResult.enhancedInsights?.length || 0} 条`)
        console.log(`- 文章摘要: ${analysisResult.articleSummaries?.length || 0} 条`)

        // 创建分析任务并同时创建报告
        const result = await prisma.analysisTask.create({
            data: {
                keyword,
                sourceType,
                mpName,
                mpGhid,
                status: 'completed',
                totalArticles: articles.length,
                analyzedAt: new Date(),
                report: {
                    create: {
                        topLikesArticles: JSON.stringify(analysisResult.topLikesArticles || []),
                        topEngagementArticles: JSON.stringify(analysisResult.topEngagementArticles || []),
                        wordCloud: JSON.stringify(analysisResult.wordCloud || []),
                        insights: JSON.stringify(analysisResult.insights || []),
                        rawArticles: JSON.stringify(articles),
                        articleSummaries: analysisResult.articleSummaries
                            ? JSON.stringify(analysisResult.articleSummaries)
                            : null,
                        enhancedInsights: analysisResult.enhancedInsights
                            ? JSON.stringify(analysisResult.enhancedInsights)
                            : null,
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
            { success: false, error: error instanceof Error ? error.message : '保存失败' },
            { status: 500 }
        )
    }
}
