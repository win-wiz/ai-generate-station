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
import { RateLimiterMemory } from 'rate-limiter-flexible';

// 创建速率限制器
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5次尝试
  duration: 900, // 15分钟
});

// 获取客户端IP地址
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
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
  try {
    // 速率限制检查
    const clientIP = getClientIP(request);
    try {
      await rateLimiter.consume(clientIP);
    } catch {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
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
      return await handleRegister(normalizedEmail, password, name);
    } else {
      return await handleLogin(normalizedEmail, password);
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
async function handleRegister(email: string, password: string, name?: string) {
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

  // 生成JWT token
  const token = JWTServerUtils.sign({
    userId: newUser[0]!.id,
    email: newUser[0]!.email,
    type: 'credentials',
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
async function handleLogin(email: string, password: string) {
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

  // 生成JWT token
  const token = JWTServerUtils.sign({
    userId: userData.id,
    email: userData.email,
    type: 'credentials',
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