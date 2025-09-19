/**
 * 导航守卫工具 - 重新命名文件避免缓存问题
 */

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useCallback } from 'react';
import { ROUTES } from './constants';
import type { Session } from 'next-auth';

export interface NavigationGuardConfig {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  skipRedirect?: boolean;
}

export interface NavigationGuardReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: Session['user'] | null;
  redirectToLogin: () => void;
  shouldHideNavigation: boolean;
}

/**
 * 导航守卫 Hook
 */
export function useNavigationGuard(config: NavigationGuardConfig = {}): NavigationGuardReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const {
    requireAuth = false,
    redirectTo = ROUTES.LOGIN,
    allowedRoles = [],
    skipRedirect = false,
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

  // 判断是否应该隐藏导航栏
  const shouldHideNavigation = useMemo(() => {
    const hideOnRoutes = [ROUTES.LOGIN, '/register', '/forgot-password'];
    return hideOnRoutes.includes(pathname);
  }, [pathname]);

  // 手动重定向函数
  const redirectToLogin = useCallback(() => {
    const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}`;
    router.push(loginUrl);
  }, [redirectTo, pathname, router]);

  // 自动重定向逻辑（可选）
  useEffect(() => {
    if (skipRedirect) return;
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (requireAuth && isAuthenticated && !hasRequiredRole) {
      router.push(ROUTES.UNAUTHORIZED || ROUTES.HOME);
      return;
    }

    if (isAuthenticated && pathname === ROUTES.LOGIN) {
      router.push(ROUTES.DASHBOARD);
      return;
    }
  }, [
    skipRedirect,
    isLoading,
    isAuthenticated,
    requireAuth,
    hasRequiredRole,
    pathname,
    redirectToLogin,
    router,
  ]);

  return {
    isLoading,
    isAuthenticated,
    session,
    user: session?.user || null,
    redirectToLogin,
    shouldHideNavigation,
  };
}

/**
 * 专门用于登录表单的路由守卫
 */
export function useLoginFormGuard() {
  return useNavigationGuard({
    skipRedirect: true,
  });
}