import { env } from '@/env';
import { EdgeCryptoUtils } from './crypto-edge';
import { SECURITY_CONFIG } from './security';

/**
 * Edge Runtime 兼容的 JWT 工具
 * 使用 Web Crypto API 替代 jsonwebtoken
 */
export class JWTServerUtils {
  private static readonly SECRET = env.JWT_SECRET || 'fallback-secret-key-for-development-only';
  private static readonly EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * 生成JWT token (Edge Runtime 兼容)
   */
  static async sign(payload: Record<string, any>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.EXPIRES_IN_SECONDS;
    
    const fullPayload = {
      ...payload,
      iat: now,
      exp,
      iss: 'ai-generate-station',
    };

    return EdgeCryptoUtils.signJWT(fullPayload, this.SECRET);
  }

  /**
   * 验证JWT token (Edge Runtime 兼容)
   */
  static async verify(token: string): Promise<Record<string, any> | null> {
    try {
      const payload = await EdgeCryptoUtils.verifyJWT(token, this.SECRET);
      
      if (!payload) {
        return null;
      }

      // 验证发行者
      if (payload.iss !== 'ai-generate-station') {
        console.warn('Invalid JWT issuer');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * 解码JWT token（不验证签名）
   */
  static decode(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payloadBase64 = parts[1]!
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const padding = '='.repeat((4 - payloadBase64.length % 4) % 4);
      const payloadJson = atob(payloadBase64 + padding);
      
      return JSON.parse(payloadJson);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  /**
   * 生成刷新令牌
   */
  static async generateRefreshToken(userId: string): Promise<{
    token: string;
    expires: Date;
  }> {
    const token = EdgeCryptoUtils.generateSecureToken(64);
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30天后过期
    
    return { token, expires };
  }

  /**
   * 验证令牌是否即将过期
   */
  static isTokenExpiringSoon(payload: Record<string, any>, thresholdMinutes: number = 30): boolean {
    if (!payload.exp) {
      return false;
    }
    
    const expirationTime = payload.exp * 1000; // 转换为毫秒
    const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
    
    return expirationTime <= thresholdTime;
  }

  /**
   * 从请求头中提取 JWT token
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
      return null;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1] || null;
  }

  /**
   * 创建访问令牌和刷新令牌对
   */
  static async createTokenPair(payload: Record<string, any>): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenExpires: Date;
  }> {
    const accessToken = await this.sign(payload);
    const { token: refreshToken, expires: refreshTokenExpires } = await this.generateRefreshToken(payload.userId);
    
    return {
      accessToken,
      refreshToken,
      refreshTokenExpires,
    };
  }
}