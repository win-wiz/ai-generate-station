# 数据库配置文档

## 概述

本项目使用 Drizzle ORM 配合 SQLite/LibSQL 数据库，支持 Cloudflare D1 和本地开发环境。

## 文件结构

```
src/server/db/
├── index.ts                 # 主数据库配置和导出
├── schema.ts               # 数据库表结构定义
├── connection-pool.ts      # 连接池管理
├── monitoring.ts           # 数据库监控和指标
├── production-safety.ts    # 生产环境安全检查
├── test-connection.ts      # 数据库连接测试工具
└── README.md              # 本文档
```

## 快速开始

### 1. 环境配置

复制 `.env.example` 为 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

关键配置项：
```env
NODE_ENV=development
DATABASE_URL=file:./dev.db
DATABASE_TYPE=libsql
USE_REAL_DATABASE_ONLY=false
```

### 2. 数据库初始化

```bash
# 生成迁移文件
pnpm db:generate

# 推送 schema 到数据库
pnpm db:push

# 测试数据库连接
npx tsx scripts/simple-db-test.ts
```

### 3. 开发环境使用

```typescript
import { db } from '@/server/db';
import { users } from '@/server/db/schema';

// 查询用户
const allUsers = await db.select().from(users);

// 创建用户
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe',
}).returning();
```

## 数据库表结构

### 用户相关表

- **users**: 用户基本信息
- **accounts**: OAuth 账户信息
- **sessions**: 用户会话
- **verification_tokens**: 验证令牌
- **user_preferences**: 用户偏好设置

### 业务相关表

- **posts**: 文章/内容
- **ai_generation_tasks**: AI 生成任务

## 环境支持

### 开发环境
- 使用本地 SQLite 文件 (`./dev.db`)
- 支持热重载和调试
- 包含测试数据

### 生产环境
- 优先使用 Cloudflare D1
- 回退到 LibSQL/Turso
- 包含连接池和监控

### 测试环境
- 使用内存数据库或临时文件
- 每次测试后清理数据

## 高级功能

### 连接池管理

```typescript
import { withPooledConnection } from '@/server/db';

const result = await withPooledConnection(async (client) => {
  // 使用连接池中的连接执行操作
  return await client.execute('SELECT * FROM users');
});
```

### 数据库监控

```typescript
import { getDatabaseMonitor } from '@/server/db';

const monitor = getDatabaseMonitor();
const metrics = monitor.getMetrics();
console.log('Database performance:', metrics);
```

### 健康检查

```typescript
import { checkDatabaseHealth } from '@/server/db';

const health = await checkDatabaseHealth();
console.log('Database status:', health.status);
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 `DATABASE_URL` 配置
   - 确保数据库文件权限正确
   - 验证网络连接（远程数据库）

2. **迁移问题**
   - 运行 `pnpm db:generate` 重新生成迁移
   - 使用 `pnpm db:push --force` 强制推送

3. **性能问题**
   - 检查连接池配置
   - 查看监控指标
   - 优化查询语句

### 调试工具

```bash
# 测试数据库连接
npx tsx scripts/simple-db-test.ts

# 查看数据库状态
pnpm db:studio

# 检查迁移状态
pnpm db:generate --check
```

## 部署指南

### Cloudflare Pages

1. 配置 `wrangler.toml`
2. 创建 D1 数据库
3. 运行迁移：`pnpm d1:migrate`
4. 部署：`pnpm pages:deploy`

### Vercel

1. 配置环境变量
2. 使用 LibSQL/Turso 作为数据库
3. 部署时自动运行迁移

## 安全考虑

- 生产环境禁用 Mock 数据库
- 使用连接池限制并发连接
- 启用查询监控和告警
- 定期备份数据库

## 性能优化

- 合理使用索引
- 启用连接池
- 监控慢查询
- 定期清理日志

## 更多信息

- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [LibSQL 文档](https://docs.turso.tech/)