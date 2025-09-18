#!/usr/bin/env node

/**
 * 安全功能测试脚本
 * 测试速率限制、CSRF保护、JWT认证等功能
 */

const BASE_URL = 'http://localhost:3000';

async function testRateLimit() {
  console.log('🔒 测试速率限制功能...');
  
  const promises = [];
  // 发送10个并发请求来测试速率限制
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/auth/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test${i}@example.com`,
          password: 'wrongpassword',
          action: 'login'
        })
      })
    );
  }
  
  try {
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status);
    const rateLimitedCount = statusCodes.filter(code => code === 429).length;
    
    console.log(`   状态码分布: ${statusCodes.join(', ')}`);
    console.log(`   被限制的请求数: ${rateLimitedCount}`);
    
    if (rateLimitedCount > 0) {
      console.log('   ✅ 速率限制功能正常工作');
    } else {
      console.log('   ⚠️  速率限制可能未生效');
    }
  } catch (error) {
    console.log(`   ❌ 速率限制测试失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testCSRF() {
  console.log('🛡️  测试CSRF保护功能...');
  
  try {
    // 获取CSRF令牌
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf`);
    const csrfData = await csrfResponse.json();
    
    if (csrfResponse.ok && csrfData.csrfToken) {
      console.log('   ✅ CSRF令牌生成成功');
      
      // 提取Cookie
      const cookies = csrfResponse.headers.get('set-cookie');
      
      // 测试CSRF令牌验证
      const verifyResponse = await fetch(`${BASE_URL}/api/csrf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies || '',
        },
        body: JSON.stringify({
          csrfToken: csrfData.csrfToken
        })
      });
      
      if (verifyResponse.ok) {
        console.log('   ✅ CSRF令牌验证成功');
      } else {
        const errorData = await verifyResponse.json();
        console.log(`   ❌ CSRF令牌验证失败: ${errorData.error || '未知错误'}`);
      }
    } else {
      console.log('   ❌ CSRF令牌生成失败');
    }
  } catch (error) {
    console.log(`   ❌ CSRF测试失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testSecurityHeaders() {
  console.log('🔐 测试安全头配置...');
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    const headers = response.headers;
    
    const securityHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-XSS-Protection',
      'Content-Security-Policy'
    ];
    
    console.log('   安全头检查:');
    securityHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        console.log(`   ✅ ${header}: ${value}`);
      } else {
        console.log(`   ❌ ${header}: 未设置`);
      }
    });
  } catch (error) {
    console.log(`   ❌ 安全头测试失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testPasswordSecurity() {
  console.log('🔑 测试密码安全功能...');
  
  try {
    // 测试弱密码注册
    const weakPasswordResponse = await fetch(`${BASE_URL}/api/auth/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123',
        action: 'register',
        name: 'Test User'
      })
    });
    
    const weakPasswordData = await weakPasswordResponse.json();
    
    if (weakPasswordResponse.status === 400 && weakPasswordData.error.includes('密码强度')) {
      console.log('   ✅ 弱密码检测正常工作');
    } else {
      console.log('   ⚠️  弱密码检测可能未生效');
    }
    
    // 测试强密码注册
    const strongPasswordResponse = await fetch(`${BASE_URL}/api/auth/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'StrongPassword123!',
        action: 'register',
        name: 'Test User'
      })
    });
    
    if (strongPasswordResponse.ok) {
      console.log('   ✅ 强密码注册成功');
    } else {
      const errorData = await strongPasswordResponse.json();
      console.log(`   ⚠️  强密码注册失败: ${errorData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ 密码安全测试失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runAllTests() {
  console.log('🚀 开始安全功能测试...\n');
  
  await testSecurityHeaders();
  console.log('');
  
  await testCSRF();
  console.log('');
  
  await testPasswordSecurity();
  console.log('');
  
  await testRateLimit();
  console.log('');
  
  console.log('✨ 安全功能测试完成！');
}

// 运行测试
runAllTests().catch(console.error);