import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  
  // Auth.js (NextAuth v5) JWT 策略使用的 cookie 名称
  // 开发环境: authjs.session-token
  // 生产环境: __Secure-authjs.session-token
  const sessionToken = req.cookies.get('authjs.session-token') || 
                      req.cookies.get('__Secure-authjs.session-token') ||
                      req.cookies.get('next-auth.session-token') || 
                      req.cookies.get('__Secure-next-auth.session-token');
  
  const isLoggedIn = !!sessionToken?.value;

  console.log('Middleware:', {
    pathname: nextUrl.pathname,
    isLoggedIn,
    hasSessionToken: !!sessionToken,
    sessionTokenName: sessionToken?.name,
    sessionTokenValue: sessionToken?.value ? 'present' : 'missing',
    searchParams: nextUrl.searchParams.toString()
  });

  // 公共路由，无需认证
  const publicRoutes = ['/', '/about', '/login'];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname) || 
                       nextUrl.pathname.startsWith('/api/');

  // 受保护的路由
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  const isProtectedRoute = protectedRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  );

  // 如果是受保护的路由但用户未登录，根据具体路由决定重定向目标
  if (isProtectedRoute && !isLoggedIn) {
    if (nextUrl.pathname.startsWith('/dashboard')) {
      // 未登录访问仪表盘 -> 重定向到首页（符合业务规则）
      const homeUrl = new URL('/', nextUrl.origin);
      console.log('Redirecting unauthenticated user from dashboard to home:', homeUrl.toString());
      return NextResponse.redirect(homeUrl);
    } else {
      // 其他受保护路由 -> 重定向到登录页
      const loginUrl = new URL('/login', nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
      console.log('Redirecting to login:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }
  }

  // 如果用户已登录且访问首页，重定向到仪表盘
  if (isLoggedIn && nextUrl.pathname === '/') {
    const dashboardUrl = new URL('/dashboard', nextUrl.origin);
    console.log('Redirecting logged-in user to dashboard:', dashboardUrl.toString());
    return NextResponse.redirect(dashboardUrl);
  }

  // 如果用户已登录且访问登录页，重定向到仪表盘
  if (isLoggedIn && nextUrl.pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', nextUrl.origin);
    console.log('Redirecting logged-in user from login to dashboard:', dashboardUrl.toString());
    return NextResponse.redirect(dashboardUrl);
  }

  // 其他情况正常处理
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};