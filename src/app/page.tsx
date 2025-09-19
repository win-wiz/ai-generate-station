import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-foreground mb-6">
          欢迎来到 AI 生成站
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8">
          体验最先进的AI技术，轻松生成高质量的文本、图像和代码内容
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">文本生成</h3>
            <p className="text-muted-foreground">
              使用先进的语言模型生成高质量文章、创意内容和技术文档
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">图像创作</h3>
            <p className="text-muted-foreground">
              通过AI技术创建独特的图像、插画和设计素材
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-3">代码助手</h3>
            <p className="text-muted-foreground">
              智能代码生成、优化建议和技术问题解答
            </p>
          </div>
        </div>

        <div className="space-x-4">
          <Button asChild size="lg">
            <Link href="/dashboard">
              开始使用
            </Link>
          </Button>
          
          <Button variant="outline" size="lg" asChild>
            <Link href="/about">
              了解更多
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}