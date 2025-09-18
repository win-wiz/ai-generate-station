import { SECURITY_CONFIG } from './security';

// JWT payload 接口
export interface JWTPayload {
  sub: string; // 用户ID
  email: string;
  name?: string;
  role?: string;
  iat: number; // 签发时间
  exp: number; // 过期时间
  jti?: string; // JWT ID
}

// 简单的Base64 URL编码/解码
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // 添加填充
  str += '='.repeat((4 - str.length % 4) % 4);
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// 简单的HMAC-SHA256实现（仅用于演示，生产环境应使用专业库）
async function hmacSha256(key: string, data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // 浏览器环境
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(data);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    return base64UrlEncode(String.fromCharCode.apply(null, Array.from(signatureArray)));
  } else {
    // 服务器环境 - 简单实现（生产环境应使用crypto模块）
    return base64UrlEncode(btoa(key + data).slice(0, 32));
  }
}

// 生成JWT
export async function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = SECURITY_CONFIG.JWT.EXPIRES_IN;
  
  // 计算过期时间（7天）
  const exp = now + (7 * 24 * 60 * 60);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp,
  };
  
  const header = {
    alg: SECURITY_CONFIG.JWT.ALGORITHM,
    typ: 'JWT',
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const secret = getJWTSecret();
  const signature = await hmacSha256(secret, `${encodedHeader}.${encodedPayload}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 验证JWT
export async function verifyJWT(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // 检查所有部分是否存在
    if (!encodedHeader || !encodedPayload || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // 验证签名
    const secret = getJWTSecret();
    const expectedSignature = await hmacSha256(secret, `${encodedHeader}.${encodedPayload}`);
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // 解析payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Token parsing failed' };
  }
}

// 刷新JWT
export async function refreshJWT(token: string): Promise<{ success: boolean; newToken?: string; error?: string }> {
  const verification = await verifyJWT(token);
  
  if (!verification.valid || !verification.payload) {
    return { success: false, error: verification.error };
  }
  
  // 检查token是否即将过期（在最后24小时内）
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = verification.payload.exp - now;
  const oneDayInSeconds = 24 * 60 * 60;
  
  if (timeUntilExpiry > oneDayInSeconds) {
    return { success: false, error: 'Token not eligible for refresh yet' };
  }
  
  // 生成新token
  const newToken = await generateJWT({
    sub: verification.payload.sub,
    email: verification.payload.email,
    name: verification.payload.name,
    role: verification.payload.role,
  });
  
  return { success: true, newToken };
}

// 获取JWT密钥
function getJWTSecret(): string {
  // 在生产环境中，这应该从环境变量中获取
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.JWT_SECRET) {
    return (globalThis as any).process.env.JWT_SECRET as string;
  }
  
  // 开发环境的默认密钥（生产环境中绝不应该使用）
  return 'your-super-secret-jwt-key-change-this-in-production';
}

// 从请求头中提取JWT
export function extractJWTFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

// JWT中间件
export async function jwtMiddleware(request: Request): Promise<{
  authenticated: boolean;
  user?: JWTPayload;
  error?: string;
}> {
  const token = extractJWTFromRequest(request);
  
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }
  
  const verification = await verifyJWT(token);
  
  if (!verification.valid) {
    return { authenticated: false, error: verification.error };
  }
  
  return { authenticated: true, user: verification.payload };
}

// 生成API密钥（用于API访问）
export function generateAPIKey(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2);
  return `ak_${timestamp}_${randomPart}`;
}

// 验证API密钥格式
export function validateAPIKeyFormat(apiKey: string): boolean {
  const pattern = /^ak_[a-z0-9]+_[a-z0-9]+$/;
  return pattern.test(apiKey);
}