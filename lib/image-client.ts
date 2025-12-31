/**
 * Silicon Flow Image Generation Client
 * 封装硅基流动可灵模型的图片生成API
 */

interface ImageGenerationResponse {
  images: Array<{
    url: string
  }>
  timings?: {
    inference: number
  }
  seed?: number
}

export class ImageGenerationClient {
  private apiUrl: string
  private apiKey: string
  private model: string

  constructor() {
    this.apiUrl = process.env.SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/images/generations'
    this.apiKey = process.env.SILICONFLOW_API_KEY || ''
    this.model = process.env.SILICONFLOW_MODEL || 'Kwai-Kolors/Kolors'

    if (!this.apiKey) {
      console.warn('⚠️ SILICONFLOW_API_KEY not set in environment variables')
    }
  }

  /**
   * 生成单张图片
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      console.log(`🎨 开始生成图片: ${prompt.slice(0, 50)}...`)

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('硅基流动 API Error:', response.status, errorText)
        throw new Error(`图片生成失败: ${response.status} ${errorText}`)
      }

      const data: ImageGenerationResponse = await response.json()

      if (!data.images || data.images.length === 0) {
        throw new Error('API 返回的图片数据为空')
      }

      const imageUrl = data.images[0].url

      console.log(`✅ 图片生成成功 (耗时: ${data.timings?.inference || '?'}ms)`)

      return imageUrl

    } catch (error) {
      console.error('❌ 生成图片失败:', error)
      throw error
    }
  }

  /**
   * 批量生成图片（支持进度回调）
   */
  async generateImages(
    prompts: string[],
    onProgress?: (current: number, total: number, imageUrl: string) => void
  ): Promise<string[]> {
    const images: string[] = []
    const total = prompts.length

    for (let i = 0; i < prompts.length; i++) {
      try {
        const imageUrl = await this.generateImage(prompts[i])
        images.push(imageUrl)

        // 调用进度回调
        if (onProgress) {
          onProgress(i + 1, total, imageUrl)
        }

        // 添加延迟避免API限流（可选）
        if (i < prompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (error) {
        console.error(`❌ 生成第 ${i + 1} 张图片失败:`, error)
        // 失败时使用占位图
        const placeholderUrl = `https://placehold.co/800x400/EEE/999?text=Image+${i + 1}`
        images.push(placeholderUrl)

        if (onProgress) {
          onProgress(i + 1, total, placeholderUrl)
        }
      }
    }

    console.log(`✅ 批量生成完成: ${images.length}/${total} 张图片`)

    return images
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = '一朵美丽的红色玫瑰花'
      await this.generateImage(testPrompt)
      return true
    } catch (error) {
      console.error('❌ 硅基流动 API 连接测试失败:', error)
      return false
    }
  }
}

// 导出单例
export const imageClient = new ImageGenerationClient()
