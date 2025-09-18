import { SECURITY_CONFIG, validatePasswordStrength } from './security';

// 密码哈希和验证工具
// 注意：这是一个简化的实现，生产环境应使用bcrypt等专业库

// 简单的密码哈希函数（使用Web Crypto API）
async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // 浏览器环境
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    
    // 使用多轮SHA-256来模拟bcrypt的工作原理
    let hash = await window.crypto.subtle.digest('SHA-256', data);
    
    // 进行多轮哈希（模拟bcrypt rounds）
    for (let i = 0; i < SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS; i++) {
      const hashArray = new Uint8Array(hash);
      const newData = new Uint8Array(hashArray.length + data.length);
      newData.set(hashArray);
      newData.set(new Uint8Array(data), hashArray.length);
      hash = await window.crypto.subtle.digest('SHA-256', newData);
    }
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // 服务器环境的简单实现
    // 在生产环境中应该使用bcrypt
    let result = password + salt;
    for (let i = 0; i < SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS; i++) {
      // 简单的哈希实现（仅用于演示）
      let hash = 0;
      for (let j = 0; j < result.length; j++) {
        const char = result.charCodeAt(j);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      result = hash.toString(16) + result;
    }
    return result.slice(0, 64); // 限制长度
  }
}

// 生成盐值
function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // 服务器环境的简单实现
    return Math.random().toString(36).substring(2, 18);
  }
}

// 加密密码
export async function encryptPassword(password: string): Promise<{
  success: boolean;
  hash?: string;
  errors?: string[];
}> {
  // 验证密码强度
  const validation = validatePasswordStrength(password);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }
  
  try {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    
    // 将盐值和哈希值组合存储
    const combinedHash = `${salt}:${hash}`;
    
    return {
      success: true,
      hash: combinedHash,
    };
  } catch (error) {
    return {
      success: false,
      errors: ['密码加密失败'],
    };
  }
}

// 验证密码
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // 分离盐值和哈希值
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const salt = parts[0];
    const originalHash = parts[1];
    
    if (!salt || !originalHash) {
      return false;
    }
    
    const computedHash = await hashPassword(password, salt);
    
    // 时间安全的比较
    if (computedHash.length !== originalHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ originalHash.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    return false;
  }
}

// 密码重置令牌生成
export function generatePasswordResetToken(): {
  token: string;
  expires: Date;
} {
  // 生成随机令牌
  let token = '';
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }
  
  // 设置过期时间（1小时）
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);
  
  return { token, expires };
}

// 验证密码重置令牌
export function validatePasswordResetToken(token: string, storedToken: string, expires: Date): boolean {
  // 检查是否过期
  if (new Date() > expires) {
    return false;
  }
  
  // 时间安全的令牌比较
  if (token.length !== storedToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  
  return result === 0;
}

// 生成临时密码
export function generateTemporaryPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // 确保包含每种类型的字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 填充剩余长度
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// 检查密码是否在常见密码列表中
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    '123456', 'password', '123456789', '12345678', '12345',
    '1234567', '1234567890', 'qwerty', 'abc123', '111111',
    '123123', 'admin', 'letmein', 'welcome', 'monkey',
    '1234', 'dragon', 'pass', 'master', 'hello',
    'freedom', 'whatever', 'qazwsx', 'trustno1', 'jordan23'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

// 密码强度评分（0-100）
export function calculatePasswordScore(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  
  // 长度评分
  if (password.length >= 8) score += 20;
  else feedback.push('密码长度至少8位');
  
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // 字符类型评分
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('添加小写字母');
  
  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('添加大写字母');
  
  if (/\d/.test(password)) score += 15;
  else feedback.push('添加数字');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
  else feedback.push('添加特殊字符');
  
  // 复杂性评分
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 10;
  
  // 常见密码检查
  if (isCommonPassword(password)) {
    score -= 30;
    feedback.push('避免使用常见密码');
  }
  
  // 重复字符检查
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('避免连续重复字符');
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    feedback,
  };
}