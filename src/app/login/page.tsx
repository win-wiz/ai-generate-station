import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'AI生成站 - 登录',
  description: '登录到AI生成站，体验强大的AI内容生成功能',
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || '/dashboard';
  
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-pink-500">
      {/* 返回首页按钮 */}
      <div className="absolute top-4 left-4 z-20">
        <a
          href="/"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors duration-200 border border-white/20 text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />                                       
          </svg>
          返回首页
        </a>      
      </div>

      {/* 主要内容区域 - flex 容器 */}
      <div className="flex h-full">
        {/* 左侧装饰区域 - 在大屏幕上显示 */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="max-w-md">
              <h1 className="text-4xl font-bold mb-6">
                欢迎来到 AI 生成站
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                体验最先进的AI技术，轻松生成高质量内容
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-blue-100">智能文本生成</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-blue-100">图像创作助手</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-blue-100">代码生成工具</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-blue-100">多语言支持</span>
                </div>                 
              </div>
            </div>
            
            {/* 装饰性几何图形 */}
            <div className="absolute top-20 right-20 w-32 h-32 border border-white/20 rounded-full" />
            <div className="absolute bottom-20 right-32 w-24 h-24 border border-white/20 rounded-full" />
            <div className="absolute top-1/2 right-12 w-16 h-16 border border-white/20 rounded-full" />
          </div>
        </div>

        {/* 右侧登录表单区域 */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 py-8 min-h-0 lg:bg-gray-50/95 lg:backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-8 flex flex-col justify-center">
            {/* 头部 */}
            <div className="text-center">
              <div className="mx-auto h-14 w-14 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                AI 生成站
              </h2>
              <p className="text-gray-600 leading-relaxed">
                登录您的账户，开始AI创作之旅
              </p>
            </div>

            {/* 登录表单 */}
            <div className="bg-white/95 backdrop-blur-sm py-10 px-10 shadow-2xl rounded-3xl border border-white/20 ring-1 ring-gray-900/5 transform hover:scale-[1.02] transition-transform duration-300">
              <LoginForm redirectTo={callbackUrl} />
            </div>

            {/* 底部链接 */}
            <div className="text-center text-sm text-gray-500 px-4">
              <p className="leading-relaxed">
                继续使用即表示您同意我们的{' '}
                <a href="/terms" className="text-blue-600 hover:text-blue-800 underline transition-colors">
                  服务条款
                </a>{' '}
                和{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline transition-colors">
                  隐私政策
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}