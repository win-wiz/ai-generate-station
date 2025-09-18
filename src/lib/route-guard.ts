/**
 * 路由守卫工具
 * 优化版本，增强类型安全和错误处理
 */

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { ROUTES } from './constants';
import type { Session } from 'next-auth';

export interface RouteGuardConfig {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
}

export interface RouteGuardReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: Session['user'] | null;
}

/**
 * 路由守卫 Hook
 */
export function useRouteGuard(config: RouteGuardConfig = {}): RouteGuardReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const {
    requireAuth = false,
    redirectTo = ROUTES.LOGIN,
    allowedRoles = [],
  } = config;

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session;

  // 检查用户角色权限
  const hasRequiredRole = useMemo(() => {
    if (allowedRoles.length === 0) return true;
    if (!session?.user) return false;
    
    const userRoles = (session.user as any).roles || [];
    return allowedRoles.some(role => userRoles.includes(role));
  }, [session, allowedRoles]);

  useEffect(() => {
    // 等待会话加载完成
    if (isLoading) return;

    // 需要认证但未登录
    if (requireAuth && !isAuthenticated) {
      const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
      return;
    }

    // 已登录但没有权限
    if (requireAuth && isAuthenticated && !hasRequiredRole) {
      router.push(ROUTES.UNAUTHORIZED || ROUTES.HOME);
      return;
    }

    // 已登录用户访问登录页，重定向到仪表盘
    if (isAuthenticated && pathname === ROUTES.LOGIN) {
      router.push(ROUTES.DASHBOARD);
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    requireAuth,
    hasRequiredRole,
    pathname,
    redirectTo,
    router,
  ]);

  return {
    isLoading,
    isAuthenticated,
    session,
    user: session?.user || null,
  };
}

/**
 * 获取登出重定向URL
 */
export function getLogoutRedirectUrl(): string {
  return ROUTES.HOME;
}

/**
 * 检查路径是否需要认证
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = [
    ROUTES.DASHBOARD,
    '/profile',
    '/settings',
    '/admin',
  ];

  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * 检查用户是否有访问权限
 */
export function hasPermission(
  session: Session | null,
  requiredRoles: string[] = []
): boolean {
  if (requiredRoles.length === 0) return true;
  if (!session?.user) return false;

  const userRoles = (session.user as any).roles || [];
  return requiredRoles.some(role => userRoles.includes(role));
}