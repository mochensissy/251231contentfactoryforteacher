"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, Key, Link as LinkIcon, Save, Download, Upload, CheckCircle2, XCircle, Loader2, Plus, Trash2 } from "lucide-react"
import { FORMATTING_STYLE_PRESETS, WRITING_TONE_PRESETS, FormattingStyleKey, WritingToneKey } from "@/lib/prompt-presets"

// 微信公众号账号配置接口
interface WechatAccount {
  id: string
  name: string
  webhookUrl: string
  appId: string
  appSecret: string
  enabled: boolean
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [aiTestStatus, setAiTestStatus] = useState<TestStatus>('idle')
  const [wechatArticleTestStatus, setWechatArticleTestStatus] = useState<TestStatus>('idle')
  const [siliconflowTestStatus, setSiliconflowTestStatus] = useState<TestStatus>('idle')
  const [dashscopeTestStatus, setDashscopeTestStatus] = useState<TestStatus>('idle')
  const [wechatMpTestStatus, setWechatMpTestStatus] = useState<TestStatus>('idle')
  const [serverIp, setServerIp] = useState<string>('')
  const [loadingIp, setLoadingIp] = useState(false)

  // 多公众号配置状态
  const [wechatAccounts, setWechatAccounts] = useState<WechatAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [testStatusMap, setTestStatusMap] = useState<Record<string, TestStatus>>({})

  // 排版风格状态
  const [selectedFormattingStyle, setSelectedFormattingStyle] = useState<'ochre' | 'blue' | 'monochrome' | 'green'>('ochre')

  // 文风状态
  const [selectedWritingTone, setSelectedWritingTone] = useState<'professional' | 'casual' | 'storytelling' | 'tutorial'>('professional')

  // 最大公众号数量

  const MAX_ACCOUNTS = 5

  // 从localStorage加载配置
  useEffect(() => {
    const saved = localStorage.getItem('wechat-accounts')
    if (saved) {
      try {
        const accounts = JSON.parse(saved) as WechatAccount[]
        setWechatAccounts(accounts)
        if (accounts.length > 0) {
          setActiveAccountId(accounts[0].id)
        }
      } catch (e) {
        console.error('Failed to load wechat accounts:', e)
      }
    }
  }, [])

  // 保存配置到localStorage
  const saveAccountsToStorage = (accounts: WechatAccount[]) => {
    localStorage.setItem('wechat-accounts', JSON.stringify(accounts))
  }

  // 添加新公众号
  const addAccount = () => {
    if (wechatAccounts.length >= MAX_ACCOUNTS) {
      alert(`最多只能配置${MAX_ACCOUNTS}个公众号`)
      return
    }
    const newAccount: WechatAccount = {
      id: `account-${Date.now()}`,
      name: `公众号${wechatAccounts.length + 1}`,
      webhookUrl: 'https://your-n8n-server.com/webhook/...',
      appId: 'wx...',
      appSecret: '',
      enabled: true,
    }
    const updatedAccounts = [...wechatAccounts, newAccount]
    setWechatAccounts(updatedAccounts)
    setActiveAccountId(newAccount.id)
    saveAccountsToStorage(updatedAccounts)
  }

  // 删除公众号
  const deleteAccount = (id: string) => {
    if (!confirm('确定要删除这个公众号配置吗？此操作不可撤销。')) {
      return
    }
    const updatedAccounts = wechatAccounts.filter(a => a.id !== id)
    setWechatAccounts(updatedAccounts)
    saveAccountsToStorage(updatedAccounts)
    // 如果删除的是当前选中的账号，选中第一个
    if (activeAccountId === id) {
      setActiveAccountId(updatedAccounts[0]?.id || null)
    }
  }

  // 更新公众号配置
  const updateAccount = (id: string, field: keyof WechatAccount, value: string | boolean) => {
    const updatedAccounts = wechatAccounts.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    )
    setWechatAccounts(updatedAccounts)
    saveAccountsToStorage(updatedAccounts)
  }

  // 获取当前活动的公众号
  const activeAccount = wechatAccounts.find(a => a.id === activeAccountId)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }


  // 获取服务器IP地址
  const getServerIp = async () => {
    setLoadingIp(true)
    try {
      // 尝试多个IP查询服务，提高成功率
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.ip.sb/ip',
        'https://ifconfig.me/ip',
      ]

      for (const service of services) {
        try {
          const response = await fetch(service)
          if (response.ok) {
            const data = await response.text()
            let ip = data.trim()

            // 如果是JSON格式
            try {
              const json = JSON.parse(data)
              ip = json.ip || ip
            } catch (e) {
              // 不是JSON，直接使用文本
            }

            setServerIp(ip)

            // 复制到剪贴板
            await navigator.clipboard.writeText(ip)
            alert(`✅ IP地址已获取并复制到剪贴板：\n\n${ip}\n\n请将此IP添加到微信公众号后台的IP白名单中`)
            break
          }
        } catch (e) {
          console.warn('IP服务失败，尝试下一个:', e)
          continue
        }
      }

      if (!serverIp) {
        alert('❌ 获取IP失败，请手动访问 https://api.ipify.org 查看')
      }
    } catch (error) {
      console.error('获取IP失败:', error)
      alert('❌ 获取IP失败，请检查网络连接')
    } finally {
      setLoadingIp(false)
    }
  }

  // 测试AI模型API连接
  const testAiConnection = async () => {
    setAiTestStatus('testing')
    try {
      const apiUrl = (document.getElementById('ai-api-url') as HTMLInputElement)?.value
      const apiKey = (document.getElementById('ai-api-key') as HTMLInputElement)?.value
      const model = (document.getElementById('ai-model') as HTMLInputElement)?.value

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      })

      if (response.ok) {
        setAiTestStatus('success')
        setTimeout(() => setAiTestStatus('idle'), 3000)
      } else {
        setAiTestStatus('error')
        setTimeout(() => setAiTestStatus('idle'), 3000)
      }
    } catch (error) {
      setAiTestStatus('error')
      setTimeout(() => setAiTestStatus('idle'), 3000)
    }
  }

  // 测试公众号文章API连接
  const testWechatArticleConnection = async () => {
    setWechatArticleTestStatus('testing')
    try {
      const apiUrl = (document.getElementById('wechat-api-url') as HTMLInputElement)?.value
      const apiKey = (document.getElementById('wechat-api-key') as HTMLInputElement)?.value

      const response = await fetch('/api/wechat-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: '测试', page: 1 }),
      })

      if (response.ok) {
        setWechatArticleTestStatus('success')
        setTimeout(() => setWechatArticleTestStatus('idle'), 3000)
      } else {
        setWechatArticleTestStatus('error')
        setTimeout(() => setWechatArticleTestStatus('idle'), 3000)
      }
    } catch (error) {
      setWechatArticleTestStatus('error')
      setTimeout(() => setWechatArticleTestStatus('idle'), 3000)
    }
  }

  // 测试硅基流动API连接
  const testSiliconflowConnection = async () => {
    setSiliconflowTestStatus('testing')
    try {
      const apiUrl = (document.getElementById('siliconflow-api-url') as HTMLInputElement)?.value
      const apiKey = (document.getElementById('siliconflow-api-key') as HTMLInputElement)?.value
      const model = (document.getElementById('siliconflow-model') as HTMLInputElement)?.value

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: 'test',
          image_size: '512x512',
        }),
      })

      if (response.ok) {
        setSiliconflowTestStatus('success')
        setTimeout(() => setSiliconflowTestStatus('idle'), 3000)
      } else {
        setSiliconflowTestStatus('error')
        setTimeout(() => setSiliconflowTestStatus('idle'), 3000)
      }
    } catch (error) {
      setSiliconflowTestStatus('error')
      setTimeout(() => setSiliconflowTestStatus('idle'), 3000)
    }
  }

  // 测试阿里云通义万相API连接
  const testDashscopeConnection = async () => {
    setDashscopeTestStatus('testing')
    try {
      const apiUrl = (document.getElementById('dashscope-api-url') as HTMLInputElement)?.value
      const apiKey = (document.getElementById('dashscope-api-key') as HTMLInputElement)?.value

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt: 'test' },
          parameters: { size: '1024*1024', n: 1 },
        }),
      })

      if (response.ok) {
        setDashscopeTestStatus('success')
        setTimeout(() => setDashscopeTestStatus('idle'), 3000)
      } else {
        setDashscopeTestStatus('error')
        setTimeout(() => setDashscopeTestStatus('idle'), 3000)
      }
    } catch (error) {
      setDashscopeTestStatus('error')
      setTimeout(() => setDashscopeTestStatus('idle'), 3000)
    }
  }

  // 测试微信公众号配置
  const testWechatMpConnection = async () => {
    setWechatMpTestStatus('testing')
    try {
      const apiUrl = (document.getElementById('mp-api-url') as HTMLInputElement)?.value

      if (!apiUrl) {
        setWechatMpTestStatus('error')
        setTimeout(() => setWechatMpTestStatus('idle'), 3000)
        return
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })

      if (response.ok || response.status === 400) { // 400也算连接成功
        setWechatMpTestStatus('success')
        setTimeout(() => setWechatMpTestStatus('idle'), 3000)
      } else {
        setWechatMpTestStatus('error')
        setTimeout(() => setWechatMpTestStatus('idle'), 3000)
      }
    } catch (error) {
      setWechatMpTestStatus('error')
      setTimeout(() => setWechatMpTestStatus('idle'), 3000)
    }
  }

  const renderTestButton = (status: TestStatus, onTest: () => void) => {
    if (status === 'testing') {
      return (
        <Button variant="outline" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          测试中...
        </Button>
      )
    }
    if (status === 'success') {
      return (
        <Button variant="outline" className="border-green-500 text-green-600">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          连接成功
        </Button>
      )
    }
    if (status === 'error') {
      return (
        <Button variant="outline" className="border-red-500 text-red-600">
          <XCircle className="mr-2 h-4 w-4" />
          连接失败
        </Button>
      )
    }
    return (
      <Button variant="outline" onClick={onTest}>
        测试连接
      </Button>
    )
  }

  const handleExport = () => {
    // 导出所有配置
    const config = {
      ai: {
        apiUrl: (document.getElementById('ai-api-url') as HTMLInputElement)?.value,
        apiKey: (document.getElementById('ai-api-key') as HTMLInputElement)?.value,
        model: (document.getElementById('ai-model') as HTMLInputElement)?.value,
      },
      wechatArticles: {
        apiUrl: (document.getElementById('wechat-api-url') as HTMLInputElement)?.value,
        apiKey: (document.getElementById('wechat-api-key') as HTMLInputElement)?.value,
      },
      siliconflow: {
        apiUrl: (document.getElementById('siliconflow-api-url') as HTMLInputElement)?.value,
        apiKey: (document.getElementById('siliconflow-api-key') as HTMLInputElement)?.value,
        model: (document.getElementById('siliconflow-model') as HTMLInputElement)?.value,
      },
      dashscope: {
        apiUrl: (document.getElementById('dashscope-api-url') as HTMLInputElement)?.value,
        apiKey: (document.getElementById('dashscope-api-key') as HTMLInputElement)?.value,
      },
      wechatMp: {
        apiUrl: (document.getElementById('mp-api-url') as HTMLInputElement)?.value,
        appId: (document.getElementById('mp-appid') as HTMLInputElement)?.value,
        appSecret: (document.getElementById('mp-secret') as HTMLInputElement)?.value,
      },
      prompts: {
        article: (document.getElementById('article-prompt') as HTMLTextAreaElement)?.value,
        formatting: (document.getElementById('formatting-prompt') as HTMLTextAreaElement)?.value,
      },
      defaults: {
        wordCount: (document.getElementById('default-word-count') as HTMLInputElement)?.value,
        style: (document.getElementById('default-style') as HTMLInputElement)?.value,
        images: (document.getElementById('default-images') as HTMLInputElement)?.value,
        analysisCount: (document.getElementById('analysis-count') as HTMLInputElement)?.value,
        insightsCount: (document.getElementById('insights-count') as HTMLInputElement)?.value,
      }
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const config = JSON.parse(event.target?.result as string)

            // 导入AI配置
            if (config.ai) {
              ; (document.getElementById('ai-api-url') as HTMLInputElement).value = config.ai.apiUrl || ''
                ; (document.getElementById('ai-api-key') as HTMLInputElement).value = config.ai.apiKey || ''
                ; (document.getElementById('ai-model') as HTMLInputElement).value = config.ai.model || ''
            }

            // 导入公众号文章API配置
            if (config.wechatArticles) {
              ; (document.getElementById('wechat-api-url') as HTMLInputElement).value = config.wechatArticles.apiUrl || ''
                ; (document.getElementById('wechat-api-key') as HTMLInputElement).value = config.wechatArticles.apiKey || ''
            }

            // 导入硅基流动配置
            if (config.siliconflow) {
              ; (document.getElementById('siliconflow-api-url') as HTMLInputElement).value = config.siliconflow.apiUrl || ''
                ; (document.getElementById('siliconflow-api-key') as HTMLInputElement).value = config.siliconflow.apiKey || ''
                ; (document.getElementById('siliconflow-model') as HTMLInputElement).value = config.siliconflow.model || ''
            }

            // 导入阿里云通义万相配置
            if (config.dashscope) {
              ; (document.getElementById('dashscope-api-url') as HTMLInputElement).value = config.dashscope.apiUrl || ''
                ; (document.getElementById('dashscope-api-key') as HTMLInputElement).value = config.dashscope.apiKey || ''
            }

            // 导入公众号配置
            if (config.wechatMp) {
              ; (document.getElementById('mp-api-url') as HTMLInputElement).value = config.wechatMp.apiUrl || ''
                ; (document.getElementById('mp-appid') as HTMLInputElement).value = config.wechatMp.appId || ''
                ; (document.getElementById('mp-secret') as HTMLInputElement).value = config.wechatMp.appSecret || ''
            }

            // 导入提示词配置
            if (config.prompts) {
              ; (document.getElementById('article-prompt') as HTMLTextAreaElement).value = config.prompts.article || ''
                ; (document.getElementById('formatting-prompt') as HTMLTextAreaElement).value = config.prompts.formatting || ''
            }

            // 导入默认设置
            if (config.defaults) {
              ; (document.getElementById('default-word-count') as HTMLInputElement).value = config.defaults.wordCount || ''
                ; (document.getElementById('default-style') as HTMLInputElement).value = config.defaults.style || ''
                ; (document.getElementById('default-images') as HTMLInputElement).value = config.defaults.images || ''
                ; (document.getElementById('analysis-count') as HTMLInputElement).value = config.defaults.analysisCount || ''
                ; (document.getElementById('insights-count') as HTMLInputElement).value = config.defaults.insightsCount || ''
            }

            alert('配置导入成功！')
          } catch (error) {
            alert('配置文件格式错误，导入失败')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-2">
          配置API密钥和系统参数
        </p>
      </div>

      <Tabs defaultValue="api" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api">
            <Key className="mr-2 h-4 w-4" />
            API配置
          </TabsTrigger>
          <TabsTrigger value="platform">
            <LinkIcon className="mr-2 h-4 w-4" />
            平台配置
          </TabsTrigger>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            通用设置
          </TabsTrigger>
        </TabsList>

        {/* API配置 */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI模型配置</CardTitle>
              <CardDescription>
                配置OpenAI兼容的API接口，用于内容分析和生成（使用OpenRouter）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-api-url">API地址</Label>
                <Input
                  id="ai-api-url"
                  placeholder="https://openrouter.ai/api/v1/chat/completions"
                  defaultValue="https://openrouter.ai/api/v1/chat/completions"
                />
                <p className="text-sm text-muted-foreground">
                  支持OpenRouter、OpenAI等兼容接口
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-api-key">API Key</Label>
                <Input
                  id="ai-api-key"
                  type="password"
                  placeholder="sk-or-v1-..."
                  defaultValue="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"
                />
                <p className="text-sm text-muted-foreground">
                  从 <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenRouter</a> 获取
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-model">模型</Label>
                <Input
                  id="ai-model"
                  placeholder="google/gemini-2.0-flash-thinking-exp:free"
                  defaultValue="google/gemini-2.5-flash-lite"
                />
                <p className="text-sm text-muted-foreground">
                  推荐免费模型。查看更多：<a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">模型列表</a>
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">连接测试</p>
                  <p className="text-sm text-muted-foreground">
                    验证API配置是否正确
                  </p>
                </div>
                {renderTestButton(aiTestStatus, testAiConnection)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>公众号文章API</CardTitle>
              <CardDescription>
                配置用于获取公众号文章数据的第三方API（大价啦平台）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wechat-api-url">API地址</Label>
                <Input
                  id="wechat-api-url"
                  placeholder="https://www.dajiala.com/fbmain/monitor/v3/kw_search"
                  defaultValue="https://www.dajiala.com/fbmain/monitor/v3/kw_search"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wechat-api-key">API Key</Label>
                <Input
                  id="wechat-api-key"
                  type="password"
                  placeholder="JZL..."
                  defaultValue="JZL34baea50c020a325"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">连接测试</p>
                  <p className="text-sm text-muted-foreground">
                    验证API是否可用
                  </p>
                </div>
                {renderTestButton(wechatArticleTestStatus, testWechatArticleConnection)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>硅基流动 - 文章配图生成</CardTitle>
              <CardDescription>
                配置硅基流动可灵模型API用于生成文章配图
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siliconflow-api-url">API地址</Label>
                <Input
                  id="siliconflow-api-url"
                  placeholder="https://api.siliconflow.cn/v1/images/generations"
                  defaultValue="https://api.siliconflow.cn/v1/images/generations"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siliconflow-api-key">API Key</Label>
                <Input
                  id="siliconflow-api-key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue="sk-tsfffvfoywxhvqmfwwuamopclmwhdqrcldogntbimstltvly"
                />
                <p className="text-sm text-muted-foreground">
                  从 <a href="https://cloud.siliconflow.cn" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">硅基流动</a> 获取
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siliconflow-model">模型</Label>
                <Input
                  id="siliconflow-model"
                  placeholder="Kwai-Kolors/Kolors"
                  defaultValue="Kwai-Kolors/Kolors"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">连接测试</p>
                  <p className="text-sm text-muted-foreground">
                    验证API配置是否正确
                  </p>
                </div>
                {renderTestButton(siliconflowTestStatus, testSiliconflowConnection)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>阿里云通义万相 - 公众号封面图生成</CardTitle>
              <CardDescription>
                配置阿里云DashScope API用于生成公众号封面图
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashscope-api-url">API地址</Label>
                <Input
                  id="dashscope-api-url"
                  placeholder="https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
                  defaultValue="https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashscope-api-key">API Key</Label>
                <Input
                  id="dashscope-api-key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue="sk-4e36b402fb234fbcbead0d355bb59561"
                />
                <p className="text-sm text-muted-foreground">
                  从 <a href="https://dashscope.console.aliyun.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">阿里云DashScope控制台</a> 获取
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">连接测试</p>
                  <p className="text-sm text-muted-foreground">
                    验证API配置是否正确
                  </p>
                </div>
                {renderTestButton(dashscopeTestStatus, testDashscopeConnection)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 平台配置 */}
        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>微信公众号配置</CardTitle>
                  <CardDescription>
                    配置微信公众号发布API（最多支持5个公众号）
                  </CardDescription>
                </div>
                <Button
                  onClick={addAccount}
                  disabled={wechatAccounts.length >= MAX_ACCOUNTS}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  添加公众号
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 公众号账号标签列表 */}
              {wechatAccounts.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {wechatAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => setActiveAccountId(account.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeAccountId === account.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                      >
                        {account.name}
                        <span className={`w-2 h-2 rounded-full ${account.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      </button>
                    ))}
                  </div>

                  {/* 当前选中账号的配置表单 */}
                  {activeAccount && (
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>账号名称</Label>
                          <Input
                            value={activeAccount.name}
                            onChange={(e) => updateAccount(activeAccount.id, 'name', e.target.value)}
                            placeholder="公众号名称"
                          />
                        </div>
                        <div className="space-y-2 flex items-end">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`enabled-${activeAccount.id}`}
                              checked={activeAccount.enabled}
                              onCheckedChange={(checked: boolean | 'indeterminate') => updateAccount(activeAccount.id, 'enabled', !!checked)}
                            />
                            <Label htmlFor={`enabled-${activeAccount.id}`}>启用</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Webhook地址</Label>
                        <Input
                          value={activeAccount.webhookUrl}
                          onChange={(e) => updateAccount(activeAccount.id, 'webhookUrl', e.target.value)}
                          placeholder="https://your-n8n-server.com/webhook/..."
                        />
                        <p className="text-sm text-muted-foreground">
                          n8n服务器webhook地址
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>公众号AppID</Label>
                          <Input
                            value={activeAccount.appId}
                            onChange={(e) => updateAccount(activeAccount.id, 'appId', e.target.value)}
                            placeholder="wx..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>公众号AppSecret</Label>
                          <Input
                            type="password"
                            value={activeAccount.appSecret}
                            onChange={(e) => updateAccount(activeAccount.id, 'appSecret', e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      {/* 删除按钮 */}
                      <div className="pt-4 flex justify-start">
                        <Button
                          variant="destructive"
                          onClick={() => deleteAccount(activeAccount.id)}
                          className="flex items-center gap-2 px-4 shadow-sm text-white hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>删除此公众号</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>还没有配置公众号</p>
                  <p className="text-sm">点击右上角"添加公众号"按钮开始配置</p>
                </div>
              )}

              <Separator />

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      IP白名单配置
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      微信公众号要求将服务器IP添加到白名单才能调用API
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getServerIp}
                    disabled={loadingIp}
                    className="border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                  >
                    {loadingIp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        获取中...
                      </>
                    ) : (
                      '📋 获取本机IP地址'
                    )}
                  </Button>

                  {serverIp && (
                    <div className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-yellow-200 dark:border-yellow-700">
                      <code className="text-sm font-mono text-yellow-900 dark:text-yellow-100">
                        {serverIp}
                      </code>
                    </div>
                  )}
                </div>

                <div className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                  <p>📖 配置步骤：</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>点击"获取本机IP地址"按钮（IP会自动复制）</li>
                    <li>登录微信公众号后台：mp.weixin.qq.com</li>
                    <li>进入"开发 → 基本配置 → IP白名单"</li>
                    <li>点击"修改"，粘贴IP地址并保存</li>
                  </ol>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">连接测试</p>
                  <p className="text-sm text-muted-foreground">
                    验证webhook是否可访问
                  </p>
                </div>
                {renderTestButton(wechatMpTestStatus, testWechatMpConnection)}
              </div>

              <Separator />

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 提示：小红书不需要API配置，生成文章后直接扫码发布即可
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通用设置 */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>文章生成提示词</CardTitle>
              <CardDescription>
                配置AI生成文章的提示词模板，可选择不同文风或自定义修改
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 文风选择标签 */}
              <div className="space-y-2">
                <Label>选择文风</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(WRITING_TONE_PRESETS) as WritingToneKey[]).map((key) => {
                    const preset = WRITING_TONE_PRESETS[key]
                    const isSelected = selectedWritingTone === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedWritingTone(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                          ? 'bg-primary text-primary-foreground border-2 border-primary shadow-sm'
                          : 'bg-muted text-muted-foreground border border-input hover:bg-accent hover:text-accent-foreground'
                          }`}
                      >
                        {preset.emoji} {preset.name}
                      </button>
                    )
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {WRITING_TONE_PRESETS[selectedWritingTone].description}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="article-prompt">提示词模板（{WRITING_TONE_PRESETS[selectedWritingTone].name}风格）</Label>
                  <span className="text-xs text-muted-foreground">💡 可在预设基础上自行修改</span>
                </div>
                <Textarea
                  id="article-prompt"
                  rows={15}
                  placeholder="输入文章生成提示词..."
                  value={WRITING_TONE_PRESETS[selectedWritingTone].prompt}
                  onChange={() => {/* 用户可以编辑，但切换风格会重置 */ }}
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-blue-500">💡</span>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">自定义提示</p>
                    <p>切换文风会加载对应的预设提示词。您可以在此基础上自行修改，修改后的内容会在切换风格时被重置。</p>
                    <p className="mt-1">变量占位符：{'{'}topic{'}'}, {'{'}description{'}'}, {'{'}outline{'}'}, {'{'}wordCount{'}'}, {'{'}style{'}'}, {'{'}imageCount{'}'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>文章排版提示词</CardTitle>
              <CardDescription>
                配置微信公众号文章排版的提示词模板，可选择不同的配色风格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 风格选择标签 */}
              <div className="space-y-2">
                <Label>选择排版风格</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FORMATTING_STYLE_PRESETS) as FormattingStyleKey[]).map((key) => {
                    const preset = FORMATTING_STYLE_PRESETS[key]
                    const isSelected = selectedFormattingStyle === key
                    // 根据风格设置不同的按钮样式
                    const styleClasses = {
                      ochre: isSelected
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-500'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-400',
                      blue: isSelected
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-400',
                      monochrome: isSelected
                        ? 'bg-gray-200 text-gray-900 border-2 border-gray-600'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-400',
                      green: isSelected
                        ? 'bg-green-100 text-green-800 border-2 border-green-500'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:border-green-400',
                    }
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedFormattingStyle(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${styleClasses[key]}`}
                      >
                        {preset.emoji} {preset.name}
                      </button>
                    )
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {FORMATTING_STYLE_PRESETS[selectedFormattingStyle].description}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="formatting-prompt">
                    排版提示词模板（
                    <span style={{ color: FORMATTING_STYLE_PRESETS[selectedFormattingStyle].primaryColor }}>
                      {FORMATTING_STYLE_PRESETS[selectedFormattingStyle].name}
                    </span>
                    风格）
                  </Label>
                  <span className="text-xs text-muted-foreground">💡 可在预设基础上自行修改</span>
                </div>
                <Textarea
                  id="formatting-prompt"
                  rows={18}
                  placeholder="输入排版提示词..."
                  value={FORMATTING_STYLE_PRESETS[selectedFormattingStyle].prompt}
                  onChange={() => {/* 用户可以编辑，但切换风格会重置 */ }}
                />
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <span className="text-amber-500">💡</span>
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">自定义提示</p>
                    <p>每种风格都有预设的配色方案和排版规则。切换风格会加载对应的预设。您可以在此基础上自行调整。</p>
                    <p className="mt-1">变量占位符：{'{'}title{'}'}, {'{'}content{'}'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 视频脚本提示词 */}
          <Card>
            <CardHeader>
              <CardTitle>视频脚本提示词</CardTitle>
              <CardDescription>
                配置AI生成视频脚本的提示词模板，控制脚本格式和风格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-script-prompt">视频脚本提示词模板</Label>
                <Textarea
                  id="video-script-prompt"
                  rows={15}
                  placeholder="输入视频脚本生成提示词..."
                  defaultValue={`你是一位专业的短视频脚本创作者。请根据以下要求创作一个高质量的视频脚本。

选题标题：{topic}
选题描述：{description}
视频时长：{duration}秒

脚本格式要求：
1. **开场钩子**（前3秒）：用一句话抓住观众注意力
2. **问题引入**（5-10秒）：引出观众痛点或好奇心
3. **核心内容**（主体部分）：分点阐述，每点配合画面描述
4. **总结升华**（结尾）：总结要点，引导互动

输出格式：
---
【开场钩子】
旁白：...
画面：...

【问题引入】
旁白：...
画面：...

【核心内容-第1点】
旁白：...
画面：...

【核心内容-第2点】
旁白：...
画面：...

【总结升华】
旁白：...
画面：...
---

注意事项：
- 语言口语化，避免书面语
- 每句话控制在15字以内，方便配音
- 画面描述要具体，便于拍摄或剪辑
- 适当加入互动引导（点赞、关注、评论）`}
                />
                <p className="text-sm text-muted-foreground">
                  提示：使用 {'{'}topic{'}'}, {'{'}description{'}'}, {'{'}duration{'}'} 作为变量占位符
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 公众号封面图提示词 */}
          <Card>
            <CardHeader>
              <CardTitle>🖼️ 公众号封面图提示词</CardTitle>
              <CardDescription>
                配置AI生成公众号文章封面图的提示词模板，控制封面风格和要求
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cover-image-prompt">封面图提示词模板</Label>
                <Textarea
                  id="cover-image-prompt"
                  rows={12}
                  placeholder="输入封面图生成提示词..."
                  defaultValue={`封面要求（务必遵循）：
1) 核心主题：封面必须围绕"{title}"，体现与文章主题直接相关的场景/物件/动作，不能是泛化风景。
2) 具体元素：优先加入与主题直连的事物（产品/工具/人物行为/职场或业务场景），避免无关建筑与自然风光。
3) 风格：保持水彩或插画风格，画面简洁专业。
4) 禁止：纯风景、度假/旅游/山水/公园/海边/城市天际线等无关画面；禁止幼稚卡通。
5) 色调：现代、清爽、积极，突出主题。

图像风格指南：
- 采用现代的、写实或半写实的企业/商业/咨询公司专业摄影风格
- 禁止字面化表达，必须使用隐喻
- 氛围必须是专业、理性、积极向上、沉稳的
- 构图必须简洁、大气
- 绝对禁止生成任何诡异、阴暗、恐怖、幼稚、卡通的元素
- 不要出现人物图像`}
                />
                <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-purple-500">💡</span>
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    <p className="font-medium">自定义提示</p>
                    <p>封面图会在发布到公众号时自动生成。此提示词用于控制封面的整体风格和主题关联度。</p>
                    <p className="mt-1">变量占位符：{'{'}title{'}'} - 文章标题</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 文章配图提示词 */}
          <Card>
            <CardHeader>
              <CardTitle>🎨 文章配图提示词</CardTitle>
              <CardDescription>
                配置AI生成文章内部配图的提示词模板，控制配图风格和要求
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="article-image-prompt">配图提示词模板</Label>
                <Textarea
                  id="article-image-prompt"
                  rows={12}
                  placeholder="输入配图生成提示词..."
                  defaultValue={`你是一位专业的视觉设计师。请根据以下文章内容，生成配图的中文提示词。

要求：
1. 每张配图的提示词应该对应文章的不同部分或关键内容
2. 提示词要具体、生动，能够准确描述画面内容
3. 提示词应该使用中文，便于AI图像生成
4. 提示词长度控制在50字以内
5. 图片风格应该符合文章主题（专业、清新、科技感等）
6. 避免过于抽象的概念，要描述具体的视觉元素

风格指南：
- 保持与文章主题高度相关
- 画面简洁大气，避免杂乱
- 色彩和谐，符合专业调性
- 可以使用适当的视觉隐喻
- 避免过于幼稚或卡通的风格`}
                />
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-green-500">💡</span>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p className="font-medium">自定义提示</p>
                    <p>配图会在内容创作时根据文章内容自动生成。此提示词用于指导AI如何根据文章内容生成匹配的配图提示词。</p>
                    <p className="mt-1">配图数量可在内容创作页面单独设置（0-5张）</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>选题分析默认设置</CardTitle>
              <CardDescription>
                设置选题分析的默认参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="analysis-count">分析文章数量</Label>
                <Input
                  id="analysis-count"
                  type="number"
                  defaultValue="20"
                  min="10"
                  max="100"
                />
                <p className="text-sm text-muted-foreground">
                  每次分析抓取的文章数量（10-100）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insights-count">生成洞察数量</Label>
                <Input
                  id="insights-count"
                  type="number"
                  defaultValue="5"
                  min="3"
                  max="10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>
                查看系统版本和相关信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">版本</span>
                <span className="font-mono">v1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">数据库</span>
                <span className="font-mono">SQLite</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">框架</span>
                <span className="font-mono">Next.js 15</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 保存和导入导出按钮 */}
      <div className="flex justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            导入配置
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出配置
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">重置</Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {saved ? "已保存" : "保存设置"}
          </Button>
        </div>
      </div>
    </div>
  )
}
