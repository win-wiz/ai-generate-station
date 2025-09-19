import { z } from 'zod';

// 环境变量验证 schema
const envSchema = z.object({
  // 数据库
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLOUDFLARE_D1_TOKEN: z.string().optional(),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  
  // 应用
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// 验证环境变量
function validateEnv() {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('❌ 环境变量验证失败:', error);
    
    // 在开发环境提供默认值
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ 使用开发环境默认配置');
      return {
        DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
        CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN || '',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-key',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
        NODE_ENV: 'development' as const,
      };
    }
    
    throw error;
  }
}

export const env = validateEnv();

// 类型导出
export type Env = z.infer<typeof envSchema>;