/**
 * 阿里云通义万相 - 图片生成服务
 * 基于文本生成图片
 */

interface ImageGenerationTask {
  task_id: string
  task_status: string
}

interface ImageGenerationResult {
  task_id: string
  task_status: 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'RUNNING'
  results?: Array<{
    url: string
  }>
  message?: string
}

export class DashScopeImageClient {
  private apiKey: string
  private apiUrl: string

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || ''
    this.apiUrl = process.env.DASHSCOPE_API_URL || ''

    if (!this.apiKey) {
      console.warn('⚠️ DASHSCOPE_API_KEY未设置')
    }
  }

  /**
   * 提交图片生成任务（异步）
   */
  async submitImageTask(prompt: string): Promise<string> {
    console.log('🎨 提交图片生成任务...')
    console.log('- Prompt:', prompt.substring(0, 100) + '...')

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-DashScope-Async': 'enable', // 开启异步模式
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: {
            prompt,
          },
          parameters: {
            size: '1024*1024',
            n: 1,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 提交任务失败:', response.status, errorText)
        throw new Error(`提交图片生成任务失败: ${response.status}`)
      }

      const data: { output: ImageGenerationTask } = await response.json()

      if (!data.output || !data.output.task_id) {
        throw new Error('任务响应格式错误')
      }

      console.log('✅ 任务提交成功, task_id:', data.output.task_id)
      return data.output.task_id
    } catch (error) {
      console.error('❌ 提交图片生成任务失败:', error)
      throw new Error('提交图片生成任务失败')
    }
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<ImageGenerationResult> {
    try {
      const response = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`查询任务失败: ${response.status}`)
      }

      const data: { output: ImageGenerationResult } = await response.json()
      return data.output
    } catch (error) {
      console.error('❌ 查询任务状态失败:', error)
      throw new Error('查询任务状态失败')
    }
  }

  /**
   * 等待任务完成并获取图片URL
   */
  async waitForImageGeneration(
    taskId: string,
    maxWaitTime: number = 60000, // 默认最多等待60秒
    pollInterval: number = 3000 // 每3秒查询一次
  ): Promise<string> {
    console.log('⏳ 等待图片生成完成...')

    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getTaskStatus(taskId)

      console.log('- 任务状态:', result.task_status)

      if (result.task_status === 'SUCCEEDED') {
        if (!result.results || result.results.length === 0) {
          throw new Error('生成结果为空')
        }

        const imageUrl = result.results[0].url
        console.log('✅ 图片生成成功:', imageUrl)
        return imageUrl
      }

      if (result.task_status === 'FAILED') {
        throw new Error(`图片生成失败: ${result.message || '未知错误'}`)
      }

      // 等待后继续查询
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error('图片生成超时')
  }

  /**
   * 下载图片为Buffer
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    console.log('📥 下载图片...')

    try {
      const response = await fetch(imageUrl)

      if (!response.ok) {
        throw new Error(`下载图片失败: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log('✅ 图片下载完成, 大小:', (buffer.length / 1024).toFixed(2), 'KB')
      return buffer
    } catch (error) {
      console.error('❌ 下载图片失败:', error)
      throw new Error('下载图片失败')
    }
  }

  /**
   * 一键生成并下载图片
   */
  async generateAndDownload(prompt: string): Promise<Buffer> {
    // 1. 提交任务
    const taskId = await this.submitImageTask(prompt)

    // 2. 等待完成
    const imageUrl = await this.waitForImageGeneration(taskId)

    // 3. 下载图片
    const imageBuffer = await this.downloadImage(imageUrl)

    return imageBuffer
  }
}

// 导出单例
export const dashScopeClient = new DashScopeImageClient()
