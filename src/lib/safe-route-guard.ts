/**
 * 安全路由守卫工具
 * 解决 Hooks 调用顺序问题的增强版本
 */

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useCallback } from 'react';
import { ROUTES } from './constants';
import type { Session } from 'next-auth';

export interface SafeRouteGuardConfig {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  skipRedirect?: boolean;
}

export interface SafeRouteGuardReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: Session['user'] | null;
  redirectToLogin: () => void;
}

/**
 * 安全路由守卫 Hook
 * 确保 Hooks 调用顺序一致性
 */
export function useSafeRouteGuard(config: SafeRouteGuardConfig = {}): SafeRouteGuardReturn {
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
  };
}

/**
 * 专门用于登录表单的路由守卫
 */
export function useLoginFormGuard() {
  return useSafeRouteGuard({
    skipRedirect: true,
  });
}

/**
 * 专门用于导航组件的路由守卫
 */
export function useNavigationGuard() {
  const pathname = usePathname();
  const guardResult = useSafeRouteGuard({
    skipRedirect: true,
  });

  // 判断是否应该隐藏导航栏 - 使用不同的变量名避免冲突
  const navigationHidden = useMemo(() => {
    const hideOnRoutes = [ROUTES.LOGIN, '/register'];
    return hideOnRoutes.includes(pathname);
  }, [pathname]);

  return {
    ...guardResult,
    shouldHideNavigation: navigationHidden,
  };
}