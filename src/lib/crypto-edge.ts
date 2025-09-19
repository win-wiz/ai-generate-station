/**
 * Edge Runtime 兼容的加密工具
 * 使用 Web Crypto API 替代 Node.js crypto 和 bcryptjs
 */

import { SECURITY_CONFIG } from './security';

/**
 * Edge Runtime 兼容的密码哈希工具
 */
export class EdgeCryptoUtils {
  /**
   * 生成安全的随机盐值
   */
  static generateSalt(length: number = 16): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 使用 PBKDF2 哈希密码 (Edge Runtime 兼容)
   */
  static async hashPassword(password: string, salt?: string): Promise<string> {
    const saltToUse = salt || this.generateSalt();
    
    // 将密码和盐值转换为 ArrayBuffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(saltToUse);
    
    // 导入密码作为密钥材料
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // 使用 PBKDF2 派生密钥
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: SECURITY_CONFIG.PASSWORD.BCRYPT_ROUNDS * 1000, // 转换为合适的迭代次数
        hash: 'SHA-256',
      },
      keyMaterial,
      256 // 32 bytes
    );
    
    // 转换为十六进制字符串
    const hashArray = new Uint8Array(derivedBits);
    const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // 返回盐值和哈希值的组合
    return `${saltToUse}:${hashHex}`;
  }

  /**
   * 验证密码 (Edge Runtime 兼容)
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      // 分离盐值和哈希值
      const parts = hashedPassword.split(':');
      if (parts.length !== 2) {
        return false;
      }
      
      const [salt, originalHash] = parts;
      if (!salt || !originalHash) {
        return false;
      }
      
      // 使用相同的盐值重新哈希输入的密码
      const newHash = await this.hashPassword(password, salt);
      const [, computedHash] = newHash.split(':');
      
      if (!computedHash) {
        return false;
      }
      
      // 时间安全的比较
      return this.constantTimeCompare(computedHash, originalHash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * 时间安全的字符串比较
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * 生成安全的随机令牌
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 生成 JWT 密钥 (Edge Runtime 兼容)
   */
  static async generateJWTKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );
  }

  /**
   * 使用 Web Crypto API 签名 JWT (简化版本)
   */
  static async signJWT(payload: Record<string, any>, secret: string): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    // Base64URL 编码
    const encodeBase64URL = (obj: any): string => {
      const json = JSON.stringify(obj);
      const base64 = btoa(json);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = encodeBase64URL(header);
    const encodedPayload = encodeBase64URL(payload);
    const data = `${encodedHeader}.${encodedPayload}`;

    // 创建签名
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${data}.${signatureBase64}`;
  }

  /**
   * 验证 JWT 签名 (简化版本)
   */
  static async verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const data = `${encodedHeader}.${encodedPayload}`;

      // 验证签名
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(data);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      // 解码签名
      const signatureBase64 = encodedSignature!
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      // 添加填充
      const padding = '='.repeat((4 - signatureBase64.length % 4) % 4);
      const signatureDecoded = atob(signatureBase64 + padding);
      const signatureArray = new Uint8Array(signatureDecoded.length);
      for (let i = 0; i < signatureDecoded.length; i++) {
        signatureArray[i] = signatureDecoded.charCodeAt(i);
      }

      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        signatureArray,
        messageData
      );

      if (!isValid) {
        return null;
      }

      // 解码 payload
      const payloadBase64 = encodedPayload!
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const payloadPadding = '='.repeat((4 - payloadBase64.length % 4) % 4);
      const payloadJson = atob(payloadBase64 + payloadPadding);
      const payload = JSON.parse(payloadJson);

      // 检查过期时间
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * 生成密码重置令牌
   */
  static generatePasswordResetToken(): {
    token: string;
    expires: Date;
  } {
    const token = this.generateSecureToken(32);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1小时后过期
    
    return { token, expires };
  }

  /**
   * 生成 CSRF 令牌
   */
  static generateCSRFToken(): string {
    return this.generateSecureToken(SECURITY_CONFIG.CSRF.TOKEN_LENGTH);
  }

  /**
   * 验证 CSRF 令牌
   */
  static validateCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) {
      return false;
    }
    
    return this.constantTimeCompare(token, storedToken);
  }
}

/**
 * 密码强度验证 (Edge Runtime 兼容)
 */
export class EdgePasswordValidator {
  /**
   * 验证密码强度
   */
  static validateStrength(password: string): {
    isValid: boolean;
    score: number;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < SECURITY_CONFIG.PASSWORD.MIN_LENGTH) {
      errors.push(`密码长度至少${SECURITY_CONFIG.PASSWORD.MIN_LENGTH}位`);
      suggestions.push('增加密码长度');
    } else {
      score += 20;
    }

    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // 字符类型检查
    if (SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
      suggestions.push('添加大写字母');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
      suggestions.push('添加小写字母');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
      suggestions.push('添加数字');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (SECURITY_CONFIG.PASSWORD.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符');
      suggestions.push('添加特殊字符 (!@#$%^&*等)');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    }

    // 复杂性检查
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) {
      score += 10;
    } else {
      suggestions.push('避免重复字符');
    }

    // 常见密码检查
    if (this.isCommonPassword(password)) {
      score -= 30;
      errors.push('请避免使用常见密码');
      suggestions.push('使用更独特的密码组合');
    }

    // 连续字符检查
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      suggestions.push('避免连续重复字符');
    }

    return {
      isValid: errors.length === 0,
      score: Math.max(0, Math.min(100, score)),
      errors,
      suggestions,
    };
  }

  /**
   * 检查是否为常见密码
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', '1234567890', 'qwerty', 'abc123', '111111',
      '123123', 'admin', 'letmein', 'welcome', 'monkey',
      '1234', 'dragon', 'pass', 'master', 'hello',
      'freedom', 'whatever', 'qazwsx', 'trustno1', 'jordan23'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 生成强密码建议
   */
  static generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
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
}