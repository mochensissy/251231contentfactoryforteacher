import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/articles/[id] - 获取文章详情
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的文章ID' },
        { status: 400 }
      )
    }

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        publishRecords: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!article) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      )
    }

    // 解析JSON字段
    const result = {
      ...article,
      images: article.images ? JSON.parse(article.images) : [],
    }

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('获取文章详情失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    )
  }
}

// PUT /api/articles/[id] - 更新文章
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的文章ID' },
        { status: 400 }
      )
    }

    const {
      title,
      content,
      summary,
      status,
      images,
    } = await request.json()

    const updateData: any = {}

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (summary !== undefined) updateData.summary = summary
    if (status !== undefined) updateData.status = status
    if (images !== undefined) updateData.images = JSON.stringify(images)

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    })

    console.log('✅ 文章已更新:', article.id)

    return NextResponse.json({
      success: true,
      data: article,
    })

  } catch (error) {
    console.error('更新文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/articles/[id] - 删除文章
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的文章ID' },
        { status: 400 }
      )
    }

    // 先删除关联的发布记录
    await prisma.publishRecord.deleteMany({
      where: { articleId: id },
    })

    // 再删除文章
    await prisma.article.delete({
      where: { id },
    })

    console.log('已删除文章及其发布记录:', id)

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })

  } catch (error) {
    console.error('删除文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    )
  }
}
