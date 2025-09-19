'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { BaseComponentProps } from '@/types';
import { isDevelopment, isProduction } from '@/lib/env-client';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps extends BaseComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  enableErrorReporting?: boolean;
}

/**
 * 错误边界组件
 * 捕获和处理 React 组件错误
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 内置错误处理逻辑
    console.error('Application Error:', error, errorInfo);
    
    // 生产环境下可以发送到错误监控服务
    if (isProduction() && this.props.enableErrorReporting) {
      // 例如：Sentry.captureException(error);
      // 这里可以添加错误上报逻辑
      try {
        // 可以在这里添加错误上报逻辑
        console.warn('Error reporting is enabled but not configured');
      } catch (reportError) {
        console.error('Failed to report error:', reportError);
      }
    }

    // 在开发环境下打印详细错误信息
    if (isDevelopment()) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2">
              出现了一些问题
            </h2>
            
            <p className="text-muted-foreground mb-6">
              抱歉，页面遇到了错误。请尝试刷新页面或联系技术支持。
            </p>

            <div className="space-y-3">
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                刷新页面
              </Button>
            </div>

            {/* 开发环境下显示错误详情 */}
            {this.props.showDetails && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  错误详情 (开发模式)
                </summary>
                <div className="mt-2 p-4 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-40">
                  <div className="text-destructive font-semibold mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      <div className="font-semibold text-foreground">组件堆栈:</div>
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 错误边界 Hook 版本
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}