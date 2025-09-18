/**
 * 系统优化配置
 * 集中管理所有性能和用户体验优化设置
 */

export const OPTIMIZATION_CONFIG = {
  // 会话管理优化
  SESSION: {
    CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存
    REFRESH_THRESHOLD: 2 * 60 * 1000, // 2分钟刷新阈值
    REFETCH_INTERVAL: 5 * 60, // NextAuth 5分钟刷新
    REFETCH_ON_WINDOW_FOCUS: true,
    REFETCH_WHEN_OFFLINE: false,
  },

  // API请求优化
  API: {
    DEFAULT_TIMEOUT: 10000, // 10秒超时
    DEFAULT_RETRIES: 3, // 默认重试3次
    DEFAULT_RETRY_DELAY: 1000, // 1秒重试延迟
    DEFAULT_CACHE_TTL: 5 * 60 * 1000, // 5分钟缓存
    SESSION_CACHE_TTL: 2 * 60 * 1000, // 会话2分钟缓存
    USER_CACHE_TTL: 5 * 60 * 1000, // 用户信息5分钟缓存
  },

  // 路由守卫优化
  ROUTE_GUARD: {
    DEBOUNCE_DELAY: 50, // 50ms防抖
    LOADING_DELAY: 200, // 200ms延迟显示加载状态
    TIMEOUT_THRESHOLD: 10000, // 10秒超时提示
  },

  // 性能监控
  PERFORMANCE: {
    ENABLE_IN_DEVELOPMENT: true,
    ENABLE_IN_PRODUCTION: false,
    THRESHOLDS: {
      FCP: 1800, // First Contentful Paint
      LCP: 2500, // Largest Contentful Paint
      CLS: 0.1,  // Cumulative Layout Shift
      FID: 100,  // First Input Delay
      TTFB: 600, // Time to First Byte
    },
  },

  // 缓存策略
  CACHE: {
    STATIC_ASSETS_TTL: 31536000, // 1年
    API_CACHE_TTL: 300, // 5分钟
    SESSION_CACHE_TTL: 120, // 2分钟
    USER_CACHE_TTL: 300, // 5分钟
    AUTO_CLEANUP_INTERVAL: 10 * 60 * 1000, // 10分钟清理一次过期缓存
  },

  // 网络优化
  NETWORK: {
    PRECONNECT_DOMAINS: [
      'https://fonts.googleapis.com',
      'https://api.github.com',
      'https://github.com',
    ],
    DNS_PREFETCH_DOMAINS: [
      'https://github.com',
      'https://avatars.githubusercontent.com',
    ],
  },

  // 图片优化
  IMAGES: {
    FORMATS: ['image/webp', 'image/avif'],
    DEVICE_SIZES: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    IMAGE_SIZES: [16, 32, 48, 64, 96, 128, 256, 384],
    CACHE_TTL: 30 * 24 * 60 * 60, // 30天
  },

  // 安全头配置
  SECURITY: {
    HEADERS: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
    },
    CSP: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://github.com;",
  },

  // 错误处理
  ERROR_HANDLING: {
    ENABLE_ERROR_REPORTING: process.env.NODE_ENV === 'production',
    ERROR_REPORTING_URL: process.env.NEXT_PUBLIC_ERROR_REPORTING_URL,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // 用户体验优化
  UX: {
    LOADING_STATES: {
      SKELETON_DELAY: 200, // 200ms后显示骨架屏
      TIMEOUT_MESSAGE_DELAY: 10000, // 10秒后显示超时消息
    },
    ANIMATIONS: {
      ENABLE_REDUCED_MOTION: true, // 支持用户的减少动画偏好
      DEFAULT_DURATION: 200, // 默认动画时长
    },
    FEEDBACK: {
      SUCCESS_MESSAGE_DURATION: 3000, // 成功消息显示3秒
      ERROR_MESSAGE_DURATION: 5000, // 错误消息显示5秒
    },
  },

  // 开发环境优化
  DEVELOPMENT: {
    ENABLE_PERFORMANCE_MONITOR: true,
    ENABLE_ERROR_OVERLAY: true,
    ENABLE_CONSOLE_LOGS: true,
    HOT_RELOAD: true,
  },

  // 生产环境优化
  PRODUCTION: {
    REMOVE_CONSOLE_LOGS: true,
    ENABLE_COMPRESSION: true,
    ENABLE_MINIFICATION: true,
    ENABLE_TREE_SHAKING: true,
    BUNDLE_ANALYZER: false,
  },
} as const;

/**
 * 获取当前环境的优化配置
 */
export function getOptimizationConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...OPTIMIZATION_CONFIG,
    CURRENT_ENV: {
      IS_DEVELOPMENT: isDevelopment,
      IS_PRODUCTION: isProduction,
      ENABLE_PERFORMANCE_MONITOR: isDevelopment || OPTIMIZATION_CONFIG.PERFORMANCE.ENABLE_IN_PRODUCTION,
      ENABLE_ERROR_REPORTING: isProduction && OPTIMIZATION_CONFIG.ERROR_HANDLING.ENABLE_ERROR_REPORTING,
    },
  };
}

/**
 * 性能监控工具函数
 */
export const performanceUtils = {
  /**
   * 测量函数执行时间
   */
  measureTime: <T>(fn: () => T, label?: string): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = Math.round(end - start);
    
    if (label) {
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
    
    return result;
  },

  /**
   * 测量异步函数执行时间
   */
  measureTimeAsync: async <T>(fn: () => Promise<T>, label?: string): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = Math.round(end - start);
    
    if (label) {
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
    
    return result;
  },

  /**
   * 防抖函数
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  /**
   * 节流函数
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

/**
 * 缓存工具函数
 */
export const cacheUtils = {
  /**
   * 创建带过期时间的缓存
   */
  createCache: <T>() => {
    const cache = new Map<string, { data: T; timestamp: number; ttl: number }>();
    
    return {
      get: (key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > entry.ttl) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      },
      
      set: (key: string, data: T, ttl: number = OPTIMIZATION_CONFIG.CACHE.API_CACHE_TTL): void => {
        cache.set(key, { data, timestamp: Date.now(), ttl });
      },
      
      delete: (key: string): void => {
        cache.delete(key);
      },
      
      clear: (): void => {
        cache.clear();
      },
      
      size: (): number => {
        return cache.size;
      },
      
      cleanup: (): void => {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
          if (now - entry.timestamp > entry.ttl) {
            cache.delete(key);
          }
        }
      },
    };
  },
};