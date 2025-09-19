/**
 * Next.js configuration for Cloudflare Pages
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // 性能优化
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot'],
  },

  // Cloudflare 兼容的服务端外部包配置
  serverExternalPackages: [
    'bcryptjs', 
    'jsonwebtoken', 
    'better-sqlite3', 
    'puppeteer',
    '@libsql/client'
  ],

  // 编译优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Cloudflare Pages 图片配置
  images: {
    unoptimized: true,
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // 页面扩展名
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // 严格模式
  reactStrictMode: true,

  // 构建时忽略错误（仅在生产环境）
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // Webpack 优化
  webpack: (config, { dev, isServer }) => {
    // Cloudflare 兼容性配置
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      util: false,
    };

    // 处理不兼容的包
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('puppeteer', 'better-sqlite3');
    }

    return config;
  },
};

export default config;