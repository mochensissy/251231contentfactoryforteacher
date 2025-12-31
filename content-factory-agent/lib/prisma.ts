import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'

// Normalize SQLite file URL to absolute path, avoiding relative-path issues on some environments.
const normalizeSqliteUrl = (url?: string | null) => {
  if (!url || !url.startsWith('file:')) return url

  // Already an absolute file URL
  if (url.startsWith('file:///')) return url

  // file:./prisma/dev.db or file:prisma/dev.db -> resolve to absolute and encode
  const filePath = url.replace(/^file:/, '')
  const absPath = path.resolve(process.cwd(), filePath)

  // 如果路径包含非 ASCII（如中文），在部分环境下 SQLite 可能打开失败，创建 /tmp 下的英文字母符号链接避免问题
  if (/[^\x00-\x7F]/.test(absPath)) {
    const safePath = '/tmp/content-factory-dev.db'
    try {
      if (fs.existsSync(safePath)) {
        const target = fs.readlinkSync(safePath)
        if (target !== absPath) {
          fs.unlinkSync(safePath)
          fs.symlinkSync(absPath, safePath)
        }
      } else {
        fs.symlinkSync(absPath, safePath)
      }
      return pathToFileURL(safePath).toString()
    } catch (err) {
      console.warn('[prisma] 创建数据库符号链接失败，回退使用原路径', err)
    }
  }

  return pathToFileURL(absPath).toString()
}

const normalizedUrl = normalizeSqliteUrl(process.env.DATABASE_URL)
if (normalizedUrl && normalizedUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizedUrl
  // eslint-disable-next-line no-console
  console.log('[prisma] normalized DATABASE_URL =>', normalizedUrl)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
