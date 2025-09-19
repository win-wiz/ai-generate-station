# 🔄 Edge Runtime 迁移完整指南

## 📋 迁移前准备清单

### 1. 依赖兼容性审计

```bash
# 运行依赖分析脚本
npx @edge-runtime/check-dependencies

# 检查结果示例
✅ next - 兼容
✅ react - 兼容
❌ bcryptjs - 不兼容 (使用 Node.js crypto)
❌ rate-limiter-flexible - 不兼容 (使用 Node.js 模块)
⚠️  drizzle-orm - 部分兼容 (需要配置)
```

### 2. 代码兼容性检查

```typescript
// scripts/check-edge-compatibility.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const INCOMPATIBLE_APIS = [
  'fs', 'path', 'crypto', 'buffer', 'stream',
  'child_process', 'cluster', 'os', 'util'
];

export function checkEdgeCompatibility(dir: string): string[] {
  const issues: string[] = [];
  
  function scanFile(filePath: string) {
    const content = readFileSync(filePath, 'utf-8');
    
    INCOMPATIBLE_APIS.forEach(api => {
      if (content.includes(`require('${api}')`)) {
        issues.push(`${filePath}: 使用了不兼容的 Node.js API: ${api}`);
      }
      if (content.includes(`from '${api}'`)) {
        issues.push(`${filePath}: 导入了不兼容的 Node.js 模块: ${api}`);
      }
    });
  }
  
  // 递归扫描所有 TypeScript/JavaScript 文件
  function scanDirectory(dirPath: string) {
    const files = readdirSync(dirPath, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = join(dirPath, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.')) {
        scanDirectory(fullPath);
      } else if (file.name.match(/\.(ts|tsx|js|jsx)$/)) {
        scanFile(fullPath);
      }
    });
  }
  
  scanDirectory(dir);
  return issues;
}
```

## 🔧 核心模块迁移

### 1. 密码哈希迁移 (bcryptjs → Web Crypto API)

```typescript
// src/lib/crypto/edge-crypto.ts
export class EdgeCrypto {
  /**
   * 使用 Web Crypto API 进行密码哈希
   * 替代 bcryptjs.hash()
   */
  static async hashPassword(password: string, salt?: string): Promise<string> {
    const encoder = new TextEncoder();
    
    // 生成盐值
    if (!salt) {
      const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
      salt = Array.from(saltBuffer, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // 组合密码和盐值
    const passwordData = encoder.encode(password + salt);
    
    // 使用 PBKDF2 进行哈希
    const key = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${salt}:${hashHex}`;
  }
  
  /**
   * 验证密码
   * 替代 bcryptjs.compare()
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, expectedHash] = hash.split(':');
    const actualHash = await this.hashPassword(password, salt);
    const [, actualHashValue] = actualHash.split(':');
    
    return actualHashValue === expectedHash;
  }
  
  /**
   * 生成安全的随机字符串
   */
  static generateSecureToken(length: number = 32): string {
    const array = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
```

### 2. JWT 处理迁移 (jsonwebtoken → Web Crypto API)

```typescript
// src/lib/jwt/edge-jwt.ts
export class EdgeJWT {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();
  
  /**
   * 签名 JWT Token
   */
  static async sign(payload: any, secret: string, expiresIn: string = '7d'): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiration(expiresIn);
    
    const jwtPayload = {
      ...payload,
      iat: now,
      exp
    };
    
    // Base64URL 编码
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
    
    // 创建签名
    const key = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      this.encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );
    
    const encodedSignature = this.base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    );
    
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }
  
  /**
   * 验证 JWT Token
   */
  static async verify(token: string, secret: string): Promise<any> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new Error('Invalid token format');
    }
    
    // 验证签名
    const key = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = Uint8Array.from(
      atob(this.base64UrlDecode(encodedSignature)),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      this.encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );
    
    if (!isValid) {
      throw new Error('Invalid token signature');
    }
    
    // 解码 payload
    const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    
    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload;
  }
  
  private static base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  private static base64UrlDecode(str: string): string {
    str += '='.repeat((4 - str.length % 4) % 4);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }
  
  private static parseExpiration(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit as keyof typeof multipliers];
  }
}
```

### 3. 速率限制迁移 (rate-limiter-flexible → KV Store)

```typescript
// src/lib/rate-limit/edge-rate-limit.ts
export class EdgeRateLimit {
  private kv: KVNamespace;
  
  constructor(kv: KVNamespace) {
    this.kv = kv;
  }
  
  /**
   * 检查速率限制
   */
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number,
    identifier?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const rateLimitKey = `rate_limit:${key}:${window}`;
    
    // 获取当前计数
    const currentCount = await this.kv.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: (window + 1) * windowMs
      };
    }
    
    // 增加计数
    const newCount = count + 1;
    await this.kv.put(rateLimitKey, newCount.toString(), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    
    return {
      allowed: true,
      remaining: limit - newCount,
      resetTime: (window + 1) * windowMs
    };
  }
  
  /**
   * 滑动窗口速率限制
   */
  async checkSlidingWindowLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 获取时间戳列表
    const timestampsJson = await this.kv.get(`sliding:${key}`);
    let timestamps: number[] = timestampsJson ? JSON.parse(timestampsJson) : [];
    
    // 过滤过期的时间戳
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= limit) {
      return { allowed: false, remaining: 0 };
    }
    
    // 添加当前时间戳
    timestamps.push(now);
    
    // 保存更新后的时间戳列表
    await this.kv.put(`sliding:${key}`, JSON.stringify(timestamps), {
      expirationTtl: Math.ceil(windowMs / 1000)
    });
    
    return {
      allowed: true,
      remaining: limit - timestamps.length
    };
  }
  
  /**
   * 重置速率限制
   */
  async reset(key: string): Promise<void> {
    const keys = await this.kv.list({ prefix: `rate_limit:${key}:` });
    
    for (const keyObj of keys.keys) {
      await this.kv.delete(keyObj.name);
    }
  }
}
```

### 4. 数据库连接迁移

```typescript
// src/lib/db/edge-database.ts
import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

export class EdgeDatabase {
  private db: any;
  private type: 'D1' | 'LibSQL';
  
  constructor(env: CloudflareEnv) {
    if (env.DB) {
      // Cloudflare D1
      this.db = drizzle(env.DB, { schema });
      this.type = 'D1';
    } else if (env.DATABASE_URL?.startsWith('libsql:')) {
      // LibSQL (Turso)
      const client = createClient({
        url: env.DATABASE_URL,
        authToken: env.DATABASE_AUTH_TOKEN,
      });
      this.db = drizzleLibSQL(client, { schema });
      this.type = 'LibSQL';
    } else {
      throw new Error('No compatible database configuration found');
    }
  }
  
  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.db.execute(sql, params);
      return result.rows || result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  
  /**
   * 事务支持
   */
  async transaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    if (this.type === 'D1') {
      // D1 事务
      return this.db.transaction(callback);
    } else {
      // LibSQL 事务
      return this.db.transaction(callback);
    }
  }
  
  /**
   * 批量操作
   */
  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    if (this.type === 'D1') {
      return this.db.batch(statements.map(stmt => 
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      ));
    } else {
      // LibSQL 批量操作
      const results = [];
      for (const stmt of statements) {
        const result = await this.query(stmt.sql, stmt.params);
        results.push(result);
      }
      return results;
    }
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency: number }> {
    const start = Date.now();
    
    try {
      await this.query('SELECT 1');
      return {
        status: 'ok',
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - start
      };
    }
  }
}
```

## 🔄 API 路由迁移模板

### 1. 认证路由迁移

```typescript
// src/app/api/auth/signin/route.ts
import { NextRequest } from 'next/server';
import { EdgeDatabase } from '@/lib/db/edge-database';
import { EdgeCrypto } from '@/lib/crypto/edge-crypto';
import { EdgeJWT } from '@/lib/jwt/edge-jwt';
import { EdgeRateLimit } from '@/lib/rate-limit/edge-rate-limit';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const env = process.env as CloudflareEnv;
  
  try {
    // 初始化服务
    const db = new EdgeDatabase(env);
    const rateLimit = new EdgeRateLimit(env.RATE_LIMIT_KV);
    
    // 获取客户端 IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';
    
    // 速率限制检查
    const rateLimitResult = await rateLimit.checkLimit(
      `signin:${clientIP}`,
      5, // 5 次尝试
      15 * 60 * 1000 // 15 分钟窗口
    );
    
    if (!rateLimitResult.allowed) {
      return Response.json(
        { 
          error: '请求过于频繁，请稍后再试',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }
    
    // 解析请求体
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return Response.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }
    
    // 查找用户
    const users = await db.query(
      'SELECT id, email, password, name FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return Response.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }
    
    const user = users[0];
    
    // 验证密码
    const isValidPassword = await EdgeCrypto.verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return Response.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }
    
    // 生成 JWT
    const token = await EdgeJWT.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name
      },
      env.JWT_SECRET,
      '7d'
    );
    
    // 返回成功响应
    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('Sign in error:', error);
    return Response.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
```

### 2. 数据 CRUD 路由迁移

```typescript
// src/app/api/users/route.ts
import { NextRequest } from 'next/server';
import { EdgeDatabase } from '@/lib/db/edge-database';
import { EdgeJWT } from '@/lib/jwt/edge-jwt';

export const runtime = 'edge';

// 获取用户列表
export async function GET(request: NextRequest) {
  const env = process.env as CloudflareEnv;
  
  try {
    // 验证认证
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const payload = await EdgeJWT.verify(token, env.JWT_SECRET);
    
    // 初始化数据库
    const db = new EdgeDatabase(env);
    
    // 获取查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // 查询用户
    const users = await db.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    // 获取总数
    const countResult = await db.query('SELECT COUNT(*) as total FROM users');
    const total = countResult[0]?.total || 0;
    
    return Response.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    return Response.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  const env = process.env as CloudflareEnv;
  
  try {
    const db = new EdgeDatabase(env);
    const { email, password, name } = await request.json();
    
    // 验证输入
    if (!email || !password || !name) {
      return Response.json(
        { error: '邮箱、密码和姓名不能为空' },
        { status: 400 }
      );
    }
    
    // 检查邮箱是否已存在
    const existingUsers = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return Response.json(
        { error: '邮箱已被注册' },
        { status: 409 }
      );
    }
    
    // 哈希密码
    const hashedPassword = await EdgeCrypto.hashPassword(password);
    
    // 创建用户
    const result = await db.query(
      'INSERT INTO users (email, password, name, created_at) VALUES (?, ?, ?, ?) RETURNING id, email, name',
      [email, hashedPassword, name, new Date().toISOString()]
    );
    
    return Response.json({
      success: true,
      user: result[0]
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create user error:', error);
    return Response.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}
```

## 🧪 测试迁移

### 1. Edge Runtime 测试配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### 2. 测试工具函数

```typescript
// src/__tests__/utils/edge-test-utils.ts
export class EdgeTestUtils {
  /**
   * 创建模拟的 Cloudflare 环境
   */
  static createMockEnv(): CloudflareEnv {
    return {
      DB: new MockD1Database(),
      RATE_LIMIT_KV: new MockKVNamespace(),
      JWT_SECRET: 'test-secret',
      DATABASE_URL: 'libsql://test.db',
    } as CloudflareEnv;
  }
  
  /**
   * 创建模拟的 Request 对象
   */
  static createMockRequest(
    method: string,
    url: string,
    body?: any,
    headers?: Record<string, string>
  ): Request {
    return new Request(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }
  
  /**
   * 生成测试 JWT Token
   */
  static async generateTestToken(payload: any): Promise<string> {
    return EdgeJWT.sign(payload, 'test-secret', '1h');
  }
}

class MockD1Database {
  async prepare(sql: string) {
    return {
      bind: (...params: any[]) => ({
        all: () => Promise.resolve({ results: [] }),
        first: () => Promise.resolve(null),
        run: () => Promise.resolve({ success: true }),
      }),
    };
  }
  
  async batch(statements: any[]) {
    return statements.map(() => ({ success: true }));
  }
}

class MockKVNamespace {
  private store = new Map<string, string>();
  
  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }
  
  async put(key: string, value: string, options?: any): Promise<void> {
    this.store.set(key, value);
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async list(options?: any): Promise<{ keys: Array<{ name: string }> }> {
    const keys = Array.from(this.store.keys())
      .filter(key => !options?.prefix || key.startsWith(options.prefix))
      .map(name => ({ name }));
    
    return { keys };
  }
}
```

### 3. API 路由测试

```typescript
// src/__tests__/api/auth/signin.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/signin/route';
import { EdgeTestUtils } from '@/tests/utils/edge-test-utils';

describe('/api/auth/signin', () => {
  let mockEnv: CloudflareEnv;
  
  beforeEach(() => {
    mockEnv = EdgeTestUtils.createMockEnv();
    // 设置全局环境变量
    Object.assign(process.env, mockEnv);
  });
  
  it('should authenticate valid user', async () => {
    const request = EdgeTestUtils.createMockRequest('POST', 'http://localhost/api/auth/signin', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
  });
  
  it('should reject invalid credentials', async () => {
    const request = EdgeTestUtils.createMockRequest('POST', 'http://localhost/api/auth/signin', {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('邮箱或密码错误');
  });
  
  it('should enforce rate limiting', async () => {
    const request = EdgeTestUtils.createMockRequest('POST', 'http://localhost/api/auth/signin', {
      email: 'test@example.com',
      password: 'wrongpassword'
    }, {
      'CF-Connecting-IP': '192.168.1.1'
    });
    
    // 发送多次请求触发速率限制
    for (let i = 0; i < 6; i++) {
      await POST(request);
    }
    
    const response = await POST(request);
    expect(response.status).toBe(429);
  });
});
```

## 📊 迁移验证清单

### ✅ 功能验证
- [ ] 所有 API 路由正常工作
- [ ] 用户认证功能正常
- [ ] 数据库操作正常
- [ ] 缓存功能正常
- [ ] 速率限制生效

### ✅ 性能验证
- [ ] 冷启动时间 < 100ms
- [ ] API 响应时间 < 200ms
- [ ] 内存使用 < 128MB
- [ ] CPU 使用率 < 50%

### ✅ 兼容性验证
- [ ] 所有浏览器正常访问
- [ ] 移动设备兼容
- [ ] 不同网络环境正常
- [ ] 离线功能正常

### ✅ 安全验证
- [ ] JWT 签名验证正常
- [ ] 密码哈希安全
- [ ] 速率限制有效
- [ ] CORS 配置正确

---

**按照这个迁移指南，你可以系统性地将现有应用迁移到 Edge Runtime，确保完全兼容 Cloudflare Pages！**