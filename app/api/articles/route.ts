import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 获取文章列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const status = searchParams.get('status')

        const where: Record<string, string> = {}
        if (status) where.status = status

        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    publishRecords: true,
                },
            }),
            prisma.article.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            data: articles.map((a) => ({
                ...a,
                images: a.images ? JSON.parse(a.images) : [],
            })),
            pagination: {
                total,
                limit,
                offset,
            },
        })
    } catch (error) {
        console.error('获取文章列表失败:', error)
        return NextResponse.json(
            { success: false, error: '获取失败' },
            { status: 500 }
        )
    }
}

// POST: 创建新文章
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            content,
            summary,
            images,
            reportId,
            status = 'draft',
            platform = 'wechat',
        } = body

        console.log('\n📝 创建文章请求:')
        console.log(`- 标题: ${title?.substring(0, 50)}...`)
        console.log(`- 内容长度: ${content?.length || 0} 字符`)
        console.log(`- 平台: ${platform}`)
        console.log(`- 状态: ${status}`)
        console.log(`- 报告ID: ${reportId}`)
        console.log(`- 图片数量: ${Array.isArray(images) ? images.length : 0}`)

        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: '标题和内容不能为空' },
                { status: 400 }
            )
        }

        const createData = {
            title: String(title),
            content: String(content),
            summary: summary ? String(summary) : null,
            images: images ? JSON.stringify(images) : null,
            reportId: reportId ? parseInt(String(reportId)) : null,
            status: String(status),
            platform: String(platform),
            source: 'ai_generated',
        }

        console.log('- 准备写入数据库:', JSON.stringify(createData).substring(0, 200) + '...')

        const article = await prisma.article.create({
            data: createData,
        })

        return NextResponse.json({
            success: true,
            data: {
                ...article,
                articleId: article.id,
                images: article.images ? JSON.parse(article.images) : [],
            },
        })
    } catch (error) {
        console.error('创建文章失败:', error)
        const errorMessage = error instanceof Error ? error.message : '创建失败'
        return NextResponse.json(
            { success: false, error: errorMessage, details: String(error) },
            { status: 500 }
        )
    }
}
