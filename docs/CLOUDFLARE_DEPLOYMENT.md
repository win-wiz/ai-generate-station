# Cloudflare Pages 部署指南

本文档详细说明如何将 AI Generate Station 项目部署到 Cloudflare Pages。

## 🚀 快速部署

### 方法一：使用自动化脚本（推荐）

```bash
# 运行自动化部署脚本
npm run pages:deploy
```

### 方法二：手动部署

```bash
# 1. 构建项目
npm run build:cf

# 2. 部署到 Cloudflare Pages
wrangler pages deploy .vercel/output/static --project-name=ai-generate-station
```

## 📋 部署前准备

### 1. 安装依赖

确保已安装 Cloudflare 相关依赖：

```bash
npm install @cloudflare/next-on-pages --save-dev
```

### 2. 配置 Wrangler

```bash
# 登录 Cloudflare
wrangler login

# 验证登录状态
wrangler whoami
```

### 3. 创建 D1 数据库

```bash
# 创建生产数据库
wrangler d1 create ai-generate-station-db

# 创建开发数据库
wrangler d1 create ai-generate-station-db-dev
```

### 4. 更新 wrangler.toml

将创建的数据库 ID 填入 `wrangler.toml` 文件：

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "ai-generate-station-db"
database_id = "your-production-database-id"

[[env.development.d1_databases]]
binding = "DB"
database_name = "ai-generate-station-db-dev"
database_id = "your-development-database-id"
```

## 🔧 配置说明

### 环境变量配置

在 Cloudflare Pages 控制台中设置以下环境变量：

#### 生产环境变量
```
NODE_ENV=production
DATABASE_URL=d1-remote
NEXTAUTH_URL=https://your-domain.pages.dev
AUTH_SECRET=your-auth-secret
AUTH_GITHUB_ID=your-github-oauth-id
AUTH_GITHUB_SECRET=your-github-oauth-secret
```

#### 开发环境变量
```
NODE_ENV=development
DATABASE_URL=file:./db.sqlite
NEXTAUTH_URL=http://localhost:3000
```

### 构建配置

项目包含两个 Next.js 配置文件：

- `next.config.js` - 本地开发配置
- `next.config.cloudflare.js` - Cloudflare Pages 专用配置

部署时会自动使用 Cloudflare 专用配置。

## 🗄️ 数据库迁移

### 运行数据库迁移

```bash
# 生成迁移文件
npm run db:generate

# 应用迁移到 D1 数据库
wrangler d1 migrations apply ai-generate-station-db
```

### 查看数据库状态

```bash
# 查看数据库表
wrangler d1 execute ai-generate-station-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# 运行自定义查询
wrangler d1 execute ai-generate-station-db --command="SELECT COUNT(*) FROM users;"
```

## 🔍 故障排除

### 常见问题

#### 1. 构建失败：`Can't redefine existing key`

**原因**：`wrangler.toml` 配置文件中有重复的键值。

**解决方案**：检查并移除重复的配置项，特别是 `compatibility_flags` 和 `nodejs_compat`。

#### 2. 数据库连接失败

**原因**：D1 数据库绑定未正确配置。

**解决方案**：
1. 确保 `wrangler.toml` 中的数据库 ID 正确
2. 验证环境变量 `DATABASE_URL=d1-remote`
3. 检查数据库是否已创建

#### 3. 静态资源 404 错误

**原因**：Next.js 静态导出配置问题。

**解决方案**：
1. 确保使用 `next.config.cloudflare.js` 配置
2. 检查 `output: 'export'` 设置
3. 验证 `trailingSlash: true` 配置

#### 4. API 路由不工作

**原因**：Cloudflare Pages 不支持 Next.js API 路由。

**解决方案**：
1. 使用 Cloudflare Workers 处理 API 请求
2. 或者迁移到 Cloudflare Functions
3. 考虑使用外部 API 服务

### 调试命令

```bash
# 本地预览 Cloudflare Pages 构建
npm run preview:cf

# 查看构建日志
wrangler pages deployment list

# 查看实时日志
wrangler pages deployment tail
```

## 📊 性能优化

### 1. 静态资源优化

- 启用 Cloudflare CDN 缓存
- 使用 WebP 图片格式
- 启用 Brotli 压缩

### 2. 数据库优化

- 使用 D1 数据库索引
- 实施查询缓存策略
- 优化数据库连接池

### 3. 代码分割

- 启用 Webpack 代码分割
- 使用动态导入
- 优化包大小

## 🔐 安全配置

### 1. 环境变量安全

- 使用 Cloudflare Pages 环境变量管理
- 不要在代码中硬编码敏感信息
- 定期轮换 API 密钥

### 2. 访问控制

- 配置 Cloudflare Access（如需要）
- 设置 IP 白名单（如需要）
- 启用 DDoS 保护

### 3. 内容安全策略

项目已配置基本的 CSP 头，可根据需要调整 `_headers` 文件。

## 📈 监控和分析

### 1. Cloudflare Analytics

- 启用 Web Analytics
- 监控性能指标
- 跟踪错误率

### 2. 日志监控

```bash
# 查看实时日志
wrangler pages deployment tail

# 查看特定部署的日志
wrangler pages deployment tail --deployment-id=<deployment-id>
```

## 🔄 CI/CD 集成

### GitHub Actions 示例

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for Cloudflare
        run: npm run build:cf
        env:
          NODE_ENV: production
          DATABASE_URL: d1-remote
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ai-generate-station
          directory: .vercel/output/static
```

## 📞 支持

如果遇到部署问题，请：

1. 检查 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 查看项目的 GitHub Issues
3. 联系项目维护者

---

**注意**：首次部署可能需要 5-10 分钟来完成所有配置。后续部署通常在 1-2 分钟内完成。