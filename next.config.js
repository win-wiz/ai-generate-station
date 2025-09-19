/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // 性能优化
  experimental: {
    // 优化字体加载
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot'],
  },

  // 服务端外部包配置
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken'],

  // Turbopack 配置
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 编译优化
  compiler: {
    // 移除 console.log (生产环境)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
  },

  // 输出优化
  output: 'standalone',
  
  // 压缩优化
  compress: true,
  
  // 静态资源优化
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.CDN_URL : undefined,
  
  // 安全头配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://github.com;",
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // 重定向优化
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Webpack 优化
  webpack: (config, { dev, isServer }) => {
    // 生产环境优化
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 页面扩展名
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // 严格模式
  reactStrictMode: true,

  // 类型检查
  typescript: {
    ignoreBuildErrors: true, // 暂时忽略TypeScript错误
  },

  // ESLint 配置
  eslint: {
    ignoreDuringBuilds: true, // 暂时忽略构建时的ESLint错误
  },
};

export default config;