/**
 * OpenRouter AI Client
 * 封装 OpenRouter API 调用逻辑，支持 OpenAI 兼容接口
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
}

interface OpenRouterResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class AIClient {
  private apiUrl: string
  private apiKey: string
  private model: string

  constructor(config?: { apiUrl?: string; apiKey?: string; model?: string }) {
    // 优先使用传入配置，其次环境变量，最后默认值
    this.apiUrl = config?.apiUrl || process.env.OPENROUTER_API_URL || process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
    this.apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || ''
    this.model = config?.model || process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'google/gemini-2.0-flash-thinking-exp:free'

    if (!this.apiKey) {
      console.warn('⚠️ AI API Key not configured')
    }
  }

  /**
   * 通用聊天接口
   */
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    try {
      // 添加60秒超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://content-factory-agent.local',
            'X-Title': 'Content Factory Agent',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4000,
            top_p: options.topP ?? 1,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('OpenRouter API Error:', response.status, errorText)
          throw new Error(`AI API 调用失败: ${response.status} ${errorText}`)
        }

        const data: OpenRouterResponse = await response.json()

        if (!data.choices || data.choices.length === 0) {
          throw new Error('AI API 返回数据格式错误')
        }

        const content = data.choices[0].message.content

        // 记录 token 使用情况
        if (data.usage) {
          console.log('📊 Token 使用:', {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens,
          })
        }

        return content

      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('AI API 请求超时（60秒）')
        }
        throw fetchError
      }

    } catch (error) {
      console.error('AI Client Error:', error)
      throw error
    }
  }

  /**
   * 提取文章摘要和结构化信息
   */
  async extractArticleSummary(article: {
    title: string
    content: string
    url: string
    wxName: string
  }): Promise<{
    title: string
    url: string
    summary: string
    keyPoints: string[]
    keywords: string[]
    highlights: string[]
    contentType: string
    targetAudience: string
    writeStyle: string
  }> {
    // 限制内容长度（前 3000 字）
    const truncatedContent = article.content
      .replace(/<[^>]*>/g, '') // 移除 HTML 标签
      .slice(0, 3000)

    const prompt = `你是一位专业的内容分析师。请仔细分析以下公众号文章，提取结构化信息。

文章标题：${article.title}
公众号：${article.wxName}
文章内容：
${truncatedContent}

请分析这篇文章，并以 JSON 格式输出以下信息：

{
  "summary": "文章核心内容的简洁摘要，200-300字",
  "keyPoints": ["文章的关键观点1", "关键观点2", "关键观点3"],
  "keywords": ["核心关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "highlights": ["文章亮点1（如独特视角、数据支撑等）", "亮点2"],
  "contentType": "内容类型（如：教程、案例分析、观点评论、经验分享、行业洞察、产品测评等）",
  "targetAudience": "目标受众群体（如：互联网从业者、内容创作者、产品经理等）",
  "writeStyle": "写作风格（如：专业严谨、轻松幽默、故事叙事、数据驱动等）"
}

注意：
1. 只输出 JSON，不要有其他内容
2. 确保 JSON 格式正确，可以被解析
3. 所有字段都必须填写
4. keyPoints 应该是最核心的 3-5 个观点
5. keywords 应该是文章中最重要的 5-8 个关键词
6. highlights 应该突出文章的独特之处或亮点`

    try {
      const response = await this.chat([
        {
          role: 'user',
          content: prompt,
        },
      ], {
        temperature: 0.3, // 较低温度，保证输出稳定
        maxTokens: 1500,
      })

      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI 返回格式不是 JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        title: article.title,
        url: article.url,
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        contentType: parsed.contentType || '未知',
        targetAudience: parsed.targetAudience || '未知',
        writeStyle: parsed.writeStyle || '未知',
      }
    } catch (error) {
      console.error(`❌ 提取文章摘要失败 [${article.title}]:`, error)
      // 返回基础信息，避免整个流程失败
      return {
        title: article.title,
        url: article.url,
        summary: '文章摘要提取失败',
        keyPoints: [],
        keywords: [],
        highlights: [],
        contentType: '未知',
        targetAudience: '未知',
        writeStyle: '未知',
      }
    }
  }

  /**
   * 基于文章摘要生成深度选题洞察
   */
  async generateInsights(
    keyword: string,
    summaries: Array<{
      title: string
      url: string
      summary: string
      keyPoints: string[]
      keywords: string[]
      highlights: string[]
      contentType: string
      targetAudience: string
      writeStyle: string
    }>,
    wordCloud: Array<{ word: string; weight: number }>,
    insightsCount: number = 5 // 新增：可配置洞察数量
  ): Promise<Array<{
    title: string
    category: string
    description: string
    targetAudience: string
    contentAngle: string
    suggestedOutline: string[]
    referenceArticles: string[]
    confidence: number
    reasons: string[]
  }>> {
    const summariesText = summaries.map((s, i) => `
文章 ${i + 1}：${s.title}
- 内容类型：${s.contentType}
- 目标受众：${s.targetAudience}
- 写作风格：${s.writeStyle}
- 摘要：${s.summary}
- 关键观点：${s.keyPoints.join('；')}
- 核心关键词：${s.keywords.join('、')}
- 内容亮点：${s.highlights.join('；')}
`).join('\n---\n')

    const topWords = wordCloud.slice(0, 10).map(w => w.word).join('、')

    const prompt = `你是一位资深的内容策划专家和选题分析师。基于以下数据，为内容创作者生成 ${insightsCount} 条深度、可操作的选题洞察。

关键词：${keyword}

高频词汇（来自所有文章分析）：
${topWords}

热门文章分析（TOP 表现文章）：
${summariesText}

请基于以上数据，生成 ${insightsCount} 条高质量的选题洞察建议。每条洞察应该：
1. 有明确的选题方向和切入角度
2. 提供具体的内容建议和大纲
3. 说明为什么这个选题有价值（数据支撑）
4. 明确目标受众
5. 给出可操作的建议

以 JSON 数组格式输出，每条洞察包含：

[
  {
    "title": "洞察标题（有吸引力，15字以内）",
    "category": "选题分类（如：趋势分析、痛点解决、方法论、案例研究、工具推荐等）",
    "description": "详细描述，包含：(1)为什么这个选题值得做 (2)目标读者的痛点 (3)内容应该如何呈现 (4)预期效果。300-500字",
    "targetAudience": "目标受众（具体人群画像）",
    "contentAngle": "内容切入角度（如何让内容有独特性）",
    "suggestedOutline": ["建议大纲要点1", "要点2", "要点3", "要点4"],
    "referenceArticles": ["参考文章标题1", "参考文章标题2"],
    "confidence": 85,
    "reasons": ["推荐理由1（基于数据）", "推荐理由2（基于趋势）", "推荐理由3（基于受众需求）"]
  },
  ...共${insightsCount}条
]

要求：
1. 只输出 JSON 数组，不要有其他内容
2. 确保 JSON 格式正确
3. ${insightsCount} 条洞察应该覆盖不同的角度和分类
4. confidence 是 0-100 的数字，表示这个洞察的置信度
5. reasons 应该基于实际数据分析，不要泛泛而谈
6. suggestedOutline 应该是 3-5 个具体的内容要点
7. 每条洞察应该有明显的差异化`

    try {
      const response = await this.chat([
        {
          role: 'user',
          content: prompt,
        },
      ], {
        temperature: 0.7,
        maxTokens: 4000,
      })

      // 尝试解析 JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('AI 返回格式不是 JSON 数组')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI 返回的洞察数量为 0')
      }

      // 确保至少有 5 条洞察
      const insights = parsed.slice(0, 5)

      // 验证数据格式
      return insights.map((insight, index) => ({
        title: insight.title || `选题洞察 ${index + 1}`,
        category: insight.category || '其他',
        description: insight.description || '',
        targetAudience: insight.targetAudience || '未指定',
        contentAngle: insight.contentAngle || '',
        suggestedOutline: Array.isArray(insight.suggestedOutline) ? insight.suggestedOutline : [],
        referenceArticles: Array.isArray(insight.referenceArticles) ? insight.referenceArticles : [],
        confidence: typeof insight.confidence === 'number' ? insight.confidence : 50,
        reasons: Array.isArray(insight.reasons) ? insight.reasons : [],
      }))

    } catch (error) {
      console.error('❌ 生成洞察失败:', error)
      throw new Error('生成选题洞察失败，请重试')
    }
  }

  /**
   * 生成文章内容
   */
  async generateArticle(params: {
    topic: string
    description?: string
    outline?: string[]
    wordCount: string
    style: string
    imageCount: number
  }): Promise<{
    title: string
    content: string
    summary: string
  }> {
    const { topic, description, outline, wordCount, style, imageCount } = params

    // 构建Prompt
    let prompt = `你是一位专业的内容创作者。请根据以下要求创作一篇高质量的文章。

选题标题：${topic}`

    if (description) {
      prompt += `\n选题描述：${description}`
    }

    if (outline && outline.length > 0) {
      prompt += `\n\n建议大纲：\n${outline.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    }

    prompt += `\n\n写作要求：
1. 字数范围：${wordCount}字
2. 写作风格：${style}
3. 文章格式：Markdown格式
4. 需要插入 ${imageCount} 张配图占位符（使用 ![描述](IMAGE_PLACEHOLDER_X) 格式，X为序号1-${imageCount}）

文章结构要求：
- 开头：吸引人的引入，说明文章价值
- 主体：清晰的层次结构，使用二级、三级标题
- 结尾：总结要点，给出可行建议
- 配图：在合适的位置插入配图占位符

请直接输出Markdown格式的文章内容，不要有其他说明。`

    try {
      const content = await this.chat([
        {
          role: 'user',
          content: prompt,
        },
      ], {
        temperature: 0.8,
        maxTokens: 4000,
      })

      // 生成摘要
      const summaryPrompt = `请为以下文章生成一个150字以内的摘要：\n\n${content.slice(0, 1000)}`

      const summary = await this.chat([
        {
          role: 'user',
          content: summaryPrompt,
        },
      ], {
        temperature: 0.3,
        maxTokens: 300,
      })

      return {
        title: topic,
        content,
        summary: summary.trim(),
      }

    } catch (error) {
      console.error('❌ 生成文章失败:', error)
      throw new Error('生成文章失败，请重试')
    }
  }

  /**
   * 优化文章内容（多轮对话）
   */
  async optimizeArticle(params: {
    originalContent: string
    optimizationRequest: string
    conversationHistory?: ChatMessage[]
  }): Promise<{
    content: string
    explanation: string
  }> {
    const { originalContent, optimizationRequest, conversationHistory = [] } = params

    const messages: ChatMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: `这是当前的文章内容：

${originalContent}

请根据以下要求优化文章：
${optimizationRequest}

请以 JSON 格式返回：
{
  "content": "优化后的文章内容（Markdown格式）",
  "explanation": "说明你做了哪些修改和优化（100字以内）"
}`,
      },
    ]

    try {
      const response = await this.chat(messages, {
        temperature: 0.7,
        maxTokens: 4000,
      })

      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI 返回格式不是 JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        content: parsed.content || originalContent,
        explanation: parsed.explanation || '已完成优化',
      }

    } catch (error) {
      console.error('❌ 优化文章失败:', error)
      throw new Error('优化文章失败，请重试')
    }
  }

  /**
   * 根据文章内容生成配图提示词
   */
  async generateImagePrompts(params: {
    articleContent: string
    imageCount: number
  }): Promise<string[]> {
    const { articleContent, imageCount } = params

    if (imageCount === 0) {
      return []
    }

    // 限制内容长度，避免token过多
    const truncatedContent = articleContent.slice(0, 2000)

    const prompt = `你是一位专业的视觉设计师。请根据以下文章内容，为文章生成 ${imageCount} 张配图的中文提示词。

文章内容：
${truncatedContent}

要求：
1. 每张配图的提示词应该对应文章的不同部分或关键内容
2. 提示词要具体、生动，能够准确描述画面内容
3. 提示词应该使用中文，便于AI图像生成
4. 提示词长度控制在50字以内
5. 图片风格应该符合文章主题（专业、清新、科技感等）
6. 避免过于抽象的概念，要描述具体的视觉元素

请以 JSON 数组格式返回 ${imageCount} 条提示词：

["提示词1", "提示词2", "提示词3", ...]

只输出 JSON 数组，不要有其他内容。`

    try {
      const response = await this.chat([
        {
          role: 'user',
          content: prompt,
        },
      ], {
        temperature: 0.8,
        maxTokens: 800,
      })

      // 尝试解析 JSON
      const jsonMatch = response.match(/\[[\s\S]*?\]/)
      if (!jsonMatch) {
        throw new Error('AI 返回格式不是 JSON 数组')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('AI 返回的提示词数量为 0')
      }

      // 确保返回指定数量的提示词
      const prompts = parsed.slice(0, imageCount)

      // 如果不够，用通用提示词补充
      while (prompts.length < imageCount) {
        prompts.push(`与文章主题相关的配图 ${prompts.length + 1}`)
      }

      console.log(`✅ 生成了 ${prompts.length} 条图片提示词`)
      prompts.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p}`)
      })

      return prompts

    } catch (error) {
      console.error('❌ 生成图片提示词失败:', error)
      // 失败时返回通用提示词
      return Array(imageCount).fill(0).map((_, i) => `文章配图 ${i + 1}`)
    }
  }
}

// 导出单例
export const aiClient = new AIClient()
