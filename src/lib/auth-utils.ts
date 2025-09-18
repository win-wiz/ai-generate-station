import bcrypt from 'bcryptjs';
import { getSession } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * 密码加密工具
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * 加密密码
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * 验证密码
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 验证密码强度
   */
  static validateStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('密码长度至少8位');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    }

    if (!/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}



/**
 * 登录限制工具
 */
export class LoginLimitUtils {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCK_DURATION = 15 * 60 * 1000; // 15分钟

  /**
   * 检查用户是否被锁定
   */
  static isUserLocked(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return false;
    return new Date() < lockedUntil;
  }

  /**
   * 检查是否应该锁定用户
   */
  static shouldLockUser(failedCount: number): boolean {
    return failedCount >= this.MAX_FAILED_ATTEMPTS;
  }

  /**
   * 计算锁定结束时间
   */
  static calculateLockUntil(): Date {
    return new Date(Date.now() + this.LOCK_DURATION);
  }

  /**
   * 获取剩余锁定时间（分钟）
   */
  static getRemainingLockTime(lockedUntil: Date): number {
    const remaining = lockedUntil.getTime() - Date.now();
    return Math.ceil(remaining / (60 * 1000));
  }
}

/**
 * 邮箱验证工具
 */
export class EmailUtils {
  /**
   * 验证邮箱格式
   */
  static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 标准化邮箱地址
   */
  static normalize(email: string): string {
    return email.toLowerCase().trim();
  }
}

/**
 * CSRF保护工具
 */
export class CSRFUtils {
  /**
   * 生成CSRF令牌
   */
  static generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * 验证CSRF令牌
   */
  static verifyToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }
}

/**
 * 会话状态管理工具类
 */
export class SessionUtils {
  /**
   * 检查用户当前登录状态
   * @returns Promise<Session | null> 返回会话信息或null
   */
  static async checkAuthStatus(): Promise<Session | null> {
    try {
      const session = await getSession();
      return session;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return null;
    }
  }

  /**
   * 检查会话是否有效且未过期
   * @param session 会话对象
   * @returns boolean 会话是否有效
   */
  static isSessionValid(session: Session | null): boolean {
    if (!session || !session.user) {
      return false;
    }

    // 检查会话是否过期
    if (session.expires) {
      const expiryTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      
      if (currentTime >= expiryTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * 智能OAuth登录：先检查登录状态，再决定是否需要跳转
   * @param provider OAuth提供商
   * @param callbackUrl 回调URL
   * @returns Promise<{needsRedirect: boolean, session?: Session}>
   */
  static async smartOAuthLogin(
    provider: string, 
    callbackUrl: string = '/dashboard'
  ): Promise<{needsRedirect: boolean, session?: Session | null}> {
    // 首先检查当前登录状态
    const currentSession = await this.checkAuthStatus();
    
    if (this.isSessionValid(currentSession)) {
      // 用户已登录且会话有效，无需重新授权
      return {
        needsRedirect: false,
        session: currentSession
      };
    }

    // 用户未登录或会话已过期，需要进行OAuth授权
    return {
      needsRedirect: true,
      session: null
    };
  }

  /**
   * 获取OAuth提供商的显示名称
   * @param provider 提供商标识
   * @returns string 显示名称
   */
  static getProviderDisplayName(provider: string): string {
    const providerNames: Record<string, string> = {
      google: 'Google',
      github: 'GitHub',
      discord: 'Discord',
    };
    
    return providerNames[provider.toLowerCase()] || provider;
  }

  /**
   * 检查是否需要强制重新授权
   * 某些情况下即使有有效会话也需要重新授权，比如权限变更
   * @param provider OAuth提供商
   * @param forceReauth 是否强制重新授权
   * @returns boolean
   */
  static shouldForceReauth(provider: string, forceReauth: boolean = false): boolean {
    return forceReauth;
  }
}