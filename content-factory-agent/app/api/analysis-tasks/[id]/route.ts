import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/analysis-tasks/[id] - 获取单个分析任务详情（包含完整文章数据）
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的任务ID' },
        { status: 400 }
      )
    }

    const task = await prisma.analysisTask.findUnique({
      where: { id },
      include: {
        report: true
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    // 解析JSON字段
    const report = task.report ? {
      ...task.report,
      topLikesArticles: JSON.parse(task.report.topLikesArticles),
      topEngagementArticles: JSON.parse(task.report.topEngagementArticles),
      wordCloud: JSON.parse(task.report.wordCloud),
      insights: JSON.parse(task.report.insights),
      rawArticles: JSON.parse(task.report.rawArticles),
      // 新增：解析AI增强数据
      articleSummaries: task.report.articleSummaries
        ? JSON.parse(task.report.articleSummaries)
        : null,
      enhancedInsights: task.report.enhancedInsights
        ? JSON.parse(task.report.enhancedInsights)
        : null,
      // 新增：解析统计数据
      readDistribution: task.report.readDistribution
        ? JSON.parse(task.report.readDistribution)
        : null,
      timeDistribution: task.report.timeDistribution
        ? JSON.parse(task.report.timeDistribution)
        : null,
    } : null

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        report
      }
    })

  } catch (error) {
    console.error('获取任务详情失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/analysis-tasks/[id] - 删除分析任务
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的任务ID' },
        { status: 400 }
      )
    }

    // 由于设置了 onDelete: Cascade，删除任务会自动删除关联的报告
    await prisma.analysisTask.delete({
      where: { id }
    })

    console.log('已删除分析任务:', id)

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('删除任务失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    )
  }
}
