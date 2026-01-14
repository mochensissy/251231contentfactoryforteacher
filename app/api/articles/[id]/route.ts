import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取单篇文章
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: '无效的ID' }, { status: 400 })
        }

        const article = await prisma.article.findUnique({
            where: { id },
            include: {
                publishRecords: true
            }
        })

        if (!article) {
            return NextResponse.json({ success: false, error: '文章不存在' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: article })
    } catch (error) {
        return NextResponse.json({ success: false, error: '获取文章失败' }, { status: 500 })
    }
}

// PUT: 更新文章
export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: '无效的ID' }, { status: 400 })
        }

        const body = await request.json()
        const article = await prisma.article.update({
            where: { id },
            data: body
        })

        return NextResponse.json({ success: true, data: article })
    } catch (error) {
        return NextResponse.json({ success: false, error: '更新文章失败' }, { status: 500 })
    }
}

// DELETE: 删除文章
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: '无效的ID' }, { status: 400 })
        }

        await prisma.article.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: '删除文章失败' }, { status: 500 })
    }
}
