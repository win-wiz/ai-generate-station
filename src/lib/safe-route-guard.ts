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
  skipRedirect?: boolean; // 新增：跳过自动重定向
}

export interface SafeRouteGuardReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: Session['user'] | null;
  redirectToLogin: () => void; // 新增：手动重定向函数
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
    // 如果跳过自动重定向，则不执行
    if (skipRedirect) return;
    
    // 等待会话加载完成
    if (isLoading) return;

    // 需要认证但未登录
    if (requireAuth && !isAuthenticated) {
      redirectToLogin();
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
 * 避免自动重定向，防止循环
 */
export function useLoginFormGuard() {
  return useSafeRouteGuard({
    skipRedirect: true, // 跳过自动重定向
  });
}

/**
 * 专门用于导航组件的路由守卫
 * 确保在所有 hooks 调用后再决定是否渲染
 */
export function useNavigationGuard() {
  const pathname = usePathname();
  const guardResult = useSafeRouteGuard({
    skipRedirect: true, // 导航组件不需要自动重定向
  });

  const shouldHideNavigation = pathname === ROUTES.LOGIN;

  return {
    ...guardResult,
    shouldHideNavigation,
  };
}