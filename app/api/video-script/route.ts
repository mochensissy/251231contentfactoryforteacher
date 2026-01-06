import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取视频脚本列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const platform = searchParams.get('platform')
        const videoType = searchParams.get('videoType')

        const where: Record<string, string> = {}
        if (platform) where.platform = platform
        if (videoType) where.videoType = videoType

        const [scripts, total] = await Promise.all([
            prisma.videoScript.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.videoScript.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: scripts.map((s) => ({
                ...s,
                storyboard: s.storyboard ? JSON.parse(s.storyboard) : null,
            })),
            pagination: {
                total,
                limit,
                offset,
            },
        })
    } catch (error) {
        console.error('获取视频脚本列表失败:', error)
        return NextResponse.json(
            { success: false, error: '获取失败' },
            { status: 500 }
        )
    }
}

// POST: 保存新脚本
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            platform,
            videoType,
            duration,
            topic,
            content,
            storyboard,
            coverTitle,
        } = body

        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: '标题和内容不能为空' },
                { status: 400 }
            )
        }

        const script = await prisma.videoScript.create({
            data: {
                title,
                platform: platform || 'bilibili',
                videoType: videoType || '知识分享',
                duration: duration || 180,
                topic: topic || title,
                content,
                storyboard: storyboard ? JSON.stringify(storyboard) : null,
                coverTitle,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                ...script,
                storyboard: script.storyboard ? JSON.parse(script.storyboard) : null,
            },
        })
    } catch (error) {
        console.error('保存视频脚本失败:', error)
        return NextResponse.json(
            { success: false, error: '保存失败' },
            { status: 500 }
        )
    }
}
