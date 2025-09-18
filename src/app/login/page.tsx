import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

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
    <div className="fixed inset-0 overflow-hidden">
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
      
      <div className="flex h-full w-full">
        {/* 左侧装饰区域 - 在大屏幕上显示 */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 relative overflow-hidden">
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
          </div>
          
          {/* 装饰性几何图形 */}
          <div className="absolute top-20 right-20 w-32 h-32 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 right-32 w-24 h-24 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 right-12 w-16 h-16 border border-white/20 rounded-full" />
        </div>

        {/* 右侧登录表单区域 */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-12 py-8 min-h-0">
          <div className="w-full max-w-lg space-y-8 flex flex-col justify-center">
            {/* 头部 */}
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <svg
                  className="h-7 w-7 text-white"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                AI 生成站
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                登录您的账户，开始AI创作之旅
              </p>
            </div>

            {/* 登录表单 */}
            <div className="bg-white py-8 px-8 shadow-2xl rounded-2xl border border-gray-100/50 backdrop-blur-sm">
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