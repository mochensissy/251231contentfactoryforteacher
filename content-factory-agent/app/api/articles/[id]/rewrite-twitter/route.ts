import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiClient } from '@/lib/ai-client'
import { markdownToPlainText } from '@/lib/text-utils'

const TWITTER_PROMPT = `# Role
你是一位擅长写 Twitter/X 热门短文案的创作者，输出必须像真人说话，节奏短促有钩子。

# Style guardrails
- 语言口语化，避免公文腔和堆砌形容词。
- 结构：开头钩子 6-20 字；中段 1-2 句讲清核心观点/收益；结尾 1 句金句或互动。
- 不要列表、序号、分点；控制在 2-3 句内形成连贯小故事。
- Emoji 可选且最多 1 个，放在句首或句尾；不要一行一个 emoji。
- 严控字数：中文 <= 140 字（理想 120-130 字），必须一条推文发完。
- 避免 AI 口头禅/模板句（如“不是…而是…”、“作为…专家”）。

# Workflow
1. 读原文，锁定 1 个核心观点 + 1 个具体收益或行动。
2. 按 Hook -> Value -> Punchline/CTA 写成连贯短句，禁止分点。
3. 检查口语感、连贯性和字数，必要时压缩到 140 字内。

# Output
直接输出 1 条可发布的推文，不要解释、不要代码块。`

const MAX_TWITTER_LENGTH = 280

/**
 * 将 AI 输出清洗为可直接使用的推特文案，并确保长度不超限
 */
function normalizeTweet(raw: string): string {
  // 保留代码块内容，去掉包裹
  const codeBlock = raw.match(/```[\w-]*\n?([\s\S]*?)```/)
  const content = codeBlock ? codeBlock[1] : raw
  const trimmed = content.trim()

  if (trimmed.length <= MAX_TWITTER_LENGTH) {
    return trimmed
  }

  // 超长时截断，优先保留完整结尾句号
  const slice = trimmed.slice(0, MAX_TWITTER_LENGTH)
  const breakpoints = ['。', '！', '？', '!', '?', '\n']
  const lastBreak = breakpoints
    .map((p) => slice.lastIndexOf(p))
    .reduce((a, b) => Math.max(a, b), -1)

  const safe = lastBreak >= 80 ? slice.slice(0, lastBreak + 1) : slice
  return safe.trim()
}

/**
 * 构建向大模型发送的改写请求内容
 */
function buildPrompt(title: string, content: string): string {
  const safeContent = content.slice(0, 6000)
  return `${TWITTER_PROMPT}

原始标题：${title}

原始正文：
${safeContent}`
}

// POST /api/articles/[id]/rewrite-twitter - 将文章改写为推特文案
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: '无效的文章ID' }, { status: 400 })
    }

    const article = await prisma.article.findUnique({
      where: { id },
    })

    if (!article) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 })
    }

    const plainText = markdownToPlainText(article.content || '')
    if (!plainText) {
      return NextResponse.json({ error: '文章内容为空，无法改写' }, { status: 400 })
    }

    const prompt = buildPrompt(article.title, plainText)

    console.log('🚀 开始改写推特文案', { articleId: id, title: article.title })

    const response = await aiClient.chat(
      [
        {
          role: 'system',
          content:
            '你是精通 Twitter (X) 的爆款文案专家。必须在一条推文内完成输出（中文不超过140字），禁止客套废话，保证排版清爽。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0.5,
        maxTokens: 220,
      }
    )

    const tweet = normalizeTweet(response)

    return NextResponse.json({
      success: true,
      data: {
        tweet,
      },
    })
  } catch (error) {
    console.error('❌ 推特改写失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '改写失败' },
      { status: 500 }
    )
  }
}
