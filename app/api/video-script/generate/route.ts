import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-client'
import { prisma } from '@/lib/prisma'

// 视频类型模板提示词
const VIDEO_TYPE_PROMPTS: Record<string, string> = {
    '知识分享': '专业、有深度、逻辑清晰、适合教学传播',
    '产品测评': '客观、详细、对比分析、突出优缺点',
    'Vlog': '轻松、个人化、有生活气息、情感共鸣',
    '口播': '直接、有感染力、节奏紧凑、适合口语表达',
    '剧情': '有故事性、冲突设置、角色塑造、引人入胜',
}

// 时长对应的结构建议
const DURATION_STRUCTURE: Record<number, { hook: string; body: string; cta: string }> = {
    60: { hook: '0:00-0:05', body: '0:05-0:50', cta: '0:50-1:00' },
    180: { hook: '0:00-0:15', body: '0:15-2:40', cta: '2:40-3:00' },
    300: { hook: '0:00-0:20', body: '0:20-4:30', cta: '4:30-5:00' },
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            platform = 'bilibili',
            videoType = '知识分享',
            duration = 180,
            topic,
            sourceArticleId,  // 新增：来源文章ID
            articleContent,   // 新增：直接传入的文章内容（用于未保存的文章）
            generateStoryboard = true,
        } = body

        // 获取来源文章内容
        let sourceContent = articleContent || ''
        let sourceTitle = topic
        let articleId = sourceArticleId ? parseInt(sourceArticleId) : null

        if (articleId) {
            const article = await prisma.article.findUnique({
                where: { id: articleId },
            })
            if (article) {
                sourceContent = article.content
                sourceTitle = article.title
            }
        }

        if (!topic && !sourceTitle) {
            return NextResponse.json(
                { success: false, error: '请输入视频主题或选择来源文章' },
                { status: 400 }
            )
        }

        const finalTopic = topic || sourceTitle
        const typePrompt = VIDEO_TYPE_PROMPTS[videoType] || VIDEO_TYPE_PROMPTS['知识分享']
        const structure = DURATION_STRUCTURE[duration] || DURATION_STRUCTURE[180]

        // 根据是否有来源内容，调整提示词
        let scriptPrompt: string
        if (sourceContent) {
            // 基于文章内容生成脚本
            scriptPrompt = `你是一个专业的短视频编剧。请基于以下文章内容，改编为一个${platform === 'bilibili' ? 'B站' : 'YouTube'}短视频脚本。

## 原文章内容
${sourceContent.substring(0, 3000)}${sourceContent.length > 3000 ? '\n...(内容已截断)' : ''}

## 视频参数
- 视频类型：${videoType}
- 风格要求：${typePrompt}
- 目标时长：${Math.floor(duration / 60)}分${duration % 60}秒

## 改编要求
1. 保留原文的核心观点和精华
2. 将书面语转换为适合口播的语言
3. 增加适合视频的表现形式（如互动问题、案例演示等）

## 脚本结构要求
请按照以下结构生成脚本：

### 开场 Hook (${structure.hook})
用一个吸引人的问题、惊人的事实或悬念开场，在前5-10秒内抓住观众注意力。

### 正文部分 (${structure.body})
- 分2-3个小节展开
- 每个小节有清晰的标题
- 内容要有干货、有案例
- 语言适合口播，不要太书面化

### 结尾 CTA (${structure.cta})
- 总结核心要点
- 引导点赞、关注、收藏
- 可以预告下期内容

请直接输出Markdown格式的脚本，不要有多余的解释。`
        } else {
            // 原有逻辑：基于主题生成
            scriptPrompt = `你是一个专业的短视频编剧。请为以下主题生成一个${platform === 'bilibili' ? 'B站' : 'YouTube'}短视频脚本。

## 基本信息
- 主题：${finalTopic}
- 视频类型：${videoType}
- 风格要求：${typePrompt}
- 目标时长：${Math.floor(duration / 60)}分${duration % 60}秒

## 脚本结构要求
请按照以下结构生成脚本：

### 开场 Hook (${structure.hook})
用一个吸引人的问题、惊人的事实或悬念开场，在前5-10秒内抓住观众注意力。

### 正文部分 (${structure.body})
- 分2-3个小节展开
- 每个小节有清晰的标题
- 内容要有干货、有案例
- 语言适合口播，不要太书面化

### 结尾 CTA (${structure.cta})
- 总结核心要点
- 引导点赞、关注、收藏
- 可以预告下期内容

请直接输出Markdown格式的脚本，不要有多余的解释。`
        }

        const scriptContent = await aiClient.chat([
            { role: 'user', content: scriptPrompt }
        ], { temperature: 0.7 })

        // 生成封面标题建议
        const coverPrompt = `基于以下视频脚本，生成3个吸引人的视频封面标题建议。要求：
1. 简短有力（不超过15个字）
2. 使用数字或疑问句式
3. 激发好奇心

脚本主题：${finalTopic}
视频类型：${videoType}

请直接输出3个标题，每行一个，不要编号和其他内容。`

        const coverTitles = await aiClient.chat([
            { role: 'user', content: coverPrompt }
        ], { temperature: 0.8 })

        let storyboard = null

        // 生成分镜头建议
        if (generateStoryboard) {
            const storyboardPrompt = `你是一个专业的短视频分镜师。请根据以下脚本生成分镜头建议表格。

脚本内容：
${scriptContent}

请生成JSON格式的分镜头数据，包含以下字段：
- seq: 序号
- timeRange: 时间段（如 "0:00-0:10"）
- scene: 画面描述
- script: 文案/口播内容
- bgm: BGM风格建议
- notes: 拍摄备注

直接输出JSON数组，不要有其他内容。示例格式：
[
  {"seq": 1, "timeRange": "0:00-0:10", "scene": "人物特写", "script": "开场白...", "bgm": "悬疑风", "notes": "用表情贴纸"}
]`

            const storyboardResponse = await aiClient.chat([
                { role: 'user', content: storyboardPrompt }
            ], { temperature: 0.5 })

            try {
                // 尝试解析JSON
                const jsonMatch = storyboardResponse.match(/\[[\s\S]*\]/)
                if (jsonMatch) {
                    storyboard = JSON.parse(jsonMatch[0])
                }
            } catch (e) {
                console.error('分镜头JSON解析失败:', e)
                storyboard = null
            }
        }

        // 保存到数据库
        const videoScript = await prisma.videoScript.create({
            data: {
                title: finalTopic,
                platform,
                videoType,
                duration,
                topic: finalTopic,
                content: scriptContent,
                storyboard: storyboard ? JSON.stringify(storyboard) : null,
                coverTitle: coverTitles,
                sourceArticleId: articleId,  // 关联来源文章
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: videoScript.id,
                title: finalTopic,
                platform,
                videoType,
                duration,
                content: scriptContent,
                storyboard,
                coverTitles: coverTitles.split('\n').filter((t: string) => t.trim()),
                sourceArticleId: articleId,
            },
        })
    } catch (error) {
        console.error('生成视频脚本失败:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '生成失败' },
            { status: 500 }
        )
    }
}

