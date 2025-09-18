import jwt from 'jsonwebtoken';
import { env } from '@/env';

/**
 * 服务器端JWT工具
 * 只能在服务器端使用
 */
export class JWTServerUtils {
  private static readonly SECRET = env.JWT_SECRET || 'fallback-secret-key';
  private static readonly EXPIRES_IN = '7d';

  /**
   * 生成JWT token
   */
  static sign(payload: Record<string, any>): string {
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
  }

  /**
   * 验证JWT token
   */
  static verify(token: string): Record<string, any> | null {
    try {
      return jwt.verify(token, this.SECRET) as Record<string, any>;
    } catch {
      return null;
    }
  }

  /**
   * 解码JWT token（不验证签名）
   */
  static decode(token: string): Record<string, any> | null {
    try {
      return jwt.decode(token) as Record<string, any>;
    } catch {
      return null;
    }
  }
}