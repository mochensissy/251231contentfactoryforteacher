import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiClient } from '@/lib/ai-client'
import { dashScopeClient } from '@/lib/dashscope-client'

// 闻思修AI手记（原旁观者手记）公众号配置
const PGZ_APPID = process.env.WECHAT_PGZ_APPID || 'wxaa09cc9d8be1432d'
const PGZ_SECRET = process.env.WECHAT_PGZ_SECRET || '4b09266503d951bc038fdb138395fbdb'

// POST /api/publish/wechat-pgz - 发布文章到闻思修AI手记公众号
export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json() as { articleId: number }

    if (!articleId) {
      return NextResponse.json(
        { error: '缺少文章ID' },
        { status: 400 }
      )
    }

    console.log('\n🚀 开始发布文章到闻思修AI手记公众号...')
    console.log(`- 文章ID: ${articleId}`)

    // ========== 步骤1: 获取文章内容 ==========
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

    // ========== 步骤2: AI排版处理（闻思修AI手记风格 - 赭黄色，与HR进化派一致） ==========
    console.log('\n🎨 步骤2/5: AI排版处理（闻思修AI手记风格，与HR进化派一致）...')

    const formattedResult = await formatArticleForWechatPGZWithRetry({
      title: article.title,
      content: article.content,
    }, 2) // 最多重试2次

    console.log('✅ 文章排版完成')
    console.log('✅ 生成图片提示词:', formattedResult.prompt.substring(0, 50) + '...')

    // ========== 步骤3: 生成封面图片 ==========
    console.log('\n🖼️  步骤3/5: 生成封面图片...')

    const imagePrompt = refinePrompt(article.title, formattedResult.prompt)
    const imageBuffer = await dashScopeClient.generateAndDownload(imagePrompt)

    console.log('✅ 封面图片生成完成')

    // ========== 步骤4: 上传封面到微信（闻思修AI手记） ==========
    console.log('\n📤 步骤4/5: 上传封面到闻思修AI手记公众号...')

    const thumbMediaId = await uploadThumbToPGZ(imageBuffer)

    console.log('✅ 封面上传成功')

    // ========== 步骤5: 创建草稿（闻思修AI手记） ==========
    console.log('\n📝 步骤5/5: 创建闻思修AI手记公众号草稿...')

    const mediaId = await addDraftToPGZ({
      title: formattedResult.title,
      content: formattedResult.html_content,
      thumbMediaId,
      author: '闻思修AI手记',
    })

    console.log('✅ 草稿创建成功, media_id:', mediaId)

    // ========== 更新文章状态和发布记录 ==========
    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: 'pending_review',
      },
    })

    await prisma.publishRecord.create({
      data: {
        articleId,
        platform: 'wechat_pgz',
        platformId: mediaId,
        status: 'success',
        publishedAt: new Date(),
      },
    })

    console.log('\n✅ 发布完成！\n')

    return NextResponse.json({
      success: true,
      data: {
        mediaId,
        message: '文章已成功推送到闻思修AI手记公众号草稿箱',
      },
    })

  } catch (error) {
    console.error('\n❌ 发布失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发布失败' },
      { status: 500 }
    )
  }
}

/**
 * AI排版处理 - 带重试机制（闻思修AI手记风格，与HR进化派一致）
 */
async function formatArticleForWechatPGZWithRetry(
  params: {
    title: string
    content: string
  },
  maxRetries: number = 2
): Promise<{
  title: string
  html_content: string
  prompt: string
}> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000) // 指数退避，最多5秒
        console.log(`⏳ 重试 ${attempt - 1}/${maxRetries}，等待 ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      return await formatArticleForWechatPGZ(params)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`❌ 第 ${attempt} 次尝试失败:`, lastError.message)

      if (attempt === maxRetries + 1) {
        console.error('❌ AI排版多次失败，使用降级方案')
        // 最后失败时，直接使用降级方案
        return {
          title: params.title,
          html_content: markdownToSimpleHtmlPGZ(params.content),
          prompt: '日系动画电影风格，温馨治愈的场景，干净明亮的画面',
        }
      }
    }
  }

  // 这个理论上不会执行，但为了类型安全
  throw lastError || new Error('AI排版失败')
}

/**
 * 优化封面提示词，强制贴合文章主题并避免通用风景图
 */
function refinePrompt(title: string, originalPrompt: string): string {
  const keywords = title
    .split(/[\s，。,、“”"『』【】\-\s]+/)
    .filter(Boolean)
    .slice(0, 6)
    .join('、')

  return `${originalPrompt}

封面要求（务必遵循）：
1) 核心主题：封面必须围绕“${title}”，体现与“${keywords || '文章主题'}”直接相关的场景/物件/动作，不能是泛化风景。
2) 具体元素：优先加入与主题直连的事物（产品/工具/人物行为/职场或业务场景），避免无关建筑与自然风光。
3) 风格：保持水彩或插画风格，画面简洁专业。
4) 禁止：纯风景、度假/旅游/山水/公园/海边/城市天际线等无关画面；禁止幼稚卡通。
5) 色调：现代、清爽、积极，突出主题。`
}

/**
 * AI排版处理 - 闻思修AI手记风格（赭黄色，与HR进化派一致）
 */
async function formatArticleForWechatPGZ(params: {
  title: string
  content: string
}): Promise<{
  title: string
  html_content: string
  prompt: string
}> {
  const { title, content } = params

  const prompt = `你是一个专门为微信公众号文章排版AI助手。你的唯一任务是接收用户输入并排版，并输出一个包含标题、HTML内容和图像提示词的JSON对象。你的所有输出，都必须严格遵循指定的JSON格式，绝不能包含任何额外的文字、解释或代码标记。

现在，请扮演一位顶级的微信公众号新媒体主编和专业的视觉艺术总监，根据用户提供的[文章内容]，完成以下任务，并将结果填入JSON对象的相应字段中：

1.  **主标题**：文章开头的主标题就使用推送过来的标题即可。
2.  **排版**：
    * **格式排版**：**在不删减任何已生成内容的前提下**，你必须对全文进行精细的HTML排版，严格遵循下方的【排版风格指南】。

3.  **生成图像提示词**：严格遵循下方的【图像提示词生成指南】，为文章创作一个风格专业、高度契合文章主题的AI绘画图像提示词。

4. 不要自主发挥，给你什么文章，只需要排版就行。

---
### 【排版风格指南】

你必须将以下所有规则视为铁律，严格执行，以打造专业、清晰、高度可读的移动端阅读体验：

1.  **整体容器**:
    style="max-width: 680px; margin: 20px auto; padding: 30px; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing: 0.5px; line-height: 1.8;"

2.  **小标题 (H2)**:
    * **小标题前面绝不能出现任何表情符号。**
    * **【赭黄色】** 小标题的CSS样式必须为:
    style="font-size: 18px; font-weight: bold; color: #C08B40; text-align: center; margin-top: 45px; margin-bottom: 25px;"

3.  **段落 (P)**:
    * **(短段落铁律)** **每个段落严格限制在 1-2 句话。严禁出现任何超过3句话的长段落。**
    * style="margin-bottom: 20px; font-size: 15px;"

4.  **重点强调 (Strong)**:
    * **【赭黄色】** 必须为 <strong> 标签添加内联样式: style="color: #C08B40; font-weight: 600;"

5.  **引用/要点总结 (Blockquote)**:
    * **【新增样式】** 当需要引用名言或总结要点时，必须使用 <blockquote> 标签。
    * **【赭黄色】** <blockquote> 的CSS样式必须为:
    style="border-left: 4px solid #C08B40; background-color: #F8F8F8; padding: 15px 20px; margin: 30px 0; color: #555555; font-style: italic;"

---
### 【图像提示词生成指南 - 日系动画电影风格】

1.  **核心风格**: 日系动画电影风格。它的画面干净、明亮，线条简洁，色彩柔和，给人一种温馨治愈的感觉。
2. **故事感和叙事性**：如果文章内容与人物、动物有关，画面中可以有人物、动物、对应场景等元素，画面应富有强烈的动感和故事张力。采用微距摄影风格，电影感光效，画面有深度。
3.  对比和反差： 常常通过室内外的场景、人物的动态与静态等形成对比，增加画面的层次感和故事性。
4. 积极向上的情感：画面整体要传达出乐观、希望的积极情绪。
5.  **负面指令**: 绝对禁止生成任何诡异、阴暗、恐怖、幼稚、卡通的元素
6.  提示词应该基于文章内容生成，不要看起来没有关联。

---
[文章内容开始]
标题: ${title}

${content}
[文章内容结束]

请直接返回JSON格式的结果，格式如下：
{
  "title": "文章标题",
  "html_content": "<div>排版好的HTML内容</div>",
  "prompt": "图像生成提示词"
}`

  try {
    const response = await aiClient.chat([
      {
        role: 'user',
        content: prompt,
      },
    ], {
      temperature: 0.7,
      maxTokens: 4000,
    })

    // 尝试解析 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI返回格式不是JSON')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      title: parsed.title || title,
      html_content: parsed.html_content || content,
      prompt: parsed.prompt || '日系动画电影风格，温馨治愈的场景，干净明亮的画面',
    }

  } catch (error) {
    console.error('❌ AI排版失败:', error)
    // 降级处理：使用简单的Markdown转HTML
    return {
      title,
      html_content: markdownToSimpleHtmlPGZ(content),
      prompt: '日系动画电影风格，温馨治愈的场景，干净明亮的画面',
    }
  }
}

/**
 * 简单的Markdown转HTML（降级方案 - 闻思修AI手记风格）
 */
function markdownToSimpleHtmlPGZ(markdown: string): string {
  let html = markdown
    .replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0;">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size: 18px; font-weight: bold; color: #C08B40; text-align: center; margin-top: 45px; margin-bottom: 25px;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="font-size: 16px; font-weight: bold; margin: 15px 0;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #C08B40; font-weight: 600;">$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin-bottom: 20px; font-size: 15px;">')
    .replace(/^(.+)$/gm, '<p style="margin-bottom: 20px; font-size: 15px;">$1</p>')

  return `<div style="max-width: 680px; margin: 20px auto; padding: 30px; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing: 0.5px; line-height: 1.8;">${html}</div>`
}

/**
 * 获取闻思修AI手记公众号 Access Token
 */
async function getPGZAccessToken(): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${PGZ_APPID}&secret=${PGZ_SECRET}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    throw new Error(`获取access_token失败: ${data.errmsg}`)
  }

  return data.access_token
}

/**
 * 上传封面图片到闻思修AI手记公众号
 */
async function uploadThumbToPGZ(imageBuffer: Buffer): Promise<string> {
  const accessToken = await getPGZAccessToken()

  const formData = new FormData()
  const blob = new Blob([imageBuffer], { type: 'image/png' })
  formData.append('media', blob, 'cover.png')

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=thumb`,
    {
      method: 'POST',
      body: formData,
    }
  )

  const data = await response.json()

  if (data.errcode) {
    throw new Error(`上传封面失败: ${data.errmsg}`)
  }

  return data.media_id
}

/**
 * 创建草稿到闻思修AI手记公众号
 */
async function addDraftToPGZ(params: {
  title: string
  content: string
  thumbMediaId: string
  author: string
}): Promise<string> {
  const accessToken = await getPGZAccessToken()

  const { title, content, thumbMediaId, author } = params

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articles: [
          {
            title,
            author,
            digest: '',
            content,
            content_source_url: '',
            thumb_media_id: thumbMediaId,
            need_open_comment: 1,
            only_fans_can_comment: 0,
            show_cover_pic: 1,
          },
        ],
      }),
    }
  )

  const data = await response.json()

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`创建草稿失败: ${data.errmsg}`)
  }

  return data.media_id
}
