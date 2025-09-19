# 🔧 立即修复 Cloudflare 构建问题

## 🎯 问题根源

Cloudflare Pages 要求所有动态路由使用 Edge Runtime，但项目使用了 Node.js 特定依赖，导致构建失败。

## ⚡ 立即解决方案

### 1. 更新 Cloudflare Dashboard 构建配置

**构建命令：**
```bash
pnpm install && NODE_ENV=production pnpm build
```

**构建输出目录：**
```
.next
```

**环境变量：**
```env
NODE_ENV=production
DATABASE_URL=d1-remote
SKIP_ENV_VALIDATION=true
```

### 2. 修改 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    runtime: 'nodejs',
  },
  // 禁用 Edge Runtime 强制要求
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

module.exports = nextConfig;
```

### 3. 创建 _worker.js 文件

```javascript
// _worker.js
export default {
  async fetch(request, env, ctx) {
    // 简单的代理到 Next.js
    return fetch(request);
  },
};
```

### 4. 更新 wrangler.toml

```toml
name = "ai-generate-station"
compatibility_date = "2024-01-15"
main = "_worker.js"

[[d1_databases]]
binding = "DB"
database_name = "ai-generate-station-db"
database_id = "513ef7b3-5285-42bb-a00d-a83c4e825586"

[env.production.vars]
NODE_ENV = "production"
DATABASE_URL = "d1-remote"
```

## 🚀 部署步骤

1. **在 Cloudflare Dashboard 中：**
   - 项目设置 → 构建和部署
   - 构建命令：`pnpm install && NODE_ENV=production pnpm build`
   - 构建输出目录：`.next`
   - Node.js 版本：`18.20.4`

2. **添加环境变量：**
   ```
   NODE_ENV=production
   DATABASE_URL=d1-remote
   SKIP_ENV_VALIDATION=true
   AUTH_SECRET=OdqUfqNXPi1t+votQYvsG0LCXm5ffibDKxFSUbcUvTI=
   AUTH_GITHUB_ID=Ov23likYXpJCoyWOCeyj
   AUTH_GITHUB_SECRET=304ebf6b7fe9a86fef5547ccf04877677cfe67a9
   NEXTAUTH_URL=https://your-domain.pages.dev
   ```

3. **触发重新部署**

## ✅ 预期结果

- 构建成功完成
- 所有路由正常工作
- 数据库连接正常（使用 D1）
- 认证功能正常

## 🔄 如果仍然失败

尝试以下备选方案：

### 备选方案 1：使用 Vercel 部署
```bash
pnpm add -D vercel
npx vercel --prod
```

### 备选方案 2：使用 Netlify
```bash
pnpm add -D @netlify/plugin-nextjs
# 配置 netlify.toml
```

### 备选方案 3：Docker 部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

**这个解决方案应该能让你的项目立即在 Cloudflare Pages 上成功部署！**