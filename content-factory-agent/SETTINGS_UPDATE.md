# 设置页面更新说明

## 更新日期
2025-12-19

## 主要变更

### 1. API配置整理
将所有需要调用API的配置统一整理到"API配置"标签页：

#### ✅ AI模型配置 (OpenRouter)
- **用途**: 内容分析和文章生成
- **默认配置**:
  - API地址: `https://openrouter.ai/api/v1/chat/completions`
  - 模型: `google/gemini-2.0-flash-thinking-exp:free` (推荐免费模型)
  - API Key: 需用户从 [OpenRouter](https://openrouter.ai/keys) 获取

#### ✅ 公众号文章API (大价啦)
- **用途**: 获取公众号文章数据用于选题分析
- **默认配置**:
  - API地址: `https://www.dajiala.com/fbmain/monitor/v3/kw_search`
  - API Key: `JZL34baea50c020a325` (已预填)

#### ✅ 硅基流动 - 文章配图生成
- **用途**: 生成文章内的配图
- **默认配置**:
  - API地址: `https://api.siliconflow.cn/v1/images/generations`
  - 模型: `Kwai-Kolors/Kolors`
  - API Key: 需用户从 [硅基流动](https://cloud.siliconflow.cn) 获取

#### ✅ 阿里云通义万相 - 公众号封面图生成
- **用途**: 生成公众号文章封面图
- **默认配置**:
  - API地址: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`
  - API Key: 需用户从 [阿里云DashScope控制台](https://dashscope.console.aliyun.com) 获取

### 2. 平台配置简化
#### ✅ 微信公众号配置
- API地址: n8n webhook地址（用户配置）
- 公众号AppID
- 公众号AppSecret
- 💡 提示：小红书不需要API配置，生成文章后直接扫码发布即可

#### ❌ 移除内容
- **小红书配置** (不需要API，直接扫码发布)
- **Unsplash配置** (已替换为硅基流动和阿里云通义万相)

### 3. 通用设置增强
#### ✨ 新增：文章生成提示词配置
- 支持自定义文章生成的Prompt模板
- 预填充当前使用的默认提示词
- 支持变量占位符: `{topic}`, `{description}`, `{outline}`, `{wordCount}`, `{style}`, `{imageCount}`

#### ✨ 新增：文章排版提示词配置
- 支持自定义微信公众号排版的Prompt模板
- 预填充当前使用的默认排版提示词（赭黄色风格）
- 支持变量占位符: `{title}`, `{content}`
- 包含完整的排版风格指南和图像生成指南

#### ✅ 保留内容
- 内容创作默认设置（字数、风格、配图数）
- 选题分析默认设置（文章数量、洞察数量）
- 系统信息展示

### 4. 配置管理功能
#### ✨ 一键导出配置
- 将所有配置导出为JSON文件
- 文件名格式: `settings-YYYY-MM-DD.json`
- 包含所有API配置、平台配置、提示词和默认设置

#### ✨ 一键导入配置
- 从JSON文件导入配置
- 支持批量恢复所有设置
- 格式验证，导入失败时给出提示

## API使用场景汇总

| API服务 | 调用场景 | 环境变量 |
|---------|---------|----------|
| OpenRouter (AI模型) | 选题分析、文章生成、小红书改写 | `OPENROUTER_API_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| 大价啦 (公众号文章) | 关键词搜索公众号文章 | `WECHAT_API_URL`, `WECHAT_API_KEY` |
| 硅基流动 (图片生成) | 文章配图生成 | `SILICONFLOW_API_URL`, `SILICONFLOW_API_KEY`, `SILICONFLOW_MODEL` |
| 阿里云通义万相 | 公众号封面图生成 | `DASHSCOPE_API_URL`, `DASHSCOPE_API_KEY` |
| n8n Webhook | 发布到公众号 | 用户自行配置 |

## 代码文件位置

- 设置页面: `/app/settings/page.tsx`
- AI客户端: `/lib/ai-client.ts`
- 图片生成客户端(硅基): `/lib/image-client.ts`
- 图片生成客户端(阿里云): `/lib/dashscope-client.ts`
- 公众号文章API: `/app/api/wechat-articles/route.ts`

## 用户操作指南

### 首次配置步骤
1. 在"API配置"页面填写各个API Key
2. 在"平台配置"页面配置微信公众号信息（如需发布）
3. 在"通用设置"页面根据需要调整提示词和默认参数
4. 点击"保存设置"
5. 点击"导出配置"备份配置文件

### 配置迁移步骤
1. 在原环境点击"导出配置"下载配置文件
2. 在新环境进入设置页面
3. 点击"导入配置"选择之前导出的JSON文件
4. 确认配置无误后点击"保存设置"

## 注意事项

1. **API Key安全**: 所有API Key输入框均为password类型，不会明文显示
2. **配置备份**: 建议定期导出配置文件备份
3. **提示词调试**: 修改提示词后建议先测试生成效果
4. **环境变量**: 当前配置仅保存在浏览器，重启服务器需要重新配置。建议使用环境变量（`.env`文件）持久化配置

## 未来优化建议

1. 添加API连接测试功能（测试按钮）
2. 配置持久化到数据库（Prisma Settings表）
3. 添加配置历史记录和版本管理
4. 支持多套配置方案切换
5. 添加配置模板市场



