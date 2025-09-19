import '@/styles/globals.css';

import { type Metadata, type Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';
import { Navigation } from '@/components/ui/Navigation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';

export const metadata: Metadata = {
  title: {
    default: 'AI 生成站 - 智能内容创作平台',
    template: '%s | AI 生成站',
  },
  description: '体验最先进的AI技术，轻松生成高质量的文本、图像和代码内容',
  keywords: ['AI', '人工智能', '内容生成', '智能创作', '自动化', '生产力工具', 'GPT', '机器学习'],
  authors: [{ name: 'AI生成站团队' }],
  creator: 'AI生成站',
  publisher: 'AI生成站',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    title: 'AI 生成站 - 智能内容创作平台',
    description: '体验最先进的AI技术，轻松生成高质量的文本、图像和代码内容',
    siteName: 'AI 生成站',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI 生成站',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 生成站 - 智能内容创作平台',
    description: '体验最先进的AI技术，轻松生成高质量的文本、图像和代码内容',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#2e026d' },
  ],
};


interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预加载关键资源 */}
        {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}
        {/* <link rel="preconnect" href="https://api.openai.com" /> */}
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        
        {/* PWA 支持 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI生成站" />
        
        {/* 性能优化 */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="gradient-bg min-h-screen antialiased font-sans">
        <ErrorBoundary
          showDetails={true}
          enableErrorReporting={true}
        >
          <SessionProvider
            // 优化会话配置
            refetchInterval={5 * 60} // 5分钟刷新一次
            refetchOnWindowFocus={true}
            refetchWhenOffline={false}
          >
            <div className="relative flex min-h-screen flex-col">
              <Navigation />
              <main className="flex-1 pt-16">
                {children}
              </main>
            </div>
            <PerformanceMonitor />
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
