import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SECURITY_HEADERS, logSecurityEvent } from '@/lib/security';
import { apiRateLimitMiddleware, getClientIP } from '@/lib/rate-limiter';

// 服务端需要强制保护的API路径（避免直接API访问）
const protectedApiPaths = ['/api/user'];

// 完全公开的路径
const publicPaths = ['/', '/login', '/about', '/api/auth', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  // API路径速率限制
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = apiRateLimitMiddleware(request);
    
    if (rateLimitResult.isLimited) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        ip: clientIP,
        userAgent,
        details: { path: pathname, remainingAttempts: rateLimitResult.remainingAttempts }
      });
      
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          ...rateLimitResult.headers,
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      });
    }
  }
  
  // 安全头设置
  const response = NextResponse.next();
  
  // 设置完整的安全头
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // 设置额外的安全头
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );

  // 简化的API路径保护 - 只保护敏感API，让客户端处理页面路由
  if (protectedApiPaths.some(path => pathname.startsWith(path))) {
    const sessionToken = request.cookies.get('next-auth.session-token') || 
                         request.cookies.get('__Secure-next-auth.session-token');
    
    if (!sessionToken?.value) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // API路由的额外安全检查
  if (pathname.startsWith('/api/')) {
    // 检查Content-Type（对于POST/PUT请求），但排除NextAuth路由
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && !pathname.startsWith('/api/auth/')) {
      const contentType = request.headers.get('content-type');
      if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        return new NextResponse('Invalid Content-Type', { status: 400 });
      }
    }

    // 添加CORS头（如果需要）
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': (globalThis as any).process?.env?.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};