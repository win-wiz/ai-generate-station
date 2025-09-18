import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试 GitHub API 连接的端点
 * 用于诊断网络连接问题
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing GitHub API connection...');
    
    // 测试 GitHub API 连接
    const response = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'User-Agent': 'ai-generate-station',
        'Accept': 'application/vnd.github.v3+json',
      },
      // 增加超时时间
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    
    console.log('GitHub API response status:', response.status);
    
    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'GitHub API connection successful',
        status: response.status 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'GitHub API connection failed',
        status: response.status 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('GitHub API connection error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Network connection failed',
      error: error.message,
      code: error.code 
    }, { status: 500 });
  }
}