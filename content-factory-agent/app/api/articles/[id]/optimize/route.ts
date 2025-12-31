import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-client'

// POST /api/articles/[id]/optimize - 优化文章内容
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

    const {
      originalContent,
      optimizationRequest,
      conversationHistory,
    } = await request.json() as {
      originalContent: string
      optimizationRequest: string
      conversationHistory?: any[]
    }

    if (!originalContent || !optimizationRequest) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log('🔧 开始优化文章...')
    console.log(`- 文章ID: ${id}`)
    console.log(`- 优化要求: ${optimizationRequest}`)

    // 调用AI优化文章
    const result = await aiClient.optimizeArticle({
      originalContent,
      optimizationRequest,
      conversationHistory,
    })

    console.log('✅ 文章优化完成')

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        explanation: result.explanation,
      },
    })

  } catch (error) {
    console.error('❌ 优化文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '优化失败' },
      { status: 500 }
    )
  }
}
