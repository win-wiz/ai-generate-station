// 安全配置常量
export const SECURITY_CONFIG = {
  // 密码策略
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    BCRYPT_ROUNDS: 12,
  },
  
  // JWT配置
  JWT: {
    EXPIRES_IN: '7d',
    REFRESH_EXPIRES_IN: '30d',
    ALGORITHM: 'HS256' as const,
  },
  
  // 速率限制
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: {
      MAX: 5,
      WINDOW_MS: 15 * 60 * 1000, // 15分钟
      BLOCK_DURATION_MS: 30 * 60 * 1000, // 30分钟
    },
    API_REQUESTS: {
      MAX: 100,
      WINDOW_MS: 15 * 60 * 1000, // 15分钟
    },
    PASSWORD_RESET: {
      MAX: 3,
      WINDOW_MS: 60 * 60 * 1000, // 1小时
    },
  },
  
  // CSRF保护
  CSRF: {
    TOKEN_LENGTH: 32,
    EXPIRES_IN: 60 * 60 * 1000, // 1小时
  },
  
  // 会话配置
  SESSION: {
    MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7天
    SECURE: typeof window === 'undefined' ? (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'production') : window.location.protocol === 'https:',
    HTTP_ONLY: true,
    SAME_SITE: 'strict' as const,
  },
} as const;

// 密码强度验证
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
    errors.push(`密码长度至少${SECURITY_CONFIG.PASSWORD.MIN_LENGTH}位`);
  }
  
  if (password.length > SECURITY_CONFIG.PASSWORD.MAX_LENGTH) {
    errors.push(`密码长度不能超过${SECURITY_CONFIG.PASSWORD.MAX_LENGTH}位`);
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 邮箱验证
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// 生成安全的随机令牌
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    // 浏览器环境使用Web Crypto API
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
     // 服务器环境使用Node.js crypto
     const crypto = (globalThis as any).require?.('crypto');
     return crypto?.randomBytes(length).toString('hex') || Math.random().toString(36).substring(2, 2 + length);
   }
}

// 生成CSRF令牌
export function generateCSRFToken(): string {
  return generateSecureToken(SECURITY_CONFIG.CSRF.TOKEN_LENGTH);
}

// 验证CSRF令牌
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  
  // 简单的字符串比较（在生产环境中应该使用时间安全的比较）
  if (token.length !== storedToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}

// 清理用户输入（防止XSS）
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // 移除尖括号
    .replace(/javascript:/gi, '') // 移除javascript:协议
    .replace(/on\w+=/gi, '') // 移除事件处理器
    .trim();
}

// IP地址验证
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// 检查是否为可疑IP（简单的黑名单检查）
export function isSuspiciousIP(ip: string): boolean {
  // 这里可以添加已知的恶意IP地址或IP段
  const suspiciousIPs = [
    '127.0.0.1', // 示例：本地回环（在生产环境中可能需要特殊处理）
  ];
  
  const suspiciousRanges: string[] = [
    // 可以添加IP段，例如：'192.168.1.'
  ];
  
  return suspiciousIPs.includes(ip) || 
         suspiciousRanges.some(range => ip.startsWith(range));
}

// 安全头配置
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; '),
} as const;

// 日志记录安全事件
export function logSecurityEvent(event: {
  type: 'login_attempt' | 'login_failure' | 'suspicious_activity' | 'csrf_violation' | 'rate_limit_exceeded';
  ip: string;
  userAgent?: string;
  userId?: string;
  details?: Record<string, any>;
}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'security',
    ...event,
  };
  
  // 在生产环境中，这里应该发送到专门的安全日志系统
  console.log('[SECURITY]', JSON.stringify(logEntry));
  
  // 如果是严重的安全事件，可以触发告警
  if (['suspicious_activity', 'csrf_violation'].includes(event.type)) {
    // 触发告警逻辑
    console.warn('[SECURITY ALERT]', JSON.stringify(logEntry));
  }
}