import { SECURITY_CONFIG } from './security';

// 内存存储的速率限制器（生产环境应使用Redis）
class MemoryRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number; blockedUntil?: number }> = new Map();

  // 检查是否超过速率限制
  isRateLimited(key: string, config: { MAX: number; WINDOW_MS: number; BLOCK_DURATION_MS?: number }): {
    isLimited: boolean;
    remainingAttempts: number;
    resetTime: number;
    blockedUntil?: number;
  } {
    const now = Date.now();
    const record = this.attempts.get(key);

    // 如果没有记录，创建新记录
    if (!record) {
      this.attempts.set(key, { count: 1, resetTime: now + config.WINDOW_MS });
      return {
        isLimited: false,
        remainingAttempts: config.MAX - 1,
        resetTime: now + config.WINDOW_MS,
      };
    }

    // 检查是否仍在阻止期内
    if (record.blockedUntil && now < record.blockedUntil) {
      return {
        isLimited: true,
        remainingAttempts: 0,
        resetTime: record.resetTime,
        blockedUntil: record.blockedUntil,
      };
    }

    // 检查时间窗口是否已重置
    if (now >= record.resetTime) {
      record.count = 1;
      record.resetTime = now + config.WINDOW_MS;
      record.blockedUntil = undefined;
      this.attempts.set(key, record);
      return {
        isLimited: false,
        remainingAttempts: config.MAX - 1,
        resetTime: record.resetTime,
      };
    }

    // 增加尝试次数
    record.count++;

    // 检查是否超过限制
    if (record.count > config.MAX) {
      if (config.BLOCK_DURATION_MS) {
        record.blockedUntil = now + config.BLOCK_DURATION_MS;
      }
      this.attempts.set(key, record);
      return {
        isLimited: true,
        remainingAttempts: 0,
        resetTime: record.resetTime,
        blockedUntil: record.blockedUntil,
      };
    }

    this.attempts.set(key, record);
    return {
      isLimited: false,
      remainingAttempts: config.MAX - record.count,
      resetTime: record.resetTime,
    };
  }

  // 重置特定键的限制
  reset(key: string): void {
    this.attempts.delete(key);
  }

  // 清理过期记录
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now >= record.resetTime && (!record.blockedUntil || now >= record.blockedUntil)) {
        this.attempts.delete(key);
      }
    }
  }
}

// 全局速率限制器实例
const rateLimiter = new MemoryRateLimiter();

// 定期清理过期记录
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}

// 登录尝试速率限制
export function checkLoginRateLimit(ip: string) {
  return rateLimiter.isRateLimited(
    `login:${ip}`,
    SECURITY_CONFIG.RATE_LIMIT.LOGIN_ATTEMPTS
  );
}

// API请求速率限制
export function checkAPIRateLimit(ip: string) {
  return rateLimiter.isRateLimited(
    `api:${ip}`,
    SECURITY_CONFIG.RATE_LIMIT.API_REQUESTS
  );
}

// 密码重置速率限制
export function checkPasswordResetRateLimit(email: string) {
  return rateLimiter.isRateLimited(
    `password-reset:${email}`,
    SECURITY_CONFIG.RATE_LIMIT.PASSWORD_RESET
  );
}

// 重置登录尝试限制
export function resetLoginRateLimit(ip: string): void {
  rateLimiter.reset(`login:${ip}`);
}

// 获取客户端IP地址
export function getClientIP(request: Request): string {
  // 检查各种可能的IP头
  const headers = request.headers;
  
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For 可能包含多个IP，取第一个
    const firstIP = xForwardedFor.split(',')[0];
    return firstIP ? firstIP.trim() : 'unknown';
  }
  
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP.trim();
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // 如果都没有，返回默认值
  return '127.0.0.1';
}

// 创建速率限制中间件
export function createRateLimitMiddleware(
  getRateLimitConfig: (request: Request) => { MAX: number; WINDOW_MS: number; BLOCK_DURATION_MS?: number },
  getKey: (request: Request) => string
) {
  return function rateLimitMiddleware(request: Request) {
    const key = getKey(request);
    const config = getRateLimitConfig(request);
    const result = rateLimiter.isRateLimited(key, config);
    
    return {
      ...result,
      headers: {
        'X-RateLimit-Limit': config.MAX.toString(),
        'X-RateLimit-Remaining': result.remainingAttempts.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        ...(result.blockedUntil && {
          'X-RateLimit-Blocked-Until': new Date(result.blockedUntil).toISOString(),
        }),
      },
    };
  };
}

// 预定义的中间件
export const loginRateLimitMiddleware = createRateLimitMiddleware(
  () => SECURITY_CONFIG.RATE_LIMIT.LOGIN_ATTEMPTS,
  (request) => `login:${getClientIP(request)}`
);

export const apiRateLimitMiddleware = createRateLimitMiddleware(
  () => SECURITY_CONFIG.RATE_LIMIT.API_REQUESTS,
  (request) => `api:${getClientIP(request)}`
);

export const passwordResetRateLimitMiddleware = createRateLimitMiddleware(
  () => SECURITY_CONFIG.RATE_LIMIT.PASSWORD_RESET,
  (request) => {
    // 从请求体中提取邮箱（需要先解析）
    try {
      const url = new URL(request.url);
      const email = url.searchParams.get('email') || 'unknown';
      return `password-reset:${email}`;
    } catch {
      return `password-reset:unknown`;
    }
  }
);