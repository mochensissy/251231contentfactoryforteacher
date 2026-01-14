// API 配置管理 - 保存和读取 localStorage 中的 API 配置

export interface WechatArticleApiConfig {
    apiUrl: string
    apiKey: string
}

export interface AiApiConfig {
    apiUrl: string
    apiKey: string
    model: string
}

const WECHAT_ARTICLE_API_KEY = 'wechat-article-api-config'
const AI_API_KEY = 'ai-api-config'

// 保存公众号文章 API 配置
export function saveWechatArticleApiConfig(config: WechatArticleApiConfig): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(WECHAT_ARTICLE_API_KEY, JSON.stringify(config))
    } catch (e) {
        console.error('保存公众号文章API配置失败:', e)
    }
}

// 获取公众号文章 API 配置
export function getWechatArticleApiConfig(): WechatArticleApiConfig {
    if (typeof window === 'undefined') {
        return { apiUrl: '', apiKey: '' }
    }
    try {
        const saved = localStorage.getItem(WECHAT_ARTICLE_API_KEY)
        if (saved) {
            return JSON.parse(saved)
        }
    } catch (e) {
        console.error('读取公众号文章API配置失败:', e)
    }
    return { apiUrl: '', apiKey: '' }
}

// 保存 AI API 配置
export function saveAiApiConfig(config: AiApiConfig): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(AI_API_KEY, JSON.stringify(config))
    } catch (e) {
        console.error('保存AI API配置失败:', e)
    }
}

// 获取 AI API 配置
export function getAiApiConfig(): AiApiConfig {
    if (typeof window === 'undefined') {
        return { apiUrl: '', apiKey: '', model: '' }
    }
    try {
        const saved = localStorage.getItem(AI_API_KEY)
        if (saved) {
            return JSON.parse(saved)
        }
    } catch (e) {
        console.error('读取AI API配置失败:', e)
    }
    return { apiUrl: '', apiKey: '', model: '' }
}

// 分析默认设置接口
export interface AnalysisDefaults {
    analysisCount: number
    insightsCount: number
}

const ANALYSIS_DEFAULTS_KEY = 'analysis-defaults'

// 获取分析默认设置
export function getAnalysisDefaults(): AnalysisDefaults {
    if (typeof window === 'undefined') {
        return { analysisCount: 20, insightsCount: 5 }
    }
    try {
        const saved = localStorage.getItem(ANALYSIS_DEFAULTS_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            return {
                analysisCount: parseInt(parsed.analysisCount) || 20,
                insightsCount: parseInt(parsed.insightsCount) || 5,
            }
        }
    } catch (e) {
        console.error('读取分析默认设置失败:', e)
    }
    return { analysisCount: 20, insightsCount: 5 }
}

// 提示词设置接口
export interface PromptSettings {
    articlePrompt: string      // 文章生成提示词
    formattingPrompt: string   // 排版提示词
    coverPrompt: string        // 封面图提示词
    illustrationPrompt: string // 配图提示词
    videoScriptPrompt: string  // 视频脚本提示词
    // 选择项
    selectedPlatform: string   // 选择的平台 (wechat, xiaohongshu, twitter)
    selectedWritingTone: string // 选择的文风 (professional, casual, storytelling, tutorial)
    selectedFormattingStyle: string // 选择的排版风格
}

const PROMPT_SETTINGS_KEY = 'prompt-settings'

// 获取提示词设置
export function getPromptSettings(): PromptSettings {
    const defaults: PromptSettings = {
        articlePrompt: '',
        formattingPrompt: '',
        coverPrompt: '',
        illustrationPrompt: '',
        videoScriptPrompt: '',
        selectedPlatform: 'wechat',
        selectedWritingTone: 'professional',
        selectedFormattingStyle: 'ochre',
    }

    if (typeof window === 'undefined') {
        return defaults
    }

    try {
        const saved = localStorage.getItem(PROMPT_SETTINGS_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            return { ...defaults, ...parsed }
        }
    } catch (e) {
        console.error('读取提示词设置失败:', e)
    }
    return defaults
}

// 保存提示词设置
export function savePromptSettings(settings: Partial<PromptSettings>): void {
    if (typeof window === 'undefined') return
    try {
        const current = getPromptSettings()
        const updated = { ...current, ...settings }
        localStorage.setItem(PROMPT_SETTINGS_KEY, JSON.stringify(updated))
    } catch (e) {
        console.error('保存提示词设置失败:', e)
    }
}

// 图片生成API配置接口
export interface ImageApiConfig {
    siliconflow: {
        apiUrl: string
        apiKey: string
        model: string
    }
    dashscope: {
        apiUrl: string
        apiKey: string
    }
}

const IMAGE_API_KEY = 'image-api-config'

// 获取图片生成API配置
export function getImageApiConfig(): ImageApiConfig {
    const defaults: ImageApiConfig = {
        siliconflow: { apiUrl: '', apiKey: '', model: '' },
        dashscope: { apiUrl: '', apiKey: '' },
    }

    if (typeof window === 'undefined') {
        return defaults
    }

    try {
        const saved = localStorage.getItem(IMAGE_API_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            return { ...defaults, ...parsed }
        }
    } catch (e) {
        console.error('读取图片API配置失败:', e)
    }
    return defaults
}

// 保存图片生成API配置
export function saveImageApiConfig(config: Partial<ImageApiConfig>): void {
    if (typeof window === 'undefined') return
    try {
        const current = getImageApiConfig()
        const updated = { ...current, ...config }
        localStorage.setItem(IMAGE_API_KEY, JSON.stringify(updated))
    } catch (e) {
        console.error('保存图片API配置失败:', e)
    }
}

// 小红书发布API配置接口
export interface XiaohongshuApiConfig {
    apiUrl: string
    apiKey: string
}

const XIAOHONGSHU_API_KEY = 'xiaohongshu-api-config'

// 获取小红书发布API配置
export function getXiaohongshuApiConfig(): XiaohongshuApiConfig {
    const defaults: XiaohongshuApiConfig = {
        apiUrl: 'https://note.limyai.com/api/openapi/publish_note',
        apiKey: '',
    }

    if (typeof window === 'undefined') {
        return defaults
    }

    try {
        const saved = localStorage.getItem(XIAOHONGSHU_API_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            return { ...defaults, ...parsed }
        }
    } catch (e) {
        console.error('读取小红书API配置失败:', e)
    }
    return defaults
}

// 保存小红书发布API配置
export function saveXiaohongshuApiConfig(config: Partial<XiaohongshuApiConfig>): void {
    if (typeof window === 'undefined') return
    try {
        const current = getXiaohongshuApiConfig()
        const updated = { ...current, ...config }
        localStorage.setItem(XIAOHONGSHU_API_KEY, JSON.stringify(updated))
    } catch (e) {
        console.error('保存小红书API配置失败:', e)
    }
}
