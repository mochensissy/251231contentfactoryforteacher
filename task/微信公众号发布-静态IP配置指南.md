# 微信公众号发布：静态 IP 配置指南
> **通用性说明**：本指南适用于任何需要配置**静态 IP 白名单**的微信公众号发布系统。
## 1. 核心原理
微信公众号要求调用 API 的服务器 IP 必须在白名单内。由于云平台 IP 经常变动，我们通过一个**固定中转站 (Fixie代理)** 发出请求。
- **请求路径**：云服务器 -> Fixie 代理 (固定 IP) -> 微信官方服务器
- **结果**：微信看到的永远是 Fixie 的固定 IP，实现长期稳定发布。
---
## 2. 当前项目配置示例
### ✅ 已配置的 Proxy URL
```
http://fixie:Oi8dWvKcN2B6rfi@criterium.usefixie.com:80
```
> **⚠️ 安全提示**：复用时请获取独立的 Proxy URL，不要直接在正式环境暴露此 Token。
### ✅ 已配置的静态 IP (已在微信后台白名单)
```
52.5.155.132
52.87.92.133
```
---
## 3. 完整配置步骤 (新项目复用)
### 第一步：注册并获取 Fixie 代理信息
1. 登录 [usefixie.com](https://www.usefixie.com/)。
2. 创建新应用：类型选 **HTTP/HTTPS**，套餐选 **Tricycle** (免费版)。
3. 在 **Details** 详情页记录 **Proxy URL** 和 **Outbound IPs**。
### 第二步：在云平台配置环境变量
以 Railway 为例：变量名 `WECHAT_PROXY_URL`，变量值填完整 Proxy URL。
### 第三步：在微信后台设置 IP 白名单
在「基本配置」->「IP白名单」中填入 Fixie 的 **2 个 Outbound IPs**。
---
## 4. 技术实现 (代码参考)
### 安装依赖
`npm install https-proxy-agent node-fetch`
### 核心代码
```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
const proxyAgent = process.env.WECHAT_PROXY_URL ? new HttpsProxyAgent(process.env.WECHAT_PROXY_URL) : null;
const response = await fetch('https://api.weixin.qq.com/xxx', {
    agent: proxyAgent,
    method: 'POST',
    // ...
});
```
---
## 5. 常见问题排查
- **❌ IP 错误**：检查环境变量 `WECHAT_PROXY_URL` 是否生效，微信后台 IP 是否填对。
- **❌ 额度用完**：免费版每月 500 次，若用完需升级套餐或更换账号。
---
*更新日期：2026-01-19*
