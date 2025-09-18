/**
 * 全局错误处理工具
 */

import { ApiError } from './api-client';
import { HTTP_STATUS } from './constants';

export interface ErrorInfo {
  message: string;
  code?: string | number;
  details?: any;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: ErrorInfo) => void> = [];

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers() {
    // 处理未捕获的 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, ErrorType.UNKNOWN);
      event.preventDefault();
    });

    // 处理 JavaScript 错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error, ErrorType.UNKNOWN);
    });
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: ErrorInfo) => void) {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: ErrorInfo) => void) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 处理错误
   */
  handleError(error: any, type: ErrorType = ErrorType.UNKNOWN): ErrorInfo {
    const errorInfo = this.normalizeError(error, type);
    
    // 通知所有监听器
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // 在开发环境下打印错误
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', errorInfo);
    }

    return errorInfo;
  }

  /**
   * 标准化错误信息
   */
  private normalizeError(error: any, type: ErrorType): ErrorInfo {
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent;
    const url = window.location.href;

    if (error instanceof ApiError) {
      return {
        message: error.message,
        code: error.status,
        details: error.data,
        timestamp,
        userAgent,
        url,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: type,
        details: {
          name: error.name,
          stack: error.stack,
        },
        timestamp,
        userAgent,
        url,
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        code: type,
        timestamp,
        userAgent,
        url,
      };
    }

    return {
      message: '未知错误',
      code: type,
      details: error,
      timestamp,
      userAgent,
      url,
    };
  }

  /**
   * 根据错误类型获取用户友好的消息
   */
  static getUserFriendlyMessage(error: ErrorInfo): string {
    if (error.code === HTTP_STATUS.UNAUTHORIZED) {
      return '请先登录后再试';
    }

    if (error.code === HTTP_STATUS.FORBIDDEN) {
      return '您没有权限执行此操作';
    }

    if (error.code === HTTP_STATUS.NOT_FOUND) {
      return '请求的资源不存在';
    }

    if (error.code === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      return '服务器内部错误，请稍后重试';
    }

    if (error.code === HTTP_STATUS.BAD_GATEWAY || 
        error.code === HTTP_STATUS.SERVICE_UNAVAILABLE) {
      return '服务暂时不可用，请稍后重试';
    }

    if (error.code === ErrorType.NETWORK) {
      return '网络连接失败，请检查网络设置';
    }

    if (error.code === ErrorType.VALIDATION) {
      return '输入的数据格式不正确';
    }

    return error.message || '操作失败，请重试';
  }

  /**
   * 判断错误是否需要重试
   */
  static isRetryableError(error: ErrorInfo): boolean {
    const retryableCodes = [
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      HTTP_STATUS.BAD_GATEWAY,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      HTTP_STATUS.GATEWAY_TIMEOUT,
      ErrorType.NETWORK,
    ];

    return retryableCodes.includes(error.code as any);
  }

  /**
   * 判断是否需要重新登录
   */
  static requiresReauth(error: ErrorInfo): boolean {
    return error.code === HTTP_STATUS.UNAUTHORIZED;
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

/**
 * 错误处理装饰器
 */
export function handleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      errorHandler.handleError(error, ErrorType.UNKNOWN);
      throw error;
    }
  };

  return descriptor;
}