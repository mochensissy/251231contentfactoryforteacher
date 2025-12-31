/**
 * 文本处理工具类
 * 用于文本清洗、图文分离等功能
 */

/**
 * 从 Markdown 内容中提取图片 URL
 */
export function extractImagesFromMarkdown(markdown: string): string[] {
  const imageRegex = /!\[.*?\]\((.*?)\)/g
  const images: string[] = []
  let match

  while ((match = imageRegex.exec(markdown)) !== null) {
    if (match[1]) {
      images.push(match[1])
    }
  }

  return images
}

/**
 * 将 Markdown 转换为纯文本
 * 移除所有 Markdown 标记符号，保留文本内容和换行结构
 */
export function markdownToPlainText(markdown: string): string {
  let text = markdown

  // 1. 移除图片标记 ![alt](url)
  text = text.replace(/!\[.*?\]\(.*?\)/g, '')

  // 2. 移除链接，保留链接文本 [text](url) -> text
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1')

  // 3. 移除标题标记 # ## ###
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 4. 移除加粗和斜体标记 **text** *text* __text__ _text_
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, '$1')  // 加粗+斜体
  text = text.replace(/\*\*(.*?)\*\*/g, '$1')      // 加粗
  text = text.replace(/\*(.*?)\*/g, '$1')          // 斜体
  text = text.replace(/___(.*?)___/g, '$1')        // 加粗+斜体
  text = text.replace(/__(.*?)__/g, '$1')          // 加粗
  text = text.replace(/_(.*?)_/g, '$1')            // 斜体

  // 5. 移除删除线 ~~text~~
  text = text.replace(/~~(.*?)~~/g, '$1')

  // 6. 移除行内代码 `code`
  text = text.replace(/`([^`]+)`/g, '$1')

  // 7. 移除代码块 ```code```
  text = text.replace(/```[\s\S]*?```/g, '')

  // 8. 移除引用标记 >
  text = text.replace(/^>\s+/gm, '')

  // 9. 移除水平线 --- *** ___
  text = text.replace(/^[-*_]{3,}$/gm, '')

  // 10. 移除列表标记 - * + 1.
  text = text.replace(/^[\s]*[-*+]\s+/gm, '')
  text = text.replace(/^[\s]*\d+\.\s+/gm, '')

  // 11. 移除 HTML 标签（如果有）
  text = text.replace(/<[^>]+>/g, '')

  // 12. 清理多余的空行（保留段落结构）
  text = text.replace(/\n{3,}/g, '\n\n')

  // 13. 清理首尾空白
  text = text.trim()

  return text
}

/**
 * 图文分离 - 从文章中提取文本和图片
 */
export function separateTextAndImages(params: {
  content: string
  existingImages?: string[]
}): {
  plainText: string
  images: string[]
  coverImage: string | null
} {
  const { content, existingImages = [] } = params

  // 1. 从 Markdown 中提取图片
  const markdownImages = extractImagesFromMarkdown(content)

  // 2. 合并已有图片和提取的图片（去重）
  const allImages = Array.from(new Set([...existingImages, ...markdownImages]))

  // 3. 清洗文本
  const plainText = markdownToPlainText(content)

  // 4. 确定封面图（取第一张）
  const coverImage = allImages.length > 0 ? allImages[0] : null

  return {
    plainText,
    images: allImages,
    coverImage,
  }
}

/**
 * 从文章标题或内容中提取标签（简单实现）
 */
export function extractTags(title: string, content: string): string[] {
  // 这里可以根据业务需求实现更复杂的标签提取逻辑
  // 目前返回一些通用标签
  const tags: string[] = []

  // 如果标题或内容包含特定关键词，添加相关标签
  const keywords = {
    '效率': ['效率', '职场'],
    '管理': ['管理', '职场'],
    '技术': ['技术', '开发'],
    '设计': ['设计', '创意'],
    '营销': ['营销', '运营'],
  }

  const text = (title + ' ' + content).toLowerCase()

  for (const [keyword, relatedTags] of Object.entries(keywords)) {
    if (text.includes(keyword)) {
      tags.push(...relatedTags)
    }
  }

  // 去重并限制数量
  return Array.from(new Set(tags)).slice(0, 5)
}

/**
 * 将末行疑似标签的分隔符统一为空格并拆分为候选标签
 * - 支持空格 / 逗号 / 顿号 / 竖线分隔
 * - 去掉开头的 #，过滤过短或包含句号的内容
 */
function parseBareTags(line: string): string[] {
  return line
    .replace(/[|｜]/g, ' ')
    .split(/[\s,，、]+/)
    .map(token => token.trim().replace(/^[#＃]+/, ''))
    .filter(token => token.length >= 2 && token.length <= 30)
    // 避免把完整句子误判为标签
    .filter(token => !/[。！？!？；;：:,，]/.test(token))
}

/**
 * 判断末行是否像“无 # 的标签行”，并返回拆分后的标签
 * 规则：无明显句末标点，标签数≥3
 */
function extractTrailingBareTags(text: string): string[] {
  const lines = text.trimEnd().split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  if (lines.length === 0) return []

  const lastLine = lines[lines.length - 1].trim()
  if (/[。！？!？；;：:]$/.test(lastLine)) return []

  const tokens = parseBareTags(lastLine)
  return tokens.length >= 3 ? tokens : []
}

/**
 * 规范化话题并确保正文末尾存在带 # 的话题行
 */
export function ensureTopicHashtags(params: {
  content: string
  explicitTopics?: string[]
  keywordSeeds?: string[]
  maxTopics?: number
}): { contentWithHashtags: string; topics: string[] } {
  const { content, explicitTopics = [], keywordSeeds = [], maxTopics = 12 } = params

  const orderedTopics: string[] = []
  const seen = new Set<string>()

  const addTopic = (raw: string | undefined | null) => {
    if (!raw) return
    const normalized = raw.trim().replace(/^[#＃]+/, '')
    if (!normalized) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    orderedTopics.push(normalized)
  }

  // 1) 已有 #话题
  const existing = Array.from(content.matchAll(/[#＃]([\p{Script=Han}A-Za-z0-9_\-]{2,30})/gu)).map(
    match => match[1],
  )
  existing.forEach(addTopic)

  // 2) 显式传入的话题
  explicitTopics.forEach(addTopic)

  // 3) 文本中出现的关键词种子
  const haystack = content
  keywordSeeds.forEach(seed => {
    if (!seed) return
    if (haystack.includes(seed)) {
      addTopic(seed)
    }
  })

  // 4) 末行疑似标签（未带 #）的兜底补全
  const trailingBareTags = extractTrailingBareTags(content)
  trailingBareTags.forEach(addTopic)

  const topics = orderedTopics.slice(0, maxTopics)
  if (topics.length === 0) {
    return { contentWithHashtags: content.trim(), topics }
  }

  // 移除末尾已存在的纯标签行，避免重复
  const lines = content.trimEnd().split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim()
    const looksLikeTagLine =
      /^([#＃][\p{Script=Han}A-Za-z0-9_\-]+(\s+|$))+$/u.test(lastLine) ||
      extractTrailingBareTags(lastLine).length >= 3
    if (looksLikeTagLine) {
      lines.pop()
    }
  }

  const topicLine = topics.map(t => `#${t}`).join(' ')
  const body = lines.join('\n').trim()
  const contentWithHashtags = body ? `${body}\n\n${topicLine}` : topicLine

  return { contentWithHashtags, topics }
}

/**
 * 检测正文是否可能被截断或未收尾
 */
export function detectIncompleteContent(text: string, minLength = 120): string | null {
  const trimmed = text.trim()
  if (trimmed.length < minLength) {
    return '正文过短，可能未写完'
  }

  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    return '正文为空，可能未写完'
  }

  const lastLine = lines[lines.length - 1]
  const goodEnding = /[。！!？?…]$/.test(lastLine)
  if (!goodEnding) {
    return '正文结尾缺少收尾标点，可能被截断'
  }

  return null
}
