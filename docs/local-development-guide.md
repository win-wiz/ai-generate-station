# 本地开发指南

本文档提供了在本地开发环境中使用 Drizzle ORM 和 SQLite 数据库的完整指南，特别是处理数据库 schema 变化的操作流程。

## 🚀 快速开始

### 初始设置

```bash
# 1. 安装依赖
pnpm install

# 2. 设置环境变量
cp .env.example .env
# 编辑 .env 文件，确保包含：
# DATABASE_URL="file:./db.sqlite"

# 3. 初始化数据库
pnpm db:setup

# 4. 启动开发服务器
pnpm dev
```

## 📊 数据库 Schema 变化操作流程

### 1. 修改 Schema 定义

编辑 `src/server/db/schema.ts` 文件，添加或修改表结构：

```typescript
// 示例：添加新字段
export const users = sqliteTable("ai-generate-station_user", {
  id: text("id", { length: 255 }).notNull().primaryKey(),
  name: text("name", { length: 255 }),
  email: text("email", { length: 255 }).notNull(),
  // 新增字段
  avatar: text("avatar", { length: 500 }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});
```

### 2. 生成迁移文件

```bash
# 生成新的迁移文件
pnpm db:generate
```

这个命令会：
- 分析 schema 变化
- 在 `drizzle/` 目录下生成新的 SQL 迁移文件
- 更新 `drizzle/meta/` 目录下的元数据

### 3. 应用迁移

```bash
# 应用迁移到本地数据库
pnpm db:migrate
```

### 4. 验证变化

```bash
# 打开数据库管理界面
pnpm db:studio
```

在浏览器中查看 `http://localhost:4983` 来验证表结构变化。

## 🛠️ 常用命令参考

### 数据库操作

| 命令 | 描述 | 使用场景 |
|------|------|----------|
| `pnpm db:setup` | 初始化数据库和应用所有迁移 | 首次设置或重置数据库 |
| `pnpm db:generate` | 生成新的迁移文件 | 修改 schema 后 |
| `pnpm db:migrate` | 应用迁移到数据库 | 生成迁移文件后 |
| `pnpm db:push` | 直接推送 schema 变化（跳过迁移） | 开发阶段快速原型 |
| `pnpm db:studio` | 打开数据库管理界面 | 查看和编辑数据 |
| `pnpm db:reset` | 删除数据库并重新初始化 | 完全重置数据库 |

### 开发服务器

```bash
# 启动开发服务器（带 Turbo 加速）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 预览构建结果
pnpm preview
```

### 代码质量

```bash
# 代码检查
pnpm lint

# 自动修复代码问题
pnpm lint:fix

# 类型检查
pnpm typecheck

# 格式化代码
pnpm format:write

# 检查代码格式
pnpm format:check
```

## 📋 Schema 变化最佳实践

### 1. 安全的 Schema 变化

✅ **推荐的变化类型：**
- 添加新表
- 添加可选字段（nullable 或有默认值）
- 添加索引
- 重命名字段（通过迁移脚本）

⚠️ **需要谨慎的变化：**
- 删除字段
- 修改字段类型
- 添加非空字段（没有默认值）
- 删除表

### 2. 开发流程

```bash
# 1. 修改 schema 文件
vim src/server/db/schema.ts

# 2. 生成迁移
pnpm db:generate

# 3. 检查生成的迁移文件
cat drizzle/XXXX_migration_name.sql

# 4. 应用迁移
pnpm db:migrate

# 5. 验证变化
pnpm db:studio

# 6. 测试应用
pnpm dev
```

### 3. 数据备份

在进行重大 schema 变化前，建议备份数据：

```bash
# 备份数据库
cp db.sqlite db.sqlite.backup

# 或导出数据
sqlite3 db.sqlite .dump > backup.sql
```

### 4. 回滚策略

如果迁移出现问题：

```bash
# 方法1：恢复备份
cp db.sqlite.backup db.sqlite

# 方法2：重置数据库
pnpm db:reset

# 方法3：手动回滚（如果有备份 SQL）
sqlite3 db.sqlite < backup.sql
```

## 🔧 故障排除

### 常见问题

1. **迁移失败**
   ```bash
   # 检查迁移文件语法
   cat drizzle/XXXX_migration.sql
   
   # 重置并重新应用
   pnpm db:reset
   ```

2. **Schema 不同步**
   ```bash
   # 强制推送 schema（开发环境）
   pnpm db:push
   ```

3. **数据库锁定**
   ```bash
   # 停止开发服务器
   # 然后重新启动
   pnpm dev
   ```

4. **类型错误**
   ```bash
   # 重新生成类型
   pnpm db:generate
   pnpm typecheck
   ```

### 调试技巧

1. **查看数据库内容**
   ```bash
   # 使用 SQLite CLI
   sqlite3 db.sqlite
   .tables
   .schema table_name
   SELECT * FROM table_name LIMIT 5;
   ```

2. **查看迁移历史**
   ```bash
   # 查看已应用的迁移
   ls -la drizzle/
   cat drizzle/meta/_journal.json
   ```

## 📚 相关文档

- [Drizzle ORM 官方文档](https://orm.drizzle.team/)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [Cloudflare D1 部署指南](./cloudflare-d1-setup.md)

## 🎯 快速参考

### 日常开发工作流

```bash
# 启动开发（每天开始工作）
pnpm dev

# 修改 schema 后
pnpm db:generate && pnpm db:migrate

# 查看数据库
pnpm db:studio

# 代码质量检查
pnpm lint && pnpm typecheck
```

### 环境变量检查清单

确保 `.env` 文件包含：

```env
# 本地开发必需
DATABASE_URL="file:./db.sqlite"

# 认证相关（可选）
AUTH_SECRET="your-secret-here"
AUTH_DISCORD_ID="your-discord-id"
AUTH_DISCORD_SECRET="your-discord-secret"
```

---

💡 **提示**: 将此文档加入书签，在开发过程中随时参考！