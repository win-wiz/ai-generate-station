'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRouteGuard } from '@/lib/route-guard';
import { SmartLoading, PageLoading } from '@/components/ui/LoadingStates';
import type { BaseComponentProps } from '@/types';

/**
 * 路由守卫组件 - 用于包装需要路由保护的组件
 */
interface RouteGuardProps extends BaseComponentProps {
  fallback?: React.ReactNode;
  requiredAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  onUnauthorized?: () => void;
}

export function RouteGuard({ 
  children, 
  fallback,
  requiredAuth = false,
  redirectTo,
  allowedRoles,
  onUnauthorized,
  className
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, session } = useRouteGuard({ 
    requireAuth: requiredAuth,
    redirectTo,
    allowedRoles 
  });
  const [redirecting, setRedirecting] = useState(false);
  
  // 检查用户角色权限
  const hasRequiredRole = React.useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!session?.user) return false;
    
    // 这里可以根据实际的用户角色系统进行检查
    // 目前简化处理，假设所有登录用户都有基本权限
    return true;
  }, [allowedRoles, session]);

  // 处理重定向逻辑
  useEffect(() => {
    if (isLoading || redirecting) return;

    const shouldRedirect = (
      (requiredAuth && !isAuthenticated) ||
      (isAuthenticated && !hasRequiredRole)
    );

    if (shouldRedirect) {
      setRedirecting(true);
      
      if (onUnauthorized) {
        onUnauthorized();
        return;
      }

      // 确定重定向目标 - 根据具体场景和业务规则
      let targetUrl: string;
      
      if (redirectTo) {
        targetUrl = redirectTo;
      } else if (!isAuthenticated) {
        // 根据当前路径决定重定向目标
        if (pathname.startsWith('/dashboard')) {
          // 未登录访问仪表盘 -> 重定向到首页（符合业务规则）
          targetUrl = '/';
          console.log('Unauthenticated user accessing dashboard, redirecting to home');
        } else {
          // 其他受保护路由 -> 重定向到登录页
          targetUrl = '/login';
          console.log('Unauthenticated user accessing protected route, redirecting to login');
        }
      } else if (!hasRequiredRole) {
        targetUrl = '/unauthorized';
        console.log('User lacks required role, redirecting to unauthorized');
      } else {
        targetUrl = '/';
      }

      // 延迟重定向以避免闪烁
      const timer = setTimeout(() => {
        router.replace(targetUrl);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [
    isLoading, 
    isAuthenticated, 
    requiredAuth, 
    hasRequiredRole,
    redirectTo,
    onUnauthorized,
    router,
    redirecting
  ]);
  
  // 默认加载状态组件
  const defaultFallback = <PageLoading message="正在验证身份..." />;
  
  // 显示加载状态
  if (isLoading) {
    return (
      <SmartLoading 
        isLoading={true} 
        skeleton={fallback || defaultFallback}
        className={className}
      >
        {children}
      </SmartLoading>
    );
  }
  
  // 显示重定向状态
  if (redirecting) {
    const message = (() => {
      if (requiredAuth && !isAuthenticated) {
        return '需要登录，正在重定向...';
      }
      if (!hasRequiredRole) {
        return '权限不足，正在重定向...';
      }
      return '正在重定向...';
    })();
    
    return <PageLoading message={message} className={className} />;
  }
  
  // 权限检查通过，渲染子组件
  return <div className={className}>{children}</div>;
}

/**
 * 高阶组件版本的路由守卫
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions?: Omit<RouteGuardProps, 'children'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <RouteGuard {...guardOptions}>
        <Component {...props} />
      </RouteGuard>
    );
  };

  WrappedComponent.displayName = `withRouteGuard(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * 权限检查 Hook
 */
export function usePermissions() {
  const { session, isAuthenticated } = useRouteGuard();
  
  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!isAuthenticated || !session?.user) return false;
    
    // 这里可以实现具体的权限检查逻辑
    // 目前简化处理
    return true;
  }, [isAuthenticated, session]);

  const hasRole = React.useCallback((role: string): boolean => {
    if (!isAuthenticated || !session?.user) return false;
    
    // 这里可以实现具体的角色检查逻辑
    // 目前简化处理
    return true;
  }, [isAuthenticated, session]);

  const hasAnyRole = React.useCallback((roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  const hasAllRoles = React.useCallback((roles: string[]): boolean => {
    return roles.every(role => hasRole(role));
  }, [hasRole]);

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAuthenticated,
    user: session?.user,
  };
}