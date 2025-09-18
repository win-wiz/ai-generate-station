/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // 优化 Turbopack 配置
      resolveAlias: {
        // 确保正确解析模块
        '@': './src',
      },
    },
  },
  // 添加网络配置以解决 OAuth 连接问题
  async rewrites() {
    return [
      // GitHub OAuth 代理配置
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },
  // 添加环境变量配置
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  // 添加网络超时配置
  serverRuntimeConfig: {
    // 增加服务器端超时时间
    timeout: 30000,
  },
  publicRuntimeConfig: {
    // 公共运行时配置
    apiUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
};

export default nextConfig;