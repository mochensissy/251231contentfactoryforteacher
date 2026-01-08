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
import { FORMATTING_STYLE_PRESETS, WRITING_TONE_PRESETS, PLATFORM_ARTICLE_PRESETS, VIDEO_SCRIPT_TYPE_PRESETS, FormattingStyleKey, WritingToneKey, PlatformArticleKey, VideoScriptTypeKey } from "@/lib/prompt-presets"
import { saveWechatArticleApiConfig, getWechatArticleApiConfig, saveAiApiConfig, getAiApiConfig, savePromptSettings, getPromptSettings, saveImageApiConfig, getImageApiConfig } from "@/lib/api-config"
import { AI_MODEL_PRESETS, getModelById, getPriceLevelText } from "@/lib/ai-model-presets"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  // 文章平台选择状态
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformArticleKey>('wechat')

  // 视频脚本类型状态
  const [selectedVideoScriptType, setSelectedVideoScriptType] = useState<VideoScriptTypeKey>('knowledge')

  // AI模型选择状态
  const [selectedAiModel, setSelectedAiModel] = useState<string>('google/gemini-2.5-flash-lite')
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false)
  const [customModelId, setCustomModelId] = useState<string>('')

  // 选题分析默认设置状态
  const [analysisCount, setAnalysisCount] = useState<string>('20')
  const [insightsCount, setInsightsCount] = useState<string>('5')

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

  // 加载已保存的 API 配置
  useEffect(() => {
    // 公众号文章 API 配置
    const wechatArticleConfig = getWechatArticleApiConfig()
    if (wechatArticleConfig.apiUrl) {
      const urlInput = document.getElementById('wechat-api-url') as HTMLInputElement
      if (urlInput) urlInput.value = wechatArticleConfig.apiUrl
    }
    if (wechatArticleConfig.apiKey) {
      const keyInput = document.getElementById('wechat-api-key') as HTMLInputElement
      if (keyInput) keyInput.value = wechatArticleConfig.apiKey
    }

    // AI API 配置
    const aiConfig = getAiApiConfig()
    if (aiConfig.apiUrl) {
      const urlInput = document.getElementById('ai-api-url') as HTMLInputElement
      if (urlInput) urlInput.value = aiConfig.apiUrl
    }
    if (aiConfig.apiKey) {
      const keyInput = document.getElementById('ai-api-key') as HTMLInputElement
      if (keyInput) keyInput.value = aiConfig.apiKey
    }
    if (aiConfig.model) {
      // 检查是否是预设模型
      const presetModel = getModelById(aiConfig.model)
      if (presetModel) {
        setSelectedAiModel(aiConfig.model)
        setUseCustomModel(false)
      } else {
        // 自定义模型
        setUseCustomModel(true)
        setCustomModelId(aiConfig.model)
      }
    }

    // 加载选题分析默认设置
    try {
      const savedDefaults = localStorage.getItem('analysis-defaults')
      if (savedDefaults) {
        const defaults = JSON.parse(savedDefaults)
        if (defaults.analysisCount) {
          setAnalysisCount(defaults.analysisCount)
        }
        if (defaults.insightsCount) {
          setInsightsCount(defaults.insightsCount)
        }
      }
    } catch (e) {
      console.error('加载分析默认设置失败:', e)
    }

    // 加载提示词设置
    try {
      const promptSettings = getPromptSettings()
      if (promptSettings.coverPrompt) {
        const coverPromptEl = document.getElementById('cover-image-prompt') as HTMLTextAreaElement
        if (coverPromptEl) coverPromptEl.value = promptSettings.coverPrompt
      }
      if (promptSettings.illustrationPrompt) {
        const illPromptEl = document.getElementById('article-image-prompt') as HTMLTextAreaElement
        if (illPromptEl) illPromptEl.value = promptSettings.illustrationPrompt
      }
      // 恢复选择项
      if (promptSettings.selectedPlatform) {
        setSelectedPlatform(promptSettings.selectedPlatform as PlatformArticleKey)
      }
      if (promptSettings.selectedWritingTone) {
        setSelectedWritingTone(promptSettings.selectedWritingTone as WritingToneKey)
      }
      if (promptSettings.selectedFormattingStyle) {
        setSelectedFormattingStyle(promptSettings.selectedFormattingStyle as 'ochre' | 'blue' | 'monochrome' | 'green')
      }
    } catch (e) {
      console.error('加载提示词设置失败:', e)
    }

    // 加载图片API配置
    try {
      const imageConfig = getImageApiConfig()
      if (imageConfig.siliconflow) {
        const sfUrlEl = document.getElementById('siliconflow-api-url') as HTMLInputElement
        const sfKeyEl = document.getElementById('siliconflow-api-key') as HTMLInputElement
        const sfModelEl = document.getElementById('siliconflow-model') as HTMLInputElement
        if (sfUrlEl && imageConfig.siliconflow.apiUrl) sfUrlEl.value = imageConfig.siliconflow.apiUrl
        if (sfKeyEl && imageConfig.siliconflow.apiKey) sfKeyEl.value = imageConfig.siliconflow.apiKey
        if (sfModelEl && imageConfig.siliconflow.model) sfModelEl.value = imageConfig.siliconflow.model
      }
      if (imageConfig.dashscope) {
        const dsUrlEl = document.getElementById('dashscope-api-url') as HTMLInputElement
        const dsKeyEl = document.getElementById('dashscope-api-key') as HTMLInputElement
        if (dsUrlEl && imageConfig.dashscope.apiUrl) dsUrlEl.value = imageConfig.dashscope.apiUrl
        if (dsKeyEl && imageConfig.dashscope.apiKey) dsKeyEl.value = imageConfig.dashscope.apiKey
      }
    } catch (e) {
      console.error('加载图片API配置失败:', e)
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
    // 保存选题分析默认设置到 localStorage
    const analysisDefaults = {
      analysisCount: analysisCount,
      insightsCount: insightsCount,
    }
    localStorage.setItem('analysis-defaults', JSON.stringify(analysisDefaults))

    // 保存提示词设置（包含选择项和自定义提示词）
    const coverPrompt = (document.getElementById('cover-image-prompt') as HTMLTextAreaElement)?.value || ''
    const illustrationPrompt = (document.getElementById('article-image-prompt') as HTMLTextAreaElement)?.value || ''
    const articlePrompt = (document.getElementById('article-prompt') as HTMLTextAreaElement)?.value || ''

    savePromptSettings({
      coverPrompt,
      illustrationPrompt,
      articlePrompt,
      selectedPlatform,
      selectedWritingTone,
      selectedFormattingStyle,
    })

    // 保存硅基流动API配置
    const siliconflowApiUrl = (document.getElementById('siliconflow-api-url') as HTMLInputElement)?.value || ''
    const siliconflowApiKey = (document.getElementById('siliconflow-api-key') as HTMLInputElement)?.value || ''
    const siliconflowModel = (document.getElementById('siliconflow-model') as HTMLInputElement)?.value || ''

    // 保存阿里云通义万相API配置
    const dashscopeApiUrl = (document.getElementById('dashscope-api-url') as HTMLInputElement)?.value || ''
    const dashscopeApiKey = (document.getElementById('dashscope-api-key') as HTMLInputElement)?.value || ''

    saveImageApiConfig({
      siliconflow: { apiUrl: siliconflowApiUrl, apiKey: siliconflowApiKey, model: siliconflowModel },
      dashscope: { apiUrl: dashscopeApiUrl, apiKey: dashscopeApiKey },
    })

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
      // 使用选中的模型（预设或自定义）
      const model = useCustomModel ? customModelId : selectedAiModel

      if (!model) {
        alert('请选择或输入AI模型')
        setAiTestStatus('error')
        setTimeout(() => setAiTestStatus('idle'), 3000)
        return
      }

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
        // 保存 AI API 配置到 localStorage
        saveAiApiConfig({ apiUrl, apiKey, model })
        setAiTestStatus('success')
        setTimeout(() => setAiTestStatus('idle'), 3000)
      } else {
        const errorText = await response.text()
        console.error('AI API Error:', response.status, errorText)
        setAiTestStatus('error')
        setTimeout(() => setAiTestStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('AI Connection Error:', error)
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

      if (!apiKey) {
        alert('请先填写 API Key')
        setWechatArticleTestStatus('error')
        setTimeout(() => setWechatArticleTestStatus('idle'), 3000)
        return
      }

      const response = await fetch('/api/wechat-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: '微信公众号', // 使用更长的关键词
          page: 1,
          apiUrl: apiUrl,
          apiKey: apiKey,
        }),
      })

      const data = await response.json().catch(() => ({}))

      // 如果API返回了响应（无论成功还是业务错误），说明连接是通的
      if (response.ok && data.success) {
        // 保存配置到 localStorage
        saveWechatArticleApiConfig({ apiUrl, apiKey })
        setWechatArticleTestStatus('success')
      } else if (data.error && (data.error.includes('关键词') || data.error.includes('keyword'))) {
        // API返回了关键词相关的业务错误，说明连接是成功的
        saveWechatArticleApiConfig({ apiUrl, apiKey })
        setWechatArticleTestStatus('success')
      } else if (response.status === 400 && data.error) {
        // 其他400错误也可能是API返回的业务错误，说明连接成功
        console.log('API业务错误（但连接成功）:', data.error)
        saveWechatArticleApiConfig({ apiUrl, apiKey })
        setWechatArticleTestStatus('success')
      } else {
        console.error('连接失败:', response.status, data)
        alert(`连接失败: ${data.error || `HTTP ${response.status}`}`)
        setWechatArticleTestStatus('error')
      }
      setTimeout(() => setWechatArticleTestStatus('idle'), 3000)
    } catch (error) {
      console.error('网络错误:', error)
      alert('连接失败: 网络错误')
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>AI模型选择</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-custom-model"
                      checked={useCustomModel}
                      onCheckedChange={(checked) => setUseCustomModel(checked as boolean)}
                    />
                    <Label htmlFor="use-custom-model" className="text-sm text-muted-foreground cursor-pointer">
                      使用自定义模型
                    </Label>
                  </div>
                </div>

                {!useCustomModel ? (
                  <>
                    <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择AI模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODEL_PRESETS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">({model.provider})</span>
                              {model.recommended && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">推荐</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 显示选中模型的详细信息 */}
                    {selectedAiModel && getModelById(selectedAiModel) && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{getModelById(selectedAiModel)?.name}</span>
                          <span className="text-xs">{getPriceLevelText(getModelById(selectedAiModel)?.priceLevel || 1)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{getModelById(selectedAiModel)?.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {getModelById(selectedAiModel)?.tags.map((tag, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">价格参考: {getModelById(selectedAiModel)?.priceNote}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="输入模型ID，如 anthropic/claude-3-opus"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      查看可用模型：<a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenRouter 模型列表</a>
                    </p>
                  </div>
                )}
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
                  defaultValue="JZLc29ca3bfdebd2bf3"
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
                配置AI生成文章的提示词模板，支持多平台定制
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 平台选择标签 */}
              <div className="space-y-2">
                <Label>选择发布平台</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PLATFORM_ARTICLE_PRESETS) as PlatformArticleKey[]).map((key) => {
                    const preset = PLATFORM_ARTICLE_PRESETS[key]
                    const isSelected = selectedPlatform === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPlatform(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSelected
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
                  {PLATFORM_ARTICLE_PRESETS[selectedPlatform].description}
                </p>
              </div>

              <Separator />

              {/* 微信公众号：使用文风选择 */}
              {selectedPlatform === 'wechat' && (
                <>
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
                        <p>切换文风会加载对应的预设提示词。您可以在此基础上自行修改。</p>
                        <p className="mt-1">变量占位符：{'{'}topic{'}'}, {'{'}description{'}'}, {'{'}outline{'}'}, {'{'}wordCount{'}'}, {'{'}imageCount{'}'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 小红书/推特：使用平台专属提示词 */}
              {(selectedPlatform === 'xiaohongshu' || selectedPlatform === 'twitter') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="platform-prompt">{PLATFORM_ARTICLE_PRESETS[selectedPlatform].name}提示词模板</Label>
                    <span className="text-xs text-muted-foreground">💡 可在预设基础上自行修改</span>
                  </div>
                  <Textarea
                    id="platform-prompt"
                    rows={18}
                    placeholder={`输入${PLATFORM_ARTICLE_PRESETS[selectedPlatform].name}内容生成提示词...`}
                    value={'prompt' in PLATFORM_ARTICLE_PRESETS[selectedPlatform] ? (PLATFORM_ARTICLE_PRESETS[selectedPlatform] as { prompt: string }).prompt : ''}
                    onChange={() => {/* 用户可以编辑 */ }}
                  />
                  <div className={`flex items-start gap-2 p-3 rounded-lg ${selectedPlatform === 'xiaohongshu' ? 'bg-red-50 dark:bg-red-950' : 'bg-sky-50 dark:bg-sky-950'}`}>
                    <span className={selectedPlatform === 'xiaohongshu' ? 'text-red-500' : 'text-sky-500'}>💡</span>
                    <div className={`text-sm ${selectedPlatform === 'xiaohongshu' ? 'text-red-700 dark:text-red-300' : 'text-sky-700 dark:text-sky-300'}`}>
                      <p className="font-medium">{PLATFORM_ARTICLE_PRESETS[selectedPlatform].name}内容特点</p>
                      <p>{selectedPlatform === 'xiaohongshu' ? '小红书注重真实分享、种草体验，需要emoji和话题标签' : '推特/X强调简洁有力、观点鲜明，支持Thread长文'}</p>
                      <p className="mt-1">变量占位符：{'{'}topic{'}'}, {'{'}description{'}'}</p>
                    </div>
                  </div>
                </div>
              )}
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
                配置AI生成视频脚本的提示词模板，支持按视频类型定制
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 视频类型选择标签 */}
              <div className="space-y-2">
                <Label>选择视频类型</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(VIDEO_SCRIPT_TYPE_PRESETS) as VideoScriptTypeKey[]).map((key) => {
                    const preset = VIDEO_SCRIPT_TYPE_PRESETS[key]
                    const isSelected = selectedVideoScriptType === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedVideoScriptType(key)}
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
                  {VIDEO_SCRIPT_TYPE_PRESETS[selectedVideoScriptType].description}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="video-script-prompt">
                    {VIDEO_SCRIPT_TYPE_PRESETS[selectedVideoScriptType].name}脚本提示词模板
                  </Label>
                  <span className="text-xs text-muted-foreground">💡 可在预设基础上自行修改</span>
                </div>
                <Textarea
                  id="video-script-prompt"
                  rows={18}
                  placeholder="输入视频脚本生成提示词..."
                  value={VIDEO_SCRIPT_TYPE_PRESETS[selectedVideoScriptType].prompt}
                  onChange={() => {/* 用户可以编辑，但切换类型会重置 */ }}
                />
                <div className="flex items-start gap-2 p-3 bg-violet-50 dark:bg-violet-950 rounded-lg">
                  <span className="text-violet-500">💡</span>
                  <div className="text-sm text-violet-700 dark:text-violet-300">
                    <p className="font-medium">类型差异化提示</p>
                    <p>不同视频类型有不同的结构和风格要求。切换类型会加载对应的预设提示词。</p>
                    <p className="mt-1">变量占位符：{'{'}topic{'}'}, {'{'}description{'}'}, {'{'}duration{'}'}</p>
                  </div>
                </div>
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
                <Label htmlFor="analysis-count">AI分析文章数量</Label>
                <Input
                  id="analysis-count"
                  type="number"
                  value={analysisCount}
                  onChange={(e) => setAnalysisCount(e.target.value)}
                  min="5"
                  max="20"
                />
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <span className="text-amber-500">⚠️</span>
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">费用说明</p>
                    <p>极致了API每次固定返回20篇文章，费用0.4元（0.02元/篇），<strong>无法减少</strong>。</p>
                    <p className="mt-1">此设置仅控制用于AI分析的文章数量（5-20篇）。减少分析数量可节省AI token消耗，但不影响API费用。</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insights-count">生成洞察数量</Label>
                <Input
                  id="insights-count"
                  type="number"
                  value={insightsCount}
                  onChange={(e) => setInsightsCount(e.target.value)}
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
