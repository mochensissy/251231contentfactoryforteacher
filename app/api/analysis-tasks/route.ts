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

// POST: 创建新分析任务
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { keyword } = body

        if (!keyword) {
            return NextResponse.json(
                { success: false, error: '关键词不能为空' },
                { status: 400 }
            )
        }

        const task = await prisma.analysisTask.create({
            data: {
                keyword,
                status: 'pending',
            },
        })

        return NextResponse.json({
            success: true,
            data: task,
        })
    } catch (error) {
        console.error('创建分析任务失败:', error)
        return NextResponse.json(
            { success: false, error: '创建失败' },
            { status: 500 }
        )
    }
}
