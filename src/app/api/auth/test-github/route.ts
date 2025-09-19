import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/auth/test-github - GitHub OAuth 测试端点
 */
export async function GET(request: NextRequest) {
  try {
    // 检查 GitHub OAuth 配置
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    const isConfigured = !!(githubClientId && githubClientSecret);

    return NextResponse.json({
      configured: isConfigured,
      clientId: githubClientId ? `${githubClientId.slice(0, 4)}...` : null,
      timestamp: new Date().toISOString(),
      message: isConfigured 
        ? 'GitHub OAuth 配置正常' 
        : 'GitHub OAuth 未配置，请设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET 环境变量',
    });
  } catch (error) {
    console.error('GitHub OAuth test error:', error);
    return NextResponse.json(
      { 
        error: '测试失败',
        configured: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}