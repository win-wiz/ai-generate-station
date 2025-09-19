# 🚀 Cloudflare Pages 部署指南

## 📋 部署前准备

### 1. 确保项目配置正确
```bash
# 验证配置
pnpm cf:verify

# 本地构建测试
pnpm build:cf
```

### 2. 创建 D1 数据库
```bash
# 创建生产数据库
wrangler d1 create ai-generate-station-db

# 创建预览数据库
wrangler d1 create ai-generate-station-db-preview
```

### 3. 更新 wrangler.toml 中的数据库 ID
将创建数据库时返回的 ID 填入 `wrangler.toml` 文件中对应的 `database_id` 字段。

## 🔧 部署步骤

### 方法一：通过 Cloudflare Dashboard

1. **连接 GitHub 仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 Pages 页面
   - 点击 "Create a project"
   - 选择 "Connect to Git"
   - 选择你的 GitHub 仓库

2. **配置构建设置**
   ```
   Framework preset: Next.js
   Build command: pnpm build:cf
   Build output directory: .next
   Root directory: (留空)
   ```

3. **设置环境变量**
   在 Pages 项目设置中添加：
   ```
   NODE_ENV=production
   DATABASE_URL=d1-remote
   ```

4. **绑定 D1 数据库**
   - 在 Settings > Functions 中
   - 添加 D1 database binding
   - Variable name: `DB`
   - D1 database: 选择你创建的数据库

### 方法二：通过 Wrangler CLI

```bash
# 部署到 Cloudflare Pages
wrangler pages deploy .next --project-name=ai-generate-station

# 或者使用我们的部署脚本
pnpm pages:deploy
```

## 🗄️ 数据库迁移

```bash
# 运行生产环境迁移
wrangler d1 migrations apply ai-generate-station-db --env production

# 运行预览环境迁移
wrangler d1 migrations apply ai-generate-station-db-preview --env preview
```

## 🔍 常见问题解决

### 1. 环境配置错误
**错误**: `environment names that are not supported by Pages projects`
**解决**: 确保 wrangler.toml 只使用 `production` 和 `preview` 环境

### 2. 数据库连接失败
**错误**: `Database connection failed`
**解决**: 
- 检查 D1 数据库是否正确绑定
- 确认数据库 ID 正确填写
- 运行数据库迁移

### 3. 构建失败
**错误**: `Build failed`
**解决**:
- 检查 `package.json` 中的构建脚本
- 确保所有依赖项已安装
- 本地测试构建是否成功

## 📊 部署后验证

1. **检查页面访问**
   ```
   https://your-project.pages.dev
   ```

2. **测试 API 端点**
   ```
   https://your-project.pages.dev/api/health
   ```

3. **验证数据库连接**
   ```
   https://your-project.pages.dev/api/example
   ```

## 🔄 持续部署

每次推送到 `main` 分支时，Cloudflare Pages 会自动触发部署。

### 自定义域名配置

1. 在 Cloudflare Pages 项目设置中
2. 进入 "Custom domains" 页面
3. 添加你的域名
4. 配置 DNS 记录

## 🛠️ 故障排除

### 查看部署日志
```bash
wrangler pages deployment list --project-name=ai-generate-station
```

### 查看函数日志
```bash
wrangler pages deployment tail --project-name=ai-generate-station
```

### 本地调试
```bash
# 使用 Miniflare 本地运行
pnpm dev:cf
```

## 📞 获取帮助

如果遇到问题，可以：
1. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 检查 [Next.js on Cloudflare 指南](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
3. 联系 Cloudflare 支持