import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { xiaohongshuClient } from '@/lib/xiaohongshu-client'
import { aiClient } from '@/lib/ai-client'
import { imageClient } from '@/lib/image-client'
import {
  separateTextAndImages,
  extractTags,
  ensureTopicHashtags,
  detectIncompleteContent,
} from '@/lib/text-utils'

// POST /api/publish/xiaohongshu - 发布文章到小红书
export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json() as { articleId: number }

    if (!articleId) {
      return NextResponse.json(
        { error: '缺少文章ID' },
        { status: 400 }
      )
    }

    console.log('\n🚀 开始发布文章到小红书...')
    console.log(`- 文章ID: ${articleId}`)

    // ========== 步骤1: 验证配置 ==========
    if (!xiaohongshuClient.isConfigured()) {
      return NextResponse.json(
        { error: '小红书 API 配置未设置，请检查环境变量' },
        { status: 500 }
      )
    }

    // ========== 步骤2: 获取文章内容 ==========
    console.log('\n📖 步骤1/5: 获取文章内容...')

    const article = await prisma.article.findUnique({
      where: { id: articleId },
    })

    if (!article) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      )
    }

    console.log(`✅ 文章标题: ${article.title}`)
    console.log(`✅ 文章长度: ${article.content.length} 字符`)

    // ========== 步骤3: 图文分离和文本清洗 ==========
    console.log('\n🔄 步骤2/5: 图文分离和文本清洗...')

    // 解析已有的图片
    const existingImages = article.images ? JSON.parse(article.images) : []

    // 分离文本和图片
    const { plainText, images, coverImage } = separateTextAndImages({
      content: article.content,
      existingImages,
    })

    console.log(`✅ 清洗后文本长度: ${plainText.length} 字符`)
    console.log(`✅ 提取图片数量: ${images.length}`)
    console.log(`✅ 封面图: ${coverImage || '无'}`)

    // 基础完整性校验，避免“半截内容”发布
    const completenessIssue = detectIncompleteContent(plainText)
    if (completenessIssue) {
      return NextResponse.json(
        { error: `发布中止：${completenessIssue}` },
        { status: 400 },
      )
    }

    // 确保有封面图（无则自动生成）
    const { finalCoverImage, finalImages } = await ensureCoverImage({
      title: article.title,
      content: plainText,
      coverImage,
      images,
    })

    // ========== 步骤4: 小红书风格改写 ==========
    console.log('\n📝 步骤3/5: 小红书风格改写...')

    let xhsContent = plainText
    try {
      xhsContent = await rewriteForXiaohongshu({
        title: article.title,
        content: plainText,
        coverImage: finalCoverImage,
      })
      console.log(`✅ 改写后文本长度: ${xhsContent.length} 字符`)
    } catch (rewriteError) {
      console.error('❌ 小红书风格改写失败，回退到原文:', rewriteError)
    }

    // ========== 步骤5: 提取标签 ==========
    console.log('\n🏷️  步骤4/5: 提取标签...')
    let tags = extractTags(article.title, plainText)
    console.log(`✅ 提取标签: ${tags.join(', ')}`)

    // ========== 步骤5.1: 话题补全为 # 格式 + 去重 ==========
    const keywordSeeds = [
      '复盘',
      '认知升级',
      '信息焦虑',
      'AI',
      '知识管理',
      '方法论',
      '自我成长',
      '年末总结',
      '月度总结',
      '长文',
      '话题',
    ]

    const { contentWithHashtags, topics } = ensureTopicHashtags({
      content: xhsContent,
      explicitTopics: tags,
      keywordSeeds,
      maxTopics: 12,
    })

    // 控制长度，优先保留话题行
    xhsContent = enforceLengthLimit(contentWithHashtags, xhsContent)
    tags = topics

    console.log(`✅ 话题补全完成`)
    console.log(`  - 话题数量: ${tags.length}`)
    console.log(`  - 话题列表: ${tags.join(', ')}`)
    console.log(`  - 正文总长度: ${xhsContent.length} 字符`)
    console.log(`🧾 发布正文预览（前200字）:`)
    console.log(xhsContent.slice(0, 200))
    console.log(`🧾 发布正文预览（尾200字）:`)
    console.log(xhsContent.length > 200 ? xhsContent.slice(-200) : xhsContent)
    
    // 检查标签行是否存在，如果没有则强制添加
    const hasTagsInContent = tags.some(tag => xhsContent.includes(`#${tag}`))
    if (!hasTagsInContent && tags.length > 0) {
      console.warn('⚠️ 警告：正文中未检测到话题标签，正在强制添加...')
      const tagLine = tags.map(t => `#${t}`).join(' ')
      xhsContent = `${xhsContent.trim()}\n\n${tagLine}`
      console.log(`✅ 已强制添加标签行: ${tagLine}`)
    }

    // 最终字数检查：小红书限制约 800 字，这里与平台对齐
    const XHS_MAX_LENGTH = 800
    if (xhsContent.length > XHS_MAX_LENGTH) {
      console.warn(`⚠️ 内容超过小红书字数限制 (${xhsContent.length}/${XHS_MAX_LENGTH})，正在截断...`)
      // 优先保留标签行
      const lines = xhsContent.split('\n')
      const tagLineIdx = lines.findIndex(l => l.trim().split(/\s+/).filter(t => /^#/.test(t)).length >= 3)
      let tagLine = ''
      if (tagLineIdx >= 0) {
        tagLine = lines[tagLineIdx]
        lines.splice(tagLineIdx, 1)
      }
      // 截断正文
      let body = lines.join('\n').trim()
      const availableLen = XHS_MAX_LENGTH - (tagLine ? tagLine.length + 2 : 0)
      if (body.length > availableLen) {
        body = body.slice(0, availableLen)
        // 找最后一个句号/感叹号/问号截断
        const lastPunct = Math.max(body.lastIndexOf('。'), body.lastIndexOf('！'), body.lastIndexOf('？'))
        if (lastPunct > availableLen * 0.7) {
          body = body.slice(0, lastPunct + 1)
        }
      }
      xhsContent = tagLine ? `${body.trim()}\n\n${tagLine}` : body.trim()
      console.log(`✅ 截断后长度: ${xhsContent.length} 字符`)
    }

    // ========== 步骤6: 调用小红书 API ==========
    console.log('\n📤 步骤5/5: 调用小红书发布 API...')

    const publishResult = await xiaohongshuClient.publishNote({
      title: article.title,
      content: xhsContent,
      coverImage: finalCoverImage,
      images: finalImages.slice(1), // 除封面外的其他图片
      tags,
      noteId: `article_${articleId}_${Date.now()}`, // 自定义笔记ID
    })

    if (!publishResult.success || !publishResult.data) {
      throw new Error(publishResult.error || '发布失败')
    }

    console.log('✅ 小红书 API 调用成功')

    // ========== 步骤7: 保存发布记录 ==========
    console.log('\n💾 保存发布记录...')

    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: 'published',
      },
    })

    await prisma.publishRecord.create({
      data: {
        articleId,
        platform: 'xiaohongshu',
        platformId: publishResult.data.note_id,
        status: 'success',
        publishedAt: new Date(),
      },
    })

    console.log('✅ 发布记录已保存\n')

    return NextResponse.json({
      success: true,
      data: {
        noteId: publishResult.data.note_id,
        publishUrl: publishResult.data.publish_url,
        qrCodeUrl: publishResult.data.xiaohongshu_qr_image_url,
        message: '文章已成功发布到小红书',
      },
    })

  } catch (error) {
    console.error('\n❌ 发布失败:', error)

    // 如果有 articleId，记录失败状态
    try {
      const { articleId } = await request.json() as { articleId: number }
      if (articleId) {
        await prisma.publishRecord.create({
          data: {
            articleId,
            platform: 'xiaohongshu',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : '发布失败',
          },
        })
      }
    } catch (e) {
      // 忽略记录失败的错误
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发布失败' },
      { status: 500 }
    )
  }
}

/**
 * 使用指定提示词将文章改写为小红书“视觉呼吸”风格
 */
async function rewriteForXiaohongshu(params: {
  title: string
  content: string
  coverImage?: string | null
}): Promise<string> {
  const { title, content, coverImage } = params

  const prompt = `# Role: 小红书文案改写专家（视觉呼吸版）

## Goals:

将用户输入的文案，改写为极具网感、情绪共鸣强烈、且排版“会呼吸”的小红书爆款笔记。
⚠️ 【最重要】字数硬限制：小红书笔记有字数上限，正文+标签必须控制在 800 字以内！
- 如果原文超过 800 字，必须缩减到 800 字以内（含标签），主旨不变，可删次要细节
- 长文必须大幅精简，只保留核心观点和金句
- 删除次要段落、重复内容、过度展开的细节
- 宁可少写，也绝不能超过 800 字

## Core Style (风格核心):
1.  **极简主义**：删减废话，只留金句和核心观点。
2. **“清醒痛点”风**：文风要犀利、扎心，但要拒绝说教味。
3. **情绪引导**：用“视觉锚点”（Emoji）和短句控制阅读节奏。
4. **视觉清爽**：段落之间必须留白，避免密集排版。

## Formatting Rules (严格排版规则):
1.  **标题规范**：
    - 格式：\`Emoji\` + \`空格\` + \`吸睛标题\`。
    - 标题风格：必须包含悬念、反直觉或强烈情绪。
2.  **Emoji 布局策略（关键）**：
    - **禁止滥用**：正文只在**大段落/新观点开头**放 Emoji，作为分割线；整篇 3-5 个即可，不要每段都放。
    - **语义匹配**：Emoji 必须与后文内容强相关。示例：成果🍎/💰，成长/起步🌱，思考🤔，扎心/风险💔/⚠️。
3.  **列表规范**：
    - 如果有次序感，使用 1️⃣ 2️⃣ 3️⃣ 4️⃣ 作为序号。
4.  **段落留白**：
    - “视觉呼吸”排版：每 1-2 句话换行；板块之间空一行。
5.  **⚠️ 字数限制（最重要）**：
    - **正文 + 标签行总计不超过 800 字！**
    - 这是小红书平台的硬性限制，超过会被截断
    - 长文要大幅精简，提炼 2-3 个核心观点即可
6.  **Emoji 数量**：全篇确保 3-5 个 Emoji，放在关键段落首行。

## Workflow & Constraints:
1.  静默模式：只输出结果，无额外解释。
2.  代码块输出：结果必须包裹在 Markdown 代码块中。
3.  **标签生成（必须）**：文末**必须**生成 5-8 个标签，单行显示，空格分隔，格式为 #标签1 #标签2 #标签3 ...。标签行不能省略或被截断。
4.  保留原文关键信息/数据/场景，不编造；不要输出任何图片 URL 或 Markdown 图片占位。
5.  **完整性 > 信息量**：宁可删减内容，也要保证正文有完整结尾 + 标签行。绝对不能超过 800 字！

## Initialization:
请回复：“已配置 V2.0 视觉呼吸模式。请发送您的文案，我将按‘截图同款’风格进行改写。”

## 平台定制：
- 文章标题：${title}
- 待改写文案：
${content}`

  const response = await aiClient.chat([
    {
      role: 'system',
      content: '你是小红书文案改写专家。【最重要规则】输出必须控制在800字以内（含标签），因为小红书有字数限制，超过会被截断！长文要大幅精简，只保留核心观点。务必包含完整结尾和标签行。使用代码块包裹输出。',
    },
    {
      role: 'user',
      content: `${prompt}

待改写文案：
${content}`,
    },
  ], {
    temperature: 0.35,
    maxTokens: 1500,
  })

  const rewritten = extractCodeBlockContent(response)
  const cleaned = cleanXhsContent(rewritten)
  const lengthSafe = enforceLengthLimit(cleaned || content, content)
  const withEmojis = ensureEmojiAnchors(lengthSafe)
  return withEmojis
}

/**
 * 若缺封面则自动生成，并统一维护图片列表顺序（封面在首位）
 */
async function ensureCoverImage(params: {
  title: string
  content: string
  coverImage?: string | null
  images: string[]
}): Promise<{ finalCoverImage: string; finalImages: string[] }> {
  const { title, content, coverImage, images } = params

  // 已有封面则直接返回
  if (coverImage) {
    return {
      finalCoverImage: coverImage,
      finalImages: images.length > 0 ? images : [coverImage],
    }
  }

  console.log('⚠️ 未检测到封面，尝试自动生成...')

  // 简单的提示词构建，聚焦主题，避免风景虚图
  const prompt = buildCoverPrompt(title, content)

  try {
    const generated = await imageClient.generateImage(prompt)
    console.log('✅ 自动生成封面成功')

    const finalImages = [generated, ...images]
    return {
      finalCoverImage: generated,
      finalImages,
    }
  } catch (error) {
    console.error('❌ 自动生成封面失败:', error)
    // 兜底：使用占位图，保证流程不中断
    const placeholder = 'https://placehold.co/800x450/EEE/555?text=XHS+Cover'
    console.log('⚠️ 使用占位封面继续流程')
    const finalImages = [placeholder, ...images]
    return {
      finalCoverImage: placeholder,
      finalImages,
    }
  }
}

function buildCoverPrompt(title: string, content: string): string {
  const snippet = content.slice(0, 220).replace(/\s+/g, ' ')
  const shortTitle = toShortTitle(title)
  const keywords = extractTopWords(`${title} ${content}`, 6).join('、')
  return `小红书封面海报风，主题必须围绕「${title}」。
画面元素与主题直接相关，避免无关风景；加入人物/场景动作，突出实用、效率或洞察。
风格：清爽、现代、插画+扁平，暖色点缀，高对比。
文字：画面上有中文大字报，内容写成「${shortTitle}」，2-6字，粗体。
构图：主体居中或黄金分割，大面积留白，符合小红书视觉。
情绪：积极、有力量、种草感。
避免：过度写实、英文文字、过暗或杂乱。
关键要素：${keywords}
参考文案片段：${snippet}`
}

/**
 * 保证生成文案可用且不过度截断，默认 12000 字内收敛，优先保留标签行。
 */
function enforceLengthLimit(candidate: string, fallback: string): string {
  const text = candidate.trim()
  if (!text) return fallback

  // 小红书笔记字数限制约为 800 字，这里与平台对齐
  const maxLen = 800
  const lines = text.split('\n')
  let tagLine = ''
  let bodyLines = lines

  // 识别末行标签，保留下来避免被截断
  if (lines.length > 1) {
    const possibleTagLine = lines[lines.length - 1].trim()
    const tagTokens = possibleTagLine.split(/\s+/)
    // 更宽松的标签识别：至少 2 个 token，且至少一半以 # 开头
    const hashtagCount = tagTokens.filter(t => /^#|^＃/.test(t)).length
    const looksLikeTags = tagTokens.length >= 2 && hashtagCount >= Math.ceil(tagTokens.length / 2)
    if (looksLikeTags) {
      tagLine = possibleTagLine
      bodyLines = lines.slice(0, -1)
      console.log(`🏷️  识别到标签行，将优先保留: ${tagLine}`)
    }
  }

  const body = bodyLines.join('\n').trim()
  if (body.length <= maxLen) {
    return tagLine ? `${body}\n${tagLine}`.trim() : body
  }

  const safeSlice = body.slice(0, maxLen)
  const cutIndex = findBestBreakPoint(safeSlice)
  const trimmedBody = (cutIndex > 120 ? safeSlice.slice(0, cutIndex).trim() : safeSlice.trim()) || fallback.trim()

  return tagLine ? `${trimmedBody}\n${tagLine}`.trim() : trimmedBody
}

/**
 * 选择一个相对自然的截断点，尽量避免截断句子。
 */
function findBestBreakPoint(text: string): number {
  const candidates = [
    text.lastIndexOf('\n'),
    text.lastIndexOf('。'),
    text.lastIndexOf('！'),
    text.lastIndexOf('？'),
    text.lastIndexOf('!'),
    text.lastIndexOf('?'),
  ]
  return Math.max(...candidates)
}

function ensureEmojiAnchors(text: string): string {
  const blocks = text.split(/\n{2,}/)
  const emojiPool = ['🚀', '📌', '🌱', '⚡️', '💡', '✅', '🔥', '🎯', '📊', '🧠', '✨']
  const maxAnchors = 5
  const minAnchors = 3
  let used = 0

  // 优先在较长段落（非标题、非序号）添加锚点
  const enriched = blocks.map((block, idx) => {
    const trimmed = block.trim()
    if (!trimmed) return ''

    if (trimmed.length < 40) return trimmed

    const lines = trimmed.split('\n')
    const firstIdx = lines.findIndex(l => l.trim() !== '')
    if (firstIdx === -1) return trimmed
    const first = lines[firstIdx]

    if (first.startsWith('#') || startsWithEmoji(first) || /^[0-9]+\./.test(first.trim())) {
      return trimmed
    }

    const shouldAdd = used < minAnchors || (used < maxAnchors && idx % 2 === 0)
    if (!shouldAdd) return trimmed

    const emoji = emojiPool[used % emojiPool.length]
    used += 1
    lines[firstIdx] = `${emoji} ${first.trimStart()}`
    return lines.join('\n')
  })

  // 兜底：不足 3 个时，对较短段落补齐（仍跳过标题/已有 emoji）
  if (used < minAnchors) {
    for (let i = 0; i < enriched.length && used < minAnchors; i++) {
      if (!enriched[i]) continue
      const lines = enriched[i].split('\n')
      const firstIdx = lines.findIndex(l => l.trim() !== '')
      if (firstIdx === -1) continue
      const first = lines[firstIdx]
      if (startsWithEmoji(first) || first.startsWith('#')) continue
      const emoji = emojiPool[used % emojiPool.length]
      used += 1
      lines[firstIdx] = `${emoji} ${lines[firstIdx].trimStart()}`
      enriched[i] = lines.join('\n')
    }
  }

  return enriched.join('\n\n')
}

function startsWithEmoji(line: string): boolean {
  const trimmed = line.trimStart()
  if (!trimmed) return false
  const firstChar = Array.from(trimmed)[0]
  // Unicode 扩展图形符号检测
  return /\p{Extended_Pictographic}/u.test(firstChar)
}

function extractTopWords(text: string, count: number): string[] {
  const words = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const freq: Record<string, number> = {}
  words.forEach(w => {
    const k = w.toLowerCase()
    freq[k] = (freq[k] || 0) + 1
  })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([w]) => w)
}

/**
 * 提取代码块内的正文，若不存在代码块则返回原文
 */
function extractCodeBlockContent(text: string): string {
  const match = text.match(/```[\w-]*\n?([\s\S]*?)```/)
  return (match ? match[1] : text).trim()
}

/**
 * 清理小红书正文：去掉代码块、图片、URL，避免乱码
 */
function cleanXhsContent(text: string): string {
  let result = text
  // 保留代码块内文本，去掉代码块标记
  result = result.replace(/```[\w-]*\n?/g, '')
  result = result.replace(/```/g, '')
  // 移除图片 Markdown
  result = result.replace(/!\[.*?\]\(.*?\)/g, '')
  // 移除裸露URL
  result = result.replace(/https?:\/\/\S+/g, '')
  result = tightenBreathing(result)
  return result
}

function toShortTitle(title: string): string {
  const cleaned = title.replace(/[，。.!？?]/g, ' ').trim()
  return cleaned.slice(0, 8) || '热点好物'
}

/**
 * 收紧留白：只在较长段落或明显分段处保留空行，避免每行后都多一行
 */
function tightenBreathing(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const cleaned: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (line.trim() === '') {
      // 查看前后非空行长度，短行之间不保留空行
      const prev = findPrevNonEmpty(cleaned)
      const next = findNextNonEmpty(lines, i + 1)
      const shouldKeep = (prev?.length ?? 0) >= 30 || (next?.length ?? 0) >= 30
      if (shouldKeep && cleaned[cleaned.length - 1] !== '') {
        cleaned.push('')
      }
      continue
    }
    cleaned.push(line)
  }

  return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function findPrevNonEmpty(arr: string[]): string | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].trim() !== '') return arr[i]
  }
  return null
}

function findNextNonEmpty(arr: string[], start: number): string | null {
  for (let i = start; i < arr.length; i++) {
    if (arr[i].trim() !== '') return arr[i]
  }
  return null
}
