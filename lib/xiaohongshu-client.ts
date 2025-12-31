/**
 * 小红书发布 API 客户端
 * 封装小红书笔记发布接口调用逻辑
 */

interface PublishNoteParams {
  title: string
  content: string
  coverImage: string
  images?: string[]
  tags?: string[]
  noteId?: string
}

interface PublishNoteResponse {
  success: boolean
  data?: {
    id: string
    note_id: string
    title: string
    status_id: number
    publish_url: string
    xiaohongshu_qr_image_url: string
    cover_image: string
    images: string[]
    tags: string[]
    created_at: string
  }
  error?: string
}

export class XiaohongshuClient {
  private apiUrl: string
  private apiKey: string

  constructor() {
    this.apiUrl = process.env.XIAOHONGSHU_API_URL || ''
    this.apiKey = process.env.XIAOHONGSHU_API_KEY || ''

    if (!this.apiUrl || !this.apiKey) {
      console.warn('⚠️ 小红书 API 配置未设置')
    }
  }

  /**
   * 发布笔记到小红书
   */
  async publishNote(params: PublishNoteParams): Promise<PublishNoteResponse> {
    const { title, content, coverImage, images = [], tags = [], noteId } = params

    // 验证必填参数
    if (!title && !content) {
      throw new Error('标题和内容不能同时为空')
    }

    if (!coverImage) {
      throw new Error('封面图片不能为空')
    }

    console.log('📤 发布笔记到小红书...')
    console.log(`- 标题: ${title}`)
    console.log(`- 内容长度: ${content.length} 字符`)
    console.log(`- 封面: ${coverImage}`)
    console.log(`- 配图数量: ${images.length}`)
    console.log(`- 标签: ${tags.join(', ')}`)

    try {
      const requestBody = {
        title,
        content,
        coverImage,
        ...(images.length > 0 && { images }),
        ...(tags.length > 0 && { tags }),
        ...(noteId && { noteId }),
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()

      // 处理错误响应
      if (!response.ok) {
        const errorMessage = this.getErrorMessage(response.status, responseData)
        console.error('❌ 小红书 API 返回错误:', errorMessage)
        throw new Error(errorMessage)
      }

      // 检查响应格式
      if (!responseData.success || !responseData.data) {
        throw new Error('小红书 API 响应格式错误')
      }

      console.log('✅ 笔记发布成功')
      console.log(`- 笔记ID: ${responseData.data.note_id}`)
      console.log(`- 发布链接: ${responseData.data.publish_url}`)
      console.log(`- 二维码URL: ${responseData.data.xiaohongshu_qr_image_url}`)

      return {
        success: true,
        data: responseData.data,
      }
    } catch (error) {
      console.error('❌ 发布笔记失败:', error)

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: false,
        error: '发布笔记失败：未知错误',
      }
    }
  }

  /**
   * 根据 HTTP 状态码和响应数据获取友好的错误消息
   */
  private getErrorMessage(status: number, data: any): string {
    // 根据文档中的错误码说明
    switch (status) {
      case 401:
        return 'API密钥验证失败，请检查配置'
      case 400:
        if (data.error === 'VALIDATION_ERROR') {
          return '参数验证失败：请检查标题、内容和封面图是否完整'
        }
        return `请求参数错误：${data.error || '未知错误'}`
      case 409:
        return '笔记ID已存在，请更换笔记ID或不传'
      case 500:
        return '服务器内部错误，请稍后重试'
      default:
        return `发布失败 (${status})：${data.error || data.message || '未知错误'}`
    }
  }

  /**
   * 验证配置是否完整
   */
  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey)
  }
}

// 导出单例
export const xiaohongshuClient = new XiaohongshuClient()
