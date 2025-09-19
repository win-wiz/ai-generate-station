import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { 
  PasswordUtils, 
  LoginLimitUtils, 
  EmailUtils,
  CSRFUtils 
} from '@/lib/auth-utils';
import { JWTServerUtils } from '@/lib/jwt-server';
import { logSecurityEvent } from '@/lib/security';

// 启用 Edge Runtime
export const runtime = 'edge';

// Edge Runtime 兼容的速率限制器 (使用内存存储)
class EdgeRateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15分钟

  static async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const record = this.attempts.get(key);

    // 清理过期记录
    if (record && now > record.resetTime) {
      this.attempts.delete(key);
    }

    const currentRecord = this.attempts.get(key) || { count: 0, resetTime: now + this.WINDOW_MS };
    
    if (currentRecord.count >= this.MAX_ATTEMPTS) {
      return { allowed: false, remaining: 0 };
    }

    currentRecord.count++;
    this.attempts.set(key, currentRecord);

    return { 
      allowed: true, 
      remaining: this.MAX_ATTEMPTS - currentRecord.count 
    };
  }

  static async reset(key: string): Promise<void> {
    this.attempts.delete(key);
  }
}

// 获取客户端IP地址
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * POST /api/auth/credentials - 用户登录
 */
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Edge Runtime 兼容的速率限制检查
    const rateLimitResult = await EdgeRateLimiter.checkLimit(clientIP);
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip: clientIP,
        userAgent,
        details: { endpoint: '/api/auth/credentials' }
      });
      
      return NextResponse.json(
        { 
          error: '请求过于频繁，请稍后再试',
          retryAfter: 900 // 15分钟
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '900',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
          }
        }
      );
    }

    const body = await request.json();
    const { email, password, action, name, csrfToken } = body;

    // 验证必需字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    if (!EmailUtils.isValid(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const normalizedEmail = EmailUtils.normalize(email);

    if (action === 'register') {
      return await handleRegister(normalizedEmail, password, name || '', clientIP, userAgent);
    } else {
      return await handleLogin(normalizedEmail, password, clientIP, userAgent);
    }
  } catch (error) {
    console.error('认证错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理用户注册
 */
async function handleRegister(email: string, password: string, name: string | undefined, clientIP: string, userAgent: string) {
  // 验证密码强度
  const passwordValidation = PasswordUtils.validateStrength(password);
  if (!passwordValidation.isValid) {
    return NextResponse.json(
      { error: '密码强度不足', details: passwordValidation.errors },
      { status: 400 }
    );
  }

  // 检查用户是否已存在
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return NextResponse.json(
      { error: '该邮箱已被注册' },
      { status: 409 }
    );
  }

  // 加密密码
  const hashedPassword = await PasswordUtils.hash(password);

  // 创建用户
  const newUser = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      loginFailedCount: 0,
    })
    .returning();

  if (newUser.length === 0) {
    return NextResponse.json(
      { error: '用户创建失败' },
      { status: 500 }
    );
  }

  // 生成JWT token (Edge Runtime 兼容)
  const token = await JWTServerUtils.sign({
    userId: newUser[0]!.id,
    email: newUser[0]!.email,
    type: 'credentials',
  });

  // 记录成功注册事件
  logSecurityEvent({
    type: 'login_attempt',
    ip: clientIP,
    userAgent,
    userId: newUser[0]!.id,
    details: { action: 'register', success: true }
  });

  return NextResponse.json({
    success: true,
    message: '注册成功',
    user: {
      id: newUser[0]!.id,
      email: newUser[0]!.email,
      name: newUser[0]!.name,
    },
    token,
  });
}

/**
 * 处理用户登录
 */
async function handleLogin(email: string, password: string, clientIP: string, userAgent: string) {
  // 查找用户
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json(
      { error: '邮箱或密码错误' },
      { status: 401 }
    );
  }

  const userData = user[0]!;

  // 检查用户是否被锁定
  if (LoginLimitUtils.isUserLocked(userData.lockedUntil)) {
    const remainingTime = LoginLimitUtils.getRemainingLockTime(userData.lockedUntil!);
    return NextResponse.json(
      { 
        error: `账户已被锁定，请在${remainingTime}分钟后重试`,
        lockedUntil: userData.lockedUntil 
      },
      { status: 423 }
    );
  }

  // 验证密码
  if (!userData.password) {
    return NextResponse.json(
      { error: '该账户未设置密码，请使用第三方登录' },
      { status: 400 }
    );
  }

  const isPasswordValid = await PasswordUtils.verify(password, userData.password);

  if (!isPasswordValid) {
    // 增加失败次数
    const newFailedCount = userData.loginFailedCount + 1;
    const shouldLock = LoginLimitUtils.shouldLockUser(newFailedCount);

    await db
      .update(users)
      .set({
        loginFailedCount: newFailedCount,
        lastLoginFailedAt: new Date(),
        lockedUntil: shouldLock ? LoginLimitUtils.calculateLockUntil() : null,
      })
      .where(eq(users.id, userData.id));

    // 记录失败登录事件
    logSecurityEvent({
      type: 'login_failure',
      ip: clientIP,
      userAgent,
      userId: userData.id,
      details: { 
        action: 'login', 
        failedCount: newFailedCount,
        locked: shouldLock 
      }
    });

    if (shouldLock) {
      return NextResponse.json(
        { error: '登录失败次数过多，账户已被锁定15分钟' },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { 
        error: '邮箱或密码错误',
        remainingAttempts: 5 - newFailedCount 
      },
      { status: 401 }
    );
  }

  // 登录成功，重置失败计数
  await db
    .update(users)
    .set({
      loginFailedCount: 0,
      lastLoginFailedAt: null,
      lockedUntil: null,
    })
    .where(eq(users.id, userData.id));

  // 生成JWT token (Edge Runtime 兼容)
  const token = await JWTServerUtils.sign({
    userId: userData.id,
    email: userData.email,
    type: 'credentials',
  });

  // 重置速率限制
  await EdgeRateLimiter.reset(clientIP);

  // 记录成功登录事件
  logSecurityEvent({
    type: 'login_attempt',
    ip: clientIP,
    userAgent,
    userId: userData.id,
    details: { action: 'login', success: true }
  });

  return NextResponse.json({
    success: true,
    message: '登录成功',
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      image: userData.image,
    },
    token,
  });
}

/**
 * GET /api/auth/credentials - 获取CSRF token
 */
export async function GET() {
  const csrfToken = CSRFUtils.generateToken();
  
  return NextResponse.json({
    csrfToken,
  });
}