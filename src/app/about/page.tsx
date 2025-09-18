import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '关于我们 - AI生成站',
  description: '了解AI生成站的技术特色和服务优势',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen text-white pt-16">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            关于 <span className="text-[hsl(280,100%,70%)]">AI生成站</span>
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            我们致力于为用户提供最先进的AI技术服务，让创意无限可能
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">高性能AI引擎</h3>
            <p className="text-white/80">
              基于最新的大语言模型和深度学习技术，提供快速、准确的内容生成服务
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">安全可靠</h3>
            <p className="text-white/80">
              采用企业级安全标准，保护用户数据隐私，确保服务稳定可靠
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-8 backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">用户友好</h3>
            <p className="text-white/80">
              简洁直观的界面设计，让每个用户都能轻松上手，享受AI带来的便利
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white/5 rounded-2xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">技术栈</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">Next</span>
              </div>
              <h4 className="font-semibold">Next.js 15</h4>
              <p className="text-sm text-white/60">React框架</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">TS</span>
              </div>
              <h4 className="font-semibold">TypeScript</h4>
              <p className="text-sm text-white/60">类型安全</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">DB</span>
              </div>
              <h4 className="font-semibold">Drizzle ORM</h4>
              <p className="text-sm text-white/60">数据库</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">AI</span>
              </div>
              <h4 className="font-semibold">AI Models</h4>
              <p className="text-sm text-white/60">智能引擎</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">准备开始您的AI之旅？</h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            立即注册，体验最前沿的AI生成技术，释放您的创造力
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              立即注册
            </Link>
            <Link
              href="/"
              className="px-8 py-3 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}