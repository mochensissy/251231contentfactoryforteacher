
// 微信公众号 API 工具类
// 用于直接调用微信官方接口，不依赖 webhook

export class WechatApiClient {
    private appId: string;
    private appSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(appId: string, appSecret: string) {
        this.appId = appId;
        this.appSecret = appSecret;
    }

    /**
     * 获取 Access Token
     * 优先使用缓存的 Token，如果过期或不存在则重新请求
     */
    async getAccessToken(): Promise<string> {
        const now = Date.now();
        // 提前 5 分钟刷新
        if (this.accessToken && this.tokenExpiresAt > now + 300000) {
            return this.accessToken;
        }

        try {
            const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.errcode) {
                throw new Error(`获取 Access Token 失败: ${data.errmsg} (${data.errcode})`);
            }

            this.accessToken = data.access_token;
            // expires_in 单位是秒，转换为毫秒
            this.tokenExpiresAt = now + (data.expires_in * 1000);

            return this.accessToken!;
        } catch (error) {
            console.error('WeChat API Error:', error);
            throw error;
        }
    }

    /**
     * 上传永久素材（主要用于封面图）
     * 注意：微信要求上传 multipart/form-data 格式
     */
    async uploadMaterial(imageUrl: string, type: string = 'image'): Promise<string> {
        const token = await this.getAccessToken();
        const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=${type}`;

        try {
            // 1. 下载图片
            const imageRes = await fetch(imageUrl);
            if (!imageRes.ok) throw new Error('无法下载图片资源');
            const blob = await imageRes.blob();

            // 2. 构造 FormData
            const contentType = imageRes.headers.get('content-type');
            console.log('🖼️ 下载图片信息:', { url: imageUrl, contentType });

            let extension = 'png'; // 默认使用 png，因为阿里云通常生成 png
            if (contentType) {
                if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
                if (contentType.includes('gif')) extension = 'gif';
                // if (contentType.includes('png')) extension = 'png'; // default
            } else {
                console.warn('⚠️ 图片 Content-Type 缺失，默认使用 png');
            }


            const formData = new FormData();
            // 需要给 blob 一个文件名，否则微信 API 可能会报错
            formData.append('media', blob, `cover.${extension}`);

            // 3. 上传到微信
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.errcode) {
                throw new Error(`上传素材失败: ${data.errmsg} (${data.errcode})`);
            }

            // 返回 media_id
            return data.media_id;
        } catch (error) {
            console.error('WeChat Upload Error:', error);
            throw error;
        }
    }

    /**
     * 新建草稿
     */
    async addDraft(article: {
        title: string;
        content: string;
        thumb_media_id: string;
        author?: string;
        digest?: string;
        content_source_url?: string;
    }) {
        const token = await this.getAccessToken();
        const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;

        const payload = {
            articles: [
                {
                    title: article.title,
                    author: article.author || '',
                    digest: article.digest || '',
                    content: article.content,
                    content_source_url: article.content_source_url || '',
                    thumb_media_id: article.thumb_media_id,
                    need_open_comment: 1,
                    only_fans_can_comment: 0
                }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.errcode) {
                throw new Error(`新建草稿失败: ${data.errmsg} (${data.errcode})`);
            }

            return data;
        } catch (error) {
            console.error('WeChat Draft Error:', error);
            throw error;
        }
    }
}
