# 🔧 Cloudflare Pages 部署故障排除

## 🚨 常见错误及解决方案

### 1. 环境配置错误

**错误信息:**
```
Configuration file contains the following environment names that are not supported by Pages projects: "development"
The supported named-environments for Pages are "preview" and "production".
```

**解决方案:**
✅ 已修复 - `wrangler.toml` 现在只使用 `preview` 和 `production` 环境

### 2. 构建输出目录问题

**错误信息:**
```
Build output directory not found
```

**解决方案:**
```bash
# 确保使用正确的构建命令
pnpm build:cf
pnpm pages:build

# 检查输出目录
ls -la .vercel/output/static
```

### 3. D1 数据库绑定问题

**错误信息:**
```
D1 database binding not found
```

**解决方案:**
1. 创建 D1 数据库:
   ```bash
   wrangler d1 create ai-generate-station-db
   wrangler d1 create ai-generate-station-db-preview
   ```

2. 更新 `wrangler.toml` 中的数据库 ID

3. 在 Cloudflare Dashboard 中绑定数据库

### 4. 依赖项兼容性问题

**错误信息:**
```
Module not found or incompatible with Cloudflare Workers
```

**解决方案:**
- 检查 `next.config.js` 中的 `serverExternalPackages` 配置
- 确保使用 Cloudflare 兼容的依赖项

## 📋 部署检查清单

### 部署前检查
- [ ] 运行 `pnpm cf:verify` 验证配置
- [ ] 本地构建成功 `pnpm build:cf`
- [ ] 环境变量配置正确
- [ ] D1 数据库已创建
- [ ] `wrangler.toml` 配置正确

### 部署后检查
- [ ] 页面可以正常访问
- [ ] API 端点响应正常
- [ ] 数据库连接正常
- [ ] 静态资源加载正常

## 🛠️ 调试工具

### 查看部署日志
```bash
wrangler pages deployment list --project-name=ai-generate-station
wrangler pages deployment tail --project-name=ai-generate-station
```

### 本地调试
```bash
# 使用 Miniflare 本地运行
npx wrangler pages dev .vercel/output/static
```

### 测试 API 端点
```bash
# 健康检查
curl https://your-project.pages.dev/api/health

# 示例 API
curl https://your-project.pages.dev/api/example
```

## 🔄 重新部署流程

如果部署失败，按以下步骤重新部署：

1. **清理构建缓存**
   ```bash
   rm -rf .next .vercel
   ```

2. **重新构建**
   ```bash
   pnpm build:cf
   pnpm pages:build
   ```

3. **重新部署**
   ```bash
   pnpm pages:deploy
   ```

## 📞 获取帮助

如果问题仍然存在：
1. 检查 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 查看 [Next.js on Cloudflare 指南](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
3. 在项目 Issues 中报告问题