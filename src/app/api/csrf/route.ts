import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken } from '@/lib/security';

export const runtime = 'edge';

/**
 * GET /api/csrf - 获取CSRF令牌
 */
export async function GET(request: NextRequest) {
  try {
    // 生成CSRF令牌
    const csrfToken = generateSecureToken(32);
    
    // 设置安全响应头
    const response = NextResponse.json({
      csrfToken,
      timestamp: Date.now(),
    });

    // 设置CSRF令牌到Cookie中（HttpOnly, Secure, SameSite）
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      secure: (globalThis as any).process?.env?.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24小时
      path: '/',
    });

    // 添加安全头
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: '无法生成CSRF令牌' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/csrf/verify - 验证CSRF令牌
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csrfToken } = body;

    if (!csrfToken) {
      return NextResponse.json(
        { error: 'CSRF令牌不能为空' },
        { status: 400 }
      );
    }

    // 从Cookie中获取存储的CSRF令牌
    const storedToken = request.cookies.get('csrf-token')?.value;

    if (!storedToken) {
      return NextResponse.json(
        { error: '未找到CSRF令牌' },
        { status: 401 }
      );
    }

    // 验证CSRF令牌
    if (csrfToken !== storedToken) {
      return NextResponse.json(
        { error: 'CSRF令牌验证失败' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CSRF令牌验证成功',
    });
  } catch (error) {
    console.error('CSRF token verification error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}