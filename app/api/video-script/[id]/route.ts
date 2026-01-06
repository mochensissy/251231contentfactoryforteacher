import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取单个视频脚本
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const scriptId = parseInt(id)

        if (isNaN(scriptId)) {
            return NextResponse.json(
                { success: false, error: '无效的ID' },
                { status: 400 }
            )
        }

        const script = await prisma.videoScript.findUnique({
            where: { id: scriptId },
        })

        if (!script) {
            return NextResponse.json(
                { success: false, error: '脚本不存在' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                ...script,
                storyboard: script.storyboard ? JSON.parse(script.storyboard) : null,
            },
        })
    } catch (error) {
        console.error('获取视频脚本失败:', error)
        return NextResponse.json(
            { success: false, error: '获取失败' },
            { status: 500 }
        )
    }
}

// PUT: 更新视频脚本
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const scriptId = parseInt(id)

        if (isNaN(scriptId)) {
            return NextResponse.json(
                { success: false, error: '无效的ID' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { title, content, storyboard, coverTitle } = body

        const script = await prisma.videoScript.update({
            where: { id: scriptId },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(storyboard !== undefined && {
                    storyboard: storyboard ? JSON.stringify(storyboard) : null,
                }),
                ...(coverTitle !== undefined && { coverTitle }),
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
        console.error('更新视频脚本失败:', error)
        return NextResponse.json(
            { success: false, error: '更新失败' },
            { status: 500 }
        )
    }
}

// DELETE: 删除视频脚本
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const scriptId = parseInt(id)

        if (isNaN(scriptId)) {
            return NextResponse.json(
                { success: false, error: '无效的ID' },
                { status: 400 }
            )
        }

        await prisma.videoScript.delete({
            where: { id: scriptId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('删除视频脚本失败:', error)
        return NextResponse.json(
            { success: false, error: '删除失败' },
            { status: 500 }
        )
    }
}
