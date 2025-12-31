/**
 * 微信公众号客户端
 * 封装微信公众号API调用逻辑
 */

interface AccessTokenResponse {
  access_token: string
  expires_in: number
}

interface UploadMediaResponse {
  media_id: string
  url: string
}

interface AddDraftResponse {
  media_id: string
}

export class WeChatClient {
  private appId: string
  private appSecret: string
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor() {
    this.appId = process.env.WECHAT_APPID || ''
    this.appSecret = process.env.WECHAT_SECRET || ''

    if (!this.appId || !this.appSecret) {
      console.warn('⚠️ 微信公众号配置未设置')
    }
  }

  /**
   * 获取AccessToken
   */
  private async getAccessToken(): Promise<string> {
    // 检查token是否有效
    const now = Date.now()
    if (this.accessToken && this.tokenExpiresAt > now + 300000) {
      // 提前5分钟刷新
      return this.accessToken
    }

    console.log('🔑 获取微信AccessToken...')

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
      )

      if (!response.ok) {
        throw new Error(`获取AccessToken失败: ${response.status}`)
      }

      const data: AccessTokenResponse = await response.json()

      if (!data.access_token) {
        throw new Error('AccessToken响应格式错误')
      }

      this.accessToken = data.access_token
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000

      console.log('✅ AccessToken获取成功')
      return this.accessToken
    } catch (error) {
      console.error('❌ 获取AccessToken失败:', error)
      throw new Error('获取微信AccessToken失败')
    }
  }

  /**
   * 上传图片素材
   */
  async uploadImage(imageBuffer: Buffer): Promise<string> {
    console.log('📤 上传图片到微信素材库...')

    const accessToken = await this.getAccessToken()

    try {
      const formData = new FormData()
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' })
      formData.append('media', blob, 'cover.jpg')

      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`上传图片失败: ${response.status}`)
      }

      const data: UploadMediaResponse = await response.json()

      if (!data.url) {
        throw new Error('上传图片响应格式错误')
      }

      console.log('✅ 图片上传成功:', data.url)
      return data.url
    } catch (error) {
      console.error('❌ 上传图片失败:', error)
      throw new Error('上传图片到微信失败')
    }
  }

  /**
   * 上传图文消息封面
   */
  async uploadThumb(imageBuffer: Buffer): Promise<string> {
    console.log('📤 上传封面到微信素材库...')

    const accessToken = await this.getAccessToken()

    try {
      const formData = new FormData()
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' })
      formData.append('media', blob, 'thumb.jpg')

      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=thumb`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`上传封面失败: ${response.status}`)
      }

      const data: UploadMediaResponse = await response.json()

      if (!data.media_id) {
        throw new Error('上传封面响应格式错误')
      }

      console.log('✅ 封面上传成功, media_id:', data.media_id)
      return data.media_id
    } catch (error) {
      console.error('❌ 上传封面失败:', error)
      throw new Error('上传封面到微信失败')
    }
  }

  /**
   * 新增草稿
   */
  async addDraft(params: {
    title: string
    content: string
    thumbMediaId: string
    author?: string
  }): Promise<string> {
    console.log('📝 创建微信公众号草稿...')

    const accessToken = await this.getAccessToken()
    const { title, content, thumbMediaId, author = '闻思修AI手记' } = params

    try {
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
                digest: '', // 摘要，留空则自动生成
                content,
                content_source_url: '', // 原文链接
                thumb_media_id: thumbMediaId,
                need_open_comment: 1, // 开启留言
                only_fans_can_comment: 0, // 所有人可留言
                show_cover_pic: 1, // 显示封面
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`创建草稿失败: ${response.status}`)
      }

      const data: AddDraftResponse = await response.json()

      if (!data.media_id) {
        throw new Error('创建草稿响应格式错误')
      }

      console.log('✅ 草稿创建成功, media_id:', data.media_id)
      return data.media_id
    } catch (error) {
      console.error('❌ 创建草稿失败:', error)
      throw new Error('创建微信公众号草稿失败')
    }
  }
}

// 导出单例
export const wechatClient = new WeChatClient()
