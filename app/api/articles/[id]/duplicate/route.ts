import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/articles/[id]/duplicate - 复制文章
export async function POST(
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

    // 获取原文章
    const originalArticle = await prisma.article.findUnique({
      where: { id },
    })

    if (!originalArticle) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      )
    }

    // 创建副本
    const duplicatedArticle = await prisma.article.create({
      data: {
        title: `${originalArticle.title} (副本)`,
        content: originalArticle.content,
        summary: originalArticle.summary,
        status: 'draft', // 副本默认为草稿
        images: originalArticle.images,
      },
    })

    console.log('✅ 文章复制成功:', duplicatedArticle.id)

    return NextResponse.json({
      success: true,
      data: duplicatedArticle,
      message: '文章复制成功',
    })

  } catch (error) {
    console.error('复制文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '复制失败' },
      { status: 500 }
    )
  }
}
