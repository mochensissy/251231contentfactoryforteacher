import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/articles - 保存文章
export async function POST(request: NextRequest) {
  try {
    const {
      title,
      content,
      summary,
      status,
      wordCount,
      writeStyle,
      imageCount,
      images,
      taskId,
      insightTitle,
    } = await request.json() as {
      title: string
      content: string
      summary?: string
      status?: string
      wordCount?: string
      writeStyle?: string
      imageCount?: number
      images?: string[]
      taskId?: number
      insightTitle?: string
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      )
    }

    console.log('💾 保存文章...')
    console.log(`- 标题: ${title}`)
    console.log(`- 字数: ${content.length}`)
    console.log(`- 关联任务: ${taskId || '无'}`)

    const article = await prisma.article.create({
      data: {
        title,
        content,
        summary,
        wordCount,
        writeStyle,
        imageCount,
        images: images ? JSON.stringify(images) : null,
        taskId,
        insightTitle,
        source: 'ai_generated',
        status: status || 'draft',
      },
    })

    console.log('✅ 文章已保存:', article.id)

    return NextResponse.json({
      success: true,
      data: {
        id: article.id,
        articleId: article.id,
      },
    })

  } catch (error) {
    console.error('❌ 保存文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    )
  }
}

// GET /api/articles - 获取文章列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    // 获取总数
    const total = await prisma.article.count({ where })

    // 获取文章列表
    const articles = await prisma.article.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        wordCount: true,
        writeStyle: true,
        insightTitle: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: articles,
      total,
      limit,
      offset,
    })

  } catch (error) {
    console.error('获取文章列表失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    )
  }
}
