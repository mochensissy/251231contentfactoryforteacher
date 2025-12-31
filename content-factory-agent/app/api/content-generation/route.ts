import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-client'
import { imageClient } from '@/lib/image-client'

// POST /api/content-generation - 生成文章内容
export async function POST(request: NextRequest) {
  try {
    const {
      topic,
      description,
      outline,
      wordCount,
      style,
      imageCount
    } = await request.json() as {
      topic: string
      description?: string
      outline?: string[]
      wordCount: string
      style: string
      imageCount: number
    }

    if (!topic) {
      return NextResponse.json(
        { error: '选题标题不能为空' },
        { status: 400 }
      )
    }

    console.log('🚀 开始生成文章...')
    console.log(`- 选题: ${topic}`)
    console.log(`- 字数: ${wordCount}`)
    console.log(`- 风格: ${style}`)
    console.log(`- 配图: ${imageCount}张`)

    // 步骤1: 调用AI生成文章
    console.log('📝 步骤1: 生成文章内容...')
    const result = await aiClient.generateArticle({
      topic,
      description,
      outline,
      wordCount,
      style,
      imageCount,
    })

    // 步骤2: 根据文章内容生成图片提示词
    let images: string[] = []
    let finalContent = result.content

    if (imageCount > 0) {
      console.log(`🎨 步骤2: 生成 ${imageCount} 张配图...`)

      try {
        // 2.1 生成图片提示词
        console.log('💡 正在生成图片提示词...')
        const imagePrompts = await aiClient.generateImagePrompts({
          articleContent: result.content,
          imageCount,
        })

        // 2.2 使用提示词生成图片
        console.log('🖼️  正在生成图片...')
        images = await imageClient.generateImages(imagePrompts, (current, total, imageUrl) => {
          console.log(`   进度: ${current}/${total} - ${imageUrl.slice(0, 50)}...`)
        })

        // 2.3 替换文章中的图片占位符
        images.forEach((imageUrl, index) => {
          const placeholder = `IMAGE_PLACEHOLDER_${index + 1}`
          finalContent = finalContent.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${placeholder}\\)`, 'g'),
            `![$1](${imageUrl})`
          )
        })

        console.log(`✅ ${images.length} 张配图生成完成`)

      } catch (error) {
        console.error('⚠️ 配图生成失败，使用占位图:', error)
        // 降级到占位图
        images = await getFallbackImages(imageCount)
        images.forEach((imageUrl, index) => {
          const placeholder = `IMAGE_PLACEHOLDER_${index + 1}`
          finalContent = finalContent.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${placeholder}\\)`, 'g'),
            `![$1](${imageUrl})`
          )
        })
      }
    }

    console.log('✅ 文章生成完成')

    return NextResponse.json({
      success: true,
      data: {
        title: result.title,
        content: finalContent,
        summary: result.summary,
        images,
      },
    })

  } catch (error) {
    console.error('❌ 生成文章失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成文章失败' },
      { status: 500 }
    )
  }
}

// 降级占位图（当AI生成失败时使用）
async function getFallbackImages(count: number): Promise<string[]> {
  if (count === 0) return []

  console.log(`⚠️ 使用占位图作为降级方案 (${count}张)`)
  return Array(count).fill('').map((_, i) =>
    `https://placehold.co/800x400/EEE/999?text=Image+${i + 1}`
  )
}

