/**
 * 客户端环境变量工具
 * 用于在客户端组件中安全地检查环境状态
 */

/**
 * 检查是否为开发环境
 */
export const isDevelopment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev') ||
    window.location.port === '3000'
  );
};

/**
 * 检查是否为生产环境
 */
export const isProduction = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !isDevelopment() && !window.location.hostname.includes('test');
};

/**
 * 获取当前环境名称
 */
export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (typeof window === 'undefined') return 'development';
  
  if (isDevelopment()) return 'development';
  if (window.location.hostname.includes('test')) return 'test';
  return 'production';
};

/**
 * 安全地获取公共环境变量
 */
export const getPublicEnvVar = (key: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  
  // Next.js 公共环境变量会被注入到客户端
  return (window as any).__NEXT_DATA__?.env?.[key];
};