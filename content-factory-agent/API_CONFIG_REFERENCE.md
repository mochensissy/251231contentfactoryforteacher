# API配置快速参考

## 🔑 必需配置

### OpenRouter (AI模型)
```
API地址: https://openrouter.ai/api/v1/chat/completions
模型: google/gemini-2.0-flash-thinking-exp:free
API Key: 👉 https://openrouter.ai/keys
```

---

## 🎨 图片生成配置

### 硅基流动（文章配图）
```
API地址: https://api.siliconflow.cn/v1/images/generations
模型: Kwai-Kolors/Kolors
API Key: 👉 https://cloud.siliconflow.cn
```

### 阿里云通义万相（封面图）
```
API地址: https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis
API Key: 👉 https://dashscope.console.aliyun.com
```

---

## 📊 数据获取配置

### 大价啦（公众号文章）
```
API地址: https://www.dajiala.com/fbmain/monitor/v3/kw_search
API Key: JZL34baea50c020a325 (已预填)
```

---

## 📱 平台发布配置（可选）

### 微信公众号
```
API地址: [您的n8n webhook地址]
AppID: wx...
AppSecret: [从公众平台获取]
```

### 小红书
```
✅ 无需API配置，扫码直接发布
```

---

## 📝 环境变量参考

创建 `.env` 文件，填入以下配置：

```bash
# AI模型配置
OPENROUTER_API_URL="https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODEL="google/gemini-2.0-flash-thinking-exp:free"

# 公众号文章API
WECHAT_API_URL="https://www.dajiala.com/fbmain/monitor/v3/kw_search"
WECHAT_API_KEY="JZL34baea50c020a325"

# 硅基流动（文章配图）
SILICONFLOW_API_URL="https://api.siliconflow.cn/v1/images/generations"
SILICONFLOW_API_KEY="sk-..."
SILICONFLOW_MODEL="Kwai-Kolors/Kolors"

# 阿里云通义万相（封面图）
DASHSCOPE_API_URL="https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
DASHSCOPE_API_KEY="sk-..."

# 微信公众号（可选）
WECHAT_MP_API_URL="https://your-n8n-server.com/webhook/wechat-publish"
WECHAT_MP_APPID="wx..."
WECHAT_MP_SECRET="..."
```

---

## 💡 快速提示

1. **最小配置**：只需配置 OpenRouter API Key 即可开始使用
2. **推荐配置**：OpenRouter + 硅基流动 + 阿里云通义万相
3. **完整配置**：所有API都配置，获得完整功能

---

## 🔗 快速链接

| 服务 | 注册/获取Key |
|------|-------------|
| OpenRouter | https://openrouter.ai/keys |
| 硅基流动 | https://cloud.siliconflow.cn |
| 阿里云DashScope | https://dashscope.console.aliyun.com |
| OpenRouter模型列表 | https://openrouter.ai/models |

---

**提示**：配置完成后记得在设置页面点击"导出配置"备份！



