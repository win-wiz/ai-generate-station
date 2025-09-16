# Cloudflare D1 部署指南

本指南将帮助你将项目部署到 Cloudflare D1 数据库。

## 🚀 快速开始

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler auth login
```

### 3. 自动部署 D1 数据库

```bash
pnpm d1:deploy
```

这个命令会自动：
- 创建 D1 数据库
- 生成迁移文件
- 应用 schema 到 D1
- 更新环境变量

## 📋 手动配置步骤

### 1. 创建 D1 数据库

```bash
wrangler d1 create ai-generate-station-db
```

### 2. 更新 wrangler.toml

将创建数据库时返回的 `database_id` 添加到 `wrangler.toml`:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "ai-generate-station-db"
database_id = "your-database-id-here"
```

### 3. 生成并应用迁移

```bash
# 生成迁移文件
pnpm db:generate

# 应用到 D1
pnpm d1:migrate
```

### 4. 配置环境变量

在 `.env` 文件中设置：

```env
DATABASE_URL="d1-remote"
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_DATABASE_ID="your-database-id"
CLOUDFLARE_D1_TOKEN="your-api-token"
```

## 🔧 开发环境配置

### 本地开发

保持使用 SQLite 进行本地开发：

```env
DATABASE_URL="file:./db.sqlite"
```

### 本地 D1 测试

如果需要在本地测试 D1：

```env
DATABASE_URL="d1-local"
```

然后运行：

```bash
wrangler dev
```

## 📊 数据库管理

### 查看表结构

```bash
pnpm d1:studio
```

### 执行 SQL 查询

```bash
wrangler d1 execute ai-generate-station-db --command="SELECT * FROM ai-generate-station_users LIMIT 5;"
```

### 导入数据

```bash
wrangler d1 execute ai-generate-station-db --file=./data/seed.sql
```

## 🚀 部署到 Cloudflare Workers

### 1. 构建项目

```bash
pnpm build
```

### 2. 部署

```bash
wrangler deploy
```

### 3. 设置自定义域名

在 `wrangler.toml` 中配置：

```toml
[[routes]]
pattern = "your-app.your-domain.com/*"
zone_name = "your-domain.com"
```

## 🔍 监控和调试

### 查看日志

```bash
wrangler tail
```

### 查看分析数据

```bash
wrangler analytics
```

## 📈 性能优化

### D1 最佳实践

1. **批量操作**: 使用事务进行批量插入/更新
2. **索引优化**: 确保查询字段有适当的索引
3. **连接池**: D1 自动管理连接，无需手动配置
4. **缓存策略**: 使用 KV 存储缓存频繁查询的数据

### 示例：批量插入

```typescript
import { db } from "@/server/db";
import { posts } from "@/server/db/schema";

// 批量插入示例
await db.transaction(async (tx) => {
  for (const post of postsData) {
    await tx.insert(posts).values(post);
  }
});
```

## 🔒 安全配置

### API Token 权限

确保 Cloudflare API Token 具有以下权限：
- `Cloudflare D1:Edit`
- `Account:Read`
- `Zone:Read` (如果使用自定义域名)

### 环境变量安全

- 生产环境的敏感信息使用 Cloudflare Workers 的环境变量
- 本地开发使用 `.env` 文件（确保已添加到 `.gitignore`）

## 🆘 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `database_id` 是否正确
   - 确认 API Token 权限

2. **迁移失败**
   - 检查 SQL 语法是否兼容 SQLite
   - 确认表名前缀配置正确

3. **部署失败**
   - 检查 `wrangler.toml` 配置
   - 确认账户配额和限制

### 获取帮助

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Drizzle ORM D1 指南](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)