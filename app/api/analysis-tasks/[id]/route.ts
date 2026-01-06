import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取单个分析任务
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const taskId = parseInt(id)

        if (isNaN(taskId)) {
            return NextResponse.json(
                { success: false, error: '无效的任务ID' },
                { status: 400 }
            )
        }

        const task = await prisma.analysisTask.findUnique({
            where: { id: taskId },
            include: {
                report: true,
            },
        })

        if (!task) {
            return NextResponse.json(
                { success: false, error: '任务不存在' },
                { status: 404 }
            )
        }

        // 解析 JSON 字段
        const data = {
            ...task,
            report: task.report
                ? {
                    ...task.report,
                    topLikesArticles: JSON.parse(task.report.topLikesArticles || '[]'),
                    topEngagementArticles: JSON.parse(task.report.topEngagementArticles || '[]'),
                    wordCloud: JSON.parse(task.report.wordCloud || '[]'),
                    insights: JSON.parse(task.report.insights || '[]'),
                    rawArticles: JSON.parse(task.report.rawArticles || '[]'),
                    articleSummaries: task.report.articleSummaries
                        ? JSON.parse(task.report.articleSummaries)
                        : [],
                    enhancedInsights: task.report.enhancedInsights
                        ? JSON.parse(task.report.enhancedInsights)
                        : [],
                }
                : null,
        }

        return NextResponse.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('获取分析任务失败:', error)
        return NextResponse.json(
            { success: false, error: '获取失败' },
            { status: 500 }
        )
    }
}

// DELETE: 删除分析任务
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const taskId = parseInt(id)

        if (isNaN(taskId)) {
            return NextResponse.json(
                { success: false, error: '无效的任务ID' },
                { status: 400 }
            )
        }

        await prisma.analysisTask.delete({
            where: { id: taskId },
        })

        return NextResponse.json({
            success: true,
            message: '删除成功',
        })
    } catch (error) {
        console.error('删除分析任务失败:', error)
        return NextResponse.json(
            { success: false, error: '删除失败' },
            { status: 500 }
        )
    }
}
