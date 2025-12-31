# 内容工厂 Agent

AI驱动的内容创作与发布平台，从选题分析到内容发布的全链路解决方案。

## 项目特性

- 🔍 **选题分析**：基于关键词分析公众号文章，生成数据洞察和选题建议 ✅ **已实现**
- ✍️ **AI创作**：一键生成高质量文章，自动插入Unsplash配图（原型已完成）
- 📝 **发布管理**：统一管理文章，支持发布到小红书和公众号（原型已完成）
- ⚙️ **灵活配置**：支持多种AI模型和第三方API配置（原型已完成）

## 最新更新 🎉

### 选题分析功能已上线！

选题分析功能已经完成真实API集成，可以：
- ✅ 根据关键词获取真实公众号文章数据
- ✅ 自动分析点赞TOP5和互动率TOP5
- ✅ 生成高频词云
- ✅ AI生成5个选题洞察建议

详细使用说明请查看 [选题分析功能使用指南](./TOPIC_ANALYSIS_GUIDE.md)

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI组件**: shadcn/ui + Tailwind CSS
- **数据库**: SQLite + Prisma ORM
- **语言**: TypeScript
- **状态管理**: React Hooks
- **图标**: Lucide React

## 项目结构

```
content-factory-agent/
├── app/                          # Next.js App Router
│   ├── api/                      # API路由
│   │   ├── wechat-articles/      # 公众号文章获取API
│   │   └── analyze/              # 文章分析API
│   ├── page.tsx                  # 首页/仪表盘
│   ├── topic-analysis/           # 选题分析页面 ✅ 已实现
│   ├── content-creation/         # 内容创作页面
│   ├── publish-management/       # 发布管理页面
│   ├── settings/                 # 设置页面
│   ├── layout.tsx                # 主布局
│   └── globals.css               # 全局样式
├── components/
│   ├── ui/                       # shadcn/ui 组件
│   └── main-nav.tsx              # 导航组件
├── lib/
│   ├── utils.ts                  # 工具函数
│   └── types.ts                  # TypeScript类型定义
├── prisma/
│   └── schema.prisma             # 数据库模型
└── public/                       # 静态资源
```

## 数据库设计

### 主要表结构

1. **analysis_tasks** - 分析任务表
   - 存储选题分析任务信息

2. **insight_reports** - 洞察报告表
   - 存储分析结果（点赞TOP5、互动率TOP5、词云、选题洞察）

3. **articles** - 文章表
   - 存储AI生成的文章内容
   - 状态：draft（草稿）、pending_review（待审核）、published（已发布）

4. **publish_records** - 发布记录表
   - 记录文章发布到各平台的历史

5. **settings** - 系统配置表
   - 存储API密钥等配置信息

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# .env
DATABASE_URL="file:./dev.db"
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 页面功能说明

### 首页（仪表盘）
- 快速访问各功能模块
- 显示数据统计概览
- 最近活动记录

### 选题分析
- 输入关键词进行分析
- 查看点赞TOP5文章
- 查看互动率TOP5文章
- 高频词云可视化
- 获取5个AI生成的选题洞察

### 内容创作
- 从洞察报告选择选题
- 自定义输入主题
- 设置文章长度、风格、配图数量
- 实时显示创作进度
- 预览生成的文章

### 发布管理
- 文章列表展示
- 按状态筛选
- 搜索功能
- 发布到小红书/公众号
- 文章编辑、预览、删除

### 设置
- AI模型API配置
- 公众号文章抓取API配置
- Unsplash配置
- 小红书发布API配置
- 公众号发布API配置
- 系统默认参数设置

## 后续开发计划

目前项目已完成所有页面原型，后续需要实现：

1. **API集成**
   - 接入OpenAI兼容的AI接口
   - 接入公众号文章抓取API
   - 接入Unsplash图片API
   - 接入小红书发布API
   - 接入公众号发布API

2. **数据持久化**
   - 实现完整的CRUD操作
   - 添加API路由处理

3. **功能增强**
   - 添加文章编辑器
   - 实现定时发布
   - 添加发布历史查看
   - 实现数据分析统计

4. **用户体验优化**
   - 添加加载状态
   - 错误处理和提示
   - 表单验证
   - 响应式优化

## 许可证

MIT
