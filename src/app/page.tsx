'use client';

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RouteGuard } from "@/components/RouteGuard";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 根据登录状态处理重定向逻辑
  useEffect(() => {
    // 等待会话状态加载完成
    if (status === 'loading') return;
    
    if (status === 'authenticated' && session) {
      // 已登录用户重定向到仪表盘
      console.log('Authenticated user, redirecting to dashboard');
      router.replace('/dashboard');
    } else if (status === 'unauthenticated') {
      // 未登录用户停留在首页（明确处理，确保不被其他逻辑影响）
      console.log('Unauthenticated user, staying on home page');
      // 不需要额外操作，但这里明确表示未登录用户应该停留
    }
  }, [status, session, router]);

  // 如果用户已登录，显示重定向加载状态
  if (status === 'authenticated' && session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center text-white pt-16">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-xl text-white/80">正在跳转到仪表盘...</p>
        </div>
      </main>
    );
  }

  return (
    <RouteGuard 
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center text-white pt-16">
          <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="text-xl text-white/80">正在加载...</p>
          </div>
        </main>
      }
    >
      <main className="flex min-h-screen flex-col items-center justify-center text-white pt-16">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            AI <span className="text-[hsl(280,100%,70%)]">生成站</span>
          </h1>
          <p className="text-xl text-white/80 text-center max-w-2xl">
            体验最先进的AI技术，轻松生成高质量的文本、图像和代码内容
          </p>
          
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              立即开始
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              了解更多
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-8 mt-8">
            <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">智能文本生成</h3>
              <div className="text-lg text-white/80">
                基于先进的AI模型，生成高质量的文章、摘要和创意内容
              </div>
            </div>
            
            <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">图像创作</h3>
              <div className="text-lg text-white/80">
                通过文字描述生成精美图像，支持多种艺术风格和场景
              </div>
            </div>
            
            <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">代码生成</h3>
              <div className="text-lg text-white/80">
                智能代码助手，支持多种编程语言的代码生成和优化
              </div>
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
