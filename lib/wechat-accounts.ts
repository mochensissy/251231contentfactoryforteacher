// 微信公众号账号配置管理

export interface WechatAccount {
    id: string
    name: string
    appId: string
    appSecret: string
    webhookUrl: string
    enabled: boolean
}

const STORAGE_KEY = 'wechat_accounts'
const MAX_ACCOUNTS = 5

// 默认账号配置（用于初始化）
const DEFAULT_ACCOUNTS: WechatAccount[] = [
    {
        id: 'hr-jinhuapai',
        name: 'HR进化派',
        appId: 'wx2da3d685de860b66',
        appSecret: '53d963db6d28a23b51ba9ebdc97f2b44',
        webhookUrl: 'https://n8n.aiwensi.com/webhook/publish-to-wechat',
        enabled: true,
    },
    {
        id: 'wensixiu-ai',
        name: '闻思修AI手记',
        appId: '',
        appSecret: '',
        webhookUrl: 'https://n8n.aiwensi.com/webhook/publish-to-pgz',
        enabled: true,
    },
]

// 获取所有账号
export function getWechatAccounts(): WechatAccount[] {
    if (typeof window === 'undefined') return DEFAULT_ACCOUNTS

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('读取公众号配置失败:', e)
    }

    // 首次使用，初始化默认配置
    saveWechatAccounts(DEFAULT_ACCOUNTS)
    return DEFAULT_ACCOUNTS
}

// 获取已启用的账号
export function getEnabledWechatAccounts(): WechatAccount[] {
    return getWechatAccounts().filter(acc => acc.enabled)
}

// 保存所有账号
export function saveWechatAccounts(accounts: WechatAccount[]): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
    } catch (e) {
        console.error('保存公众号配置失败:', e)
    }
}

// 添加新账号
export function addWechatAccount(account: Omit<WechatAccount, 'id'>): WechatAccount | null {
    const accounts = getWechatAccounts()

    if (accounts.length >= MAX_ACCOUNTS) {
        return null
    }

    const newAccount: WechatAccount = {
        ...account,
        id: `account-${Date.now()}`,
    }

    accounts.push(newAccount)
    saveWechatAccounts(accounts)
    return newAccount
}

// 更新账号
export function updateWechatAccount(id: string, updates: Partial<WechatAccount>): boolean {
    const accounts = getWechatAccounts()
    const index = accounts.findIndex(acc => acc.id === id)

    if (index === -1) return false

    accounts[index] = { ...accounts[index], ...updates }
    saveWechatAccounts(accounts)
    return true
}

// 删除账号
export function deleteWechatAccount(id: string): boolean {
    const accounts = getWechatAccounts()
    const filtered = accounts.filter(acc => acc.id !== id)

    if (filtered.length === accounts.length) return false

    saveWechatAccounts(filtered)
    return true
}

// 根据ID获取账号
export function getWechatAccountById(id: string): WechatAccount | undefined {
    return getWechatAccounts().find(acc => acc.id === id)
}

// 检查是否可以添加更多账号
export function canAddMoreAccounts(): boolean {
    return getWechatAccounts().length < MAX_ACCOUNTS
}

// 获取最大账号数
export function getMaxAccounts(): number {
    return MAX_ACCOUNTS
}
