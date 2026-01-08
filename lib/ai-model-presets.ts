/**
 * AI 模型预设配置
 * 定义 OpenRouter 上可用的主流模型及其特性
 */

export interface AIModelPreset {
    id: string           // 模型标识符（用于 API 调用）
    name: string         // 显示名称
    provider: string     // 提供商
    description: string  // 用途说明
    priceLevel: 1 | 2 | 3 | 4 | 5  // 价格等级：1=最便宜，5=最贵
    priceNote: string    // 价格说明
    recommended?: boolean // 是否推荐
    tags: string[]       // 标签（用于分类）
}

export const AI_MODEL_PRESETS: AIModelPreset[] = [
    {
        id: 'google/gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: 'Google',
        description: '性价比最高，适合简单基础文章或直接排版任务',
        priceLevel: 1,
        priceNote: '基准价格 (1x)',
        recommended: true,
        tags: ['快速', '经济', '基础任务'],
    },
    {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        provider: 'Google',
        description: '支持推理功能，适合需要逻辑分析的复杂任务',
        priceLevel: 2,
        priceNote: '约 3x 价格',
        tags: ['推理', '逻辑分析', '复杂任务'],
    },
    {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'Google',
        description: '高质量输出，适合重要文章或需要深度分析的场景',
        priceLevel: 3,
        priceNote: '约 15x 价格',
        tags: ['高质量', '深度分析', '专业内容'],
    },
    {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'Anthropic',
        description: '文字效果最好，适合需要优质文案或创意写作的场景',
        priceLevel: 5,
        priceNote: '约 30x 价格',
        recommended: true,
        tags: ['最佳文笔', '创意写作', '高端文案'],
    },
    {
        id: 'anthropic/claude-4.5-haiku',
        name: 'Claude 4.5 Haiku',
        provider: 'Anthropic',
        description: 'Claude 4.5 系列的轻量版，速度快且文笔优秀',
        priceLevel: 3,
        priceNote: '约 10x 价格',
        tags: ['快速', '高质量', '日常使用'],
    },
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        description: 'OpenAI 的轻量高效模型，综合能力均衡',
        priceLevel: 3,
        priceNote: '约 10x 价格',
        tags: ['综合', '稳定', '通用'],
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        description: 'OpenAI 旗舰模型，全能型选手',
        priceLevel: 4,
        priceNote: '约 25x 价格',
        tags: ['旗舰', '全能', '高质量'],
    },
    {
        id: 'deepseek/deepseek-v3.1',
        name: 'DeepSeek V3.1',
        provider: 'DeepSeek',
        description: '671B参数混合推理模型，支持思考/非思考模式，上下文128K',
        priceLevel: 1,
        priceNote: '约 2x 价格',
        recommended: true,
        tags: ['中文优化', '高性价比', '推理', '国产'],
    },
    {
        id: 'deepseek/deepseek-v3.2-exp',
        name: 'DeepSeek V3.2 Exp',
        provider: 'DeepSeek',
        description: '实验版，采用稀疏注意力优化长上下文处理效率',
        priceLevel: 1,
        priceNote: '约 2x 价格',
        tags: ['中文优化', '长上下文', '实验版', '国产'],
    },
    {
        id: 'moonshotai/kimi-k2',
        name: 'Kimi K2',
        provider: 'Moonshot',
        description: '月之暗面旗舰模型，中文理解和生成能力强',
        priceLevel: 2,
        priceNote: '约 4x 价格',
        tags: ['中文优化', '国产', '高质量'],
    },
    {
        id: 'x-ai/grok-4-fast',
        name: 'Grok 4 Fast',
        provider: 'xAI',
        description: 'Elon Musk xAI 旗下模型，多模态支持，2M上下文窗口',
        priceLevel: 1,
        priceNote: '约 2x 价格',
        tags: ['多模态', '大上下文', '快速'],
    },
]

// 按价格等级获取模型
export function getModelsByPriceLevel(level: number): AIModelPreset[] {
    return AI_MODEL_PRESETS.filter(m => m.priceLevel === level)
}

// 获取推荐模型
export function getRecommendedModels(): AIModelPreset[] {
    return AI_MODEL_PRESETS.filter(m => m.recommended)
}

// 根据ID获取模型
export function getModelById(id: string): AIModelPreset | undefined {
    return AI_MODEL_PRESETS.find(m => m.id === id)
}

// 获取价格等级的显示颜色
export function getPriceLevelColor(level: number): string {
    switch (level) {
        case 1: return 'text-green-600'
        case 2: return 'text-blue-600'
        case 3: return 'text-yellow-600'
        case 4: return 'text-orange-600'
        case 5: return 'text-red-600'
        default: return 'text-gray-600'
    }
}

// 获取价格等级的显示文本
export function getPriceLevelText(level: number): string {
    switch (level) {
        case 1: return '💚 经济'
        case 2: return '💙 适中'
        case 3: return '💛 较贵'
        case 4: return '🧡 昂贵'
        case 5: return '❤️ 最贵'
        default: return '❓ 未知'
    }
}
