"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Key, Link as LinkIcon, Save, Download, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react"

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
              ;(document.getElementById('ai-api-url') as HTMLInputElement).value = config.ai.apiUrl || ''
              ;(document.getElementById('ai-api-key') as HTMLInputElement).value = config.ai.apiKey || ''
              ;(document.getElementById('ai-model') as HTMLInputElement).value = config.ai.model || ''
            }
            
            // 导入公众号文章API配置
            if (config.wechatArticles) {
              ;(document.getElementById('wechat-api-url') as HTMLInputElement).value = config.wechatArticles.apiUrl || ''
              ;(document.getElementById('wechat-api-key') as HTMLInputElement).value = config.wechatArticles.apiKey || ''
            }
            
            // 导入硅基流动配置
            if (config.siliconflow) {
              ;(document.getElementById('siliconflow-api-url') as HTMLInputElement).value = config.siliconflow.apiUrl || ''
              ;(document.getElementById('siliconflow-api-key') as HTMLInputElement).value = config.siliconflow.apiKey || ''
              ;(document.getElementById('siliconflow-model') as HTMLInputElement).value = config.siliconflow.model || ''
            }
            
            // 导入阿里云通义万相配置
            if (config.dashscope) {
              ;(document.getElementById('dashscope-api-url') as HTMLInputElement).value = config.dashscope.apiUrl || ''
              ;(document.getElementById('dashscope-api-key') as HTMLInputElement).value = config.dashscope.apiKey || ''
            }
            
            // 导入公众号配置
            if (config.wechatMp) {
              ;(document.getElementById('mp-api-url') as HTMLInputElement).value = config.wechatMp.apiUrl || ''
              ;(document.getElementById('mp-appid') as HTMLInputElement).value = config.wechatMp.appId || ''
              ;(document.getElementById('mp-secret') as HTMLInputElement).value = config.wechatMp.appSecret || ''
            }
            
            // 导入提示词配置
            if (config.prompts) {
              ;(document.getElementById('article-prompt') as HTMLTextAreaElement).value = config.prompts.article || ''
              ;(document.getElementById('formatting-prompt') as HTMLTextAreaElement).value = config.prompts.formatting || ''
            }
            
            // 导入默认设置
            if (config.defaults) {
              ;(document.getElementById('default-word-count') as HTMLInputElement).value = config.defaults.wordCount || ''
              ;(document.getElementById('default-style') as HTMLInputElement).value = config.defaults.style || ''
              ;(document.getElementById('default-images') as HTMLInputElement).value = config.defaults.images || ''
              ;(document.getElementById('analysis-count') as HTMLInputElement).value = config.defaults.analysisCount || ''
              ;(document.getElementById('insights-count') as HTMLInputElement).value = config.defaults.insightsCount || ''
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
              <CardTitle>微信公众号配置</CardTitle>
              <CardDescription>
                配置微信公众号发布API（用于自动发布到公众号）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mp-api-url">API地址</Label>
                <Input
                  id="mp-api-url"
                  placeholder="https://your-n8n-server.com/webhook/wechat-publish"
                  defaultValue="https://n8n.aiwensi.com/webhook/publish-to-wechat"
                />
                <p className="text-sm text-muted-foreground">
                  请填写您的n8n服务器webhook地址
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp-appid">公众号AppID</Label>
                <Input
                  id="mp-appid"
                  placeholder="wx..."
                  defaultValue="wx2da3d685de860b66"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp-secret">公众号AppSecret</Label>
                <Input
                  id="mp-secret"
                  type="password"
                  placeholder="请输入AppSecret"
                  defaultValue="53d963db6d28a23b51ba9ebdc97f2b44"
                />
              </div>

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
                配置AI生成文章的提示词模板，可根据需要调整生成格式和风格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="article-prompt">提示词模板</Label>
                <Textarea
                  id="article-prompt"
                  rows={12}
                  placeholder="输入文章生成提示词..."
                  defaultValue={`你是一位专业的内容创作者。请根据以下要求创作一篇高质量的文章。

选题标题：{topic}
选题描述：{description}
建议大纲：{outline}

写作要求：
1. 字数范围：{wordCount}字
2. 写作风格：{style}
3. 文章格式：Markdown格式
4. 需要插入 {imageCount} 张配图占位符（使用 ![描述](IMAGE_PLACEHOLDER_X) 格式，X为序号）

文章结构要求：
- 开头：吸引人的引入，说明文章价值
- 主体：清晰的层次结构，使用二级、三级标题
- 结尾：总结要点，给出可行建议
- 配图：在合适的位置插入配图占位符

请直接输出Markdown格式的文章内容，不要有其他说明。`}
                />
                <p className="text-sm text-muted-foreground">
                  提示：使用 {'{'}topic{'}'}, {'{'}description{'}'}, {'{'}outline{'}'}, {'{'}wordCount{'}'}, {'{'}style{'}'}, {'{'}imageCount{'}'} 作为变量占位符
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>文章排版提示词</CardTitle>
              <CardDescription>
                配置微信公众号文章排版的提示词模板，控制HTML输出格式和样式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formatting-prompt">排版提示词模板</Label>
                <Textarea
                  id="formatting-prompt"
                  rows={20}
                  placeholder="输入排版提示词..."
                  defaultValue={`你是一个专门为微信公众号文章排版AI助手。你的唯一任务是接收用户输入并排版，并输出一个包含标题、HTML内容和图像提示词的JSON对象。你的所有输出，都必须严格遵循指定的JSON格式，绝不能包含任何额外的文字、解释或代码标记。

现在，请扮演一位顶级的微信公众号新媒体主编和专业的视觉艺术总监，根据用户提供的[文章内容]，完成以下任务，并将结果填入JSON对象的相应字段中：

1. **主标题**：文章开头的主标题就使用推送过来的标题即可。
2. **排版**：
   * **格式排版**：**在不删减任何已生成内容的前提下**，你必须对全文进行精细的HTML排版，严格遵循下方的【排版风格指南】。
3. **生成图像提示词**：严格遵循下方的【图像提示词生成指南】，为文章创作一个风格专业、高度契合文章主题的AI绘画图像提示词。
4. 不要自主发挥，给你什么文章，只需要排版就行。

---
### 【排版风格指南】

你必须将以下所有规则视为铁律，严格执行，以打造专业、清晰、高度可读的移动端阅读体验：

1. **整体容器**:
   style="max-width: 680px; margin: 20px auto; padding: 30px; color: #3f3f3f; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif; letter-spacing: 0.5px; line-height: 1.8;"

2. **小标题 (H2)**:
   * **小标题前面绝不能出现任何表情符号。**
   * **【赭黄色】** 小标题的CSS样式必须为:
   style="font-size: 18px; font-weight: bold; color: #C08B40; text-align: center; margin-top: 45px; margin-bottom: 25px;"

3. **段落 (P)**:
   * **(短段落铁律)** **每个段落严格限制在 1-2 句话。严禁出现任何超过3句话的长段落。**
   * style="margin-bottom: 20px; font-size: 15px;"

4. **重点强调 (Strong)**:
   * **【赭黄色】** 必须为 <strong> 标签添加内联样式: style="color: #C08B40; font-weight: 600;"

5. **引用/要点总结 (Blockquote)**:
   * **【新增样式】** 当需要引用名言或总结要点时，必须使用 <blockquote> 标签。
   * **【赭黄色】** <blockquote> 的CSS样式必须为:
   style="border-left: 4px solid #C08B40; background-color: #F8F8F8; padding: 15px 20px; margin: 30px 0; color: #555555; font-style: italic;"

---
### 【图像提示词生成指南】

1. **核心风格**: 必须采用现代的、写实或半写实的企业/商业/咨询公司专业摄影风格
2. **概念与隐喻**: 禁止字面化表达，必须使用隐喻
3. **氛围与色调**: 氛围必须是专业、理性、积极向上、沉稳的
4. **构图与细节**: 构图必须简洁、大气
5. **负面指令**: 绝对禁止生成任何诡异、阴暗、恐怖、幼稚、卡通的元素，不要出现人物图像
6. 提示词应该基于文章内容生成，不要看起来没有关联。

---
[文章内容开始]
标题: {title}

{content}
[文章内容结束]

请直接返回JSON格式的结果，格式如下：
{
  "title": "文章标题",
  "html_content": "<div>排版好的HTML内容</div>",
  "prompt": "图像生成提示词"
}`}
                />
                <p className="text-sm text-muted-foreground">
                  提示：使用 {'{'}title{'}'}, {'{'}content{'}'} 作为变量占位符
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>内容创作默认设置</CardTitle>
              <CardDescription>
                设置AI创作的默认参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-word-count">默认文章长度</Label>
                <Input
                  id="default-word-count"
                  defaultValue="1000-1500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-style">默认写作风格</Label>
                <Input
                  id="default-style"
                  defaultValue="专业严谨"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-images">默认配图数量</Label>
                <Input
                  id="default-images"
                  type="number"
                  defaultValue="3"
                  min="0"
                  max="10"
                />
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
