'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { LoadingProps } from '@/types';

/**
 * 智能加载组件 - 根据加载状态显示内容或骨架屏
 */
export function SmartLoading({ 
  isLoading, 
  children, 
  skeleton, 
  className 
}: LoadingProps) {
  if (isLoading) {
    return skeleton || <DefaultSkeleton className={className} />;
  }
  
  return <>{children}</>;
}

/**
 * 页面级加载组件
 */
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = '正在加载...', className }: PageLoadingProps) {
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]",
      className
    )}>
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" 
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="text-xl text-white/80 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * 按钮加载状态
 */
interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  loadingText = '处理中...', 
  className 
}: ButtonLoadingProps) {
  return (
    <span className={cn("flex items-center justify-center gap-2", className)}>
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      )}
      {isLoading ? loadingText : children}
    </span>
  );
}

/**
 * 卡片骨架屏
 */
interface CardSkeletonProps {
  className?: string;
  showAvatar?: boolean;
  lines?: number;
}

export function CardSkeleton({ 
  className, 
  showAvatar = false, 
  lines = 3 
}: CardSkeletonProps) {
  return (
    <div className={cn("animate-pulse p-6 bg-white rounded-lg shadow", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index}
            className={cn(
              "h-4 bg-gray-200 rounded",
              index === lines - 1 ? "w-2/3" : "w-full"
            )}
          ></div>
        ))}
      </div>
    </div>
  );
}

/**
 * 表格骨架屏
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* 表头 */}
      <div className="flex space-x-4 mb-4 p-4 bg-gray-50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1 h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      {/* 表格行 */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div 
                key={colIndex} 
                className={cn(
                  "h-4 bg-gray-200 rounded",
                  colIndex === 0 ? "flex-1" : "w-20"
                )}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 列表骨架屏
 */
interface ListSkeletonProps {
  items?: number;
  className?: string;
  showImage?: boolean;
}

export function ListSkeleton({ 
  items = 6, 
  className, 
  showImage = false 
}: ListSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
          {showImage && (
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * 默认骨架屏
 */
function DefaultSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * 内容加载器 - 带有淡入动画的内容显示
 */
interface ContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  delay?: number; // 延迟显示时间（毫秒）
}

export function ContentLoader({ 
  isLoading, 
  children, 
  fallback, 
  className,
  delay = 0 
}: ContentLoaderProps) {
  const [showContent, setShowContent] = React.useState(!isLoading);
  const [showFallback, setShowFallback] = React.useState(isLoading);

  React.useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      const timer = setTimeout(() => setShowFallback(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
      setShowContent(true);
    }
  }, [isLoading, delay]);

  if (showFallback) {
    return (
      <div className={cn("animate-fade-in", className)}>
        {fallback || <DefaultSkeleton />}
      </div>
    );
  }

  if (showContent) {
    return (
      <div className={cn("animate-fade-in", className)}>
        {children}
      </div>
    );
  }

  return null;
}

/**
 * 进度条加载组件
 */
interface ProgressLoadingProps {
  progress: number; // 0-100
  message?: string;
  className?: string;
}

export function ProgressLoading({ 
  progress, 
  message = '正在处理...', 
  className 
}: ProgressLoadingProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={cn("w-full max-w-md mx-auto p-6", className)}>
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">{message}</p>
        <p className="text-xs text-gray-500">{Math.round(clampedProgress)}%</p>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
}