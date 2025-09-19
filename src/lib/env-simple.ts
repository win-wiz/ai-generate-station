// 简化的环境变量配置
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret',
  JWT_SECRET: process.env.JWT_SECRET || 'jwt-secret',
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  CLOUDFLARE_D1_TOKEN: process.env.CLOUDFLARE_D1_TOKEN,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
};