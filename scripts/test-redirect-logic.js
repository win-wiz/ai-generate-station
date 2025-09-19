#!/usr/bin/env node

/**
 * 重定向逻辑测试脚本
 * 用于验证修复后的重定向行为是否符合预期
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

// 测试用例定义
const testCases = [
  {
    name: '未登录用户访问首页',
    url: '/',
    expectedBehavior: 'stay',
    expectedUrl: '/',
    description: '应该停留在首页'
  },
  {
    name: '未登录用户访问仪表盘',
    url: '/dashboard',
    expectedBehavior: 'redirect',
    expectedUrl: '/',
    description: '应该重定向到首页'
  },
  {
    name: '未登录用户访问登录页',
    url: '/login',
    expectedBehavior: 'stay',
    expectedUrl: '/login',
    description: '应该停留在登录页'
  }
];

async function runTests() {
  console.log('🚀 开始测试重定向逻辑...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // 设置视口
    await page.setViewport({ width: 1280, height: 720 });
    
    // 监听控制台输出
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log(`📝 Console: ${msg.text()}`);
      }
    });
    
    // 监听网络请求
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method()
      });
    });
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
      console.log(`\n🧪 测试: ${testCase.name}`);
      console.log(`📍 访问: ${BASE_URL}${testCase.url}`);
      console.log(`🎯 预期: ${testCase.description}`);
      
      try {
        // 清除所有 cookies（确保未登录状态）
        await page.deleteCookie(...(await page.cookies()));
        
        // 访问目标URL
        const response = await page.goto(`${BASE_URL}${testCase.url}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        // 等待可能的重定向完成
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 获取最终URL
        const finalUrl = page.url();
        const expectedFullUrl = `${BASE_URL}${testCase.expectedUrl}`;
        
        console.log(`📊 最终URL: ${finalUrl}`);
        console.log(`🎯 预期URL: ${expectedFullUrl}`);
        
        // 验证结果
        if (finalUrl === expectedFullUrl) {
          console.log(`✅ 测试通过: ${testCase.name}`);
          passedTests++;
        } else {
          console.log(`❌ 测试失败: ${testCase.name}`);
          console.log(`   预期: ${expectedFullUrl}`);
          console.log(`   实际: ${finalUrl}`);
        }
        
        // 检查页面是否有错误
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[data-error], .error, .alert-error');
          return Array.from(errorElements).map(el => el.textContent);
        });
        
        if (errors.length > 0) {
          console.log(`⚠️  页面错误: ${errors.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`❌ 测试异常: ${testCase.name}`);
        console.log(`   错误: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      console.log('─'.repeat(50));
    }
    
    // 输出测试结果摘要
    console.log(`\n📊 测试结果摘要:`);
    console.log(`✅ 通过: ${passedTests}/${totalTests}`);
    console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log(`\n🎉 所有测试通过！重定向逻辑修复成功！`);
    } else {
      console.log(`\n⚠️  还有 ${totalTests - passedTests} 个测试失败，需要进一步修复。`);
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
  } finally {
    await browser.close();
  }
}

// 手动测试指南
function printManualTestGuide() {
  console.log(`
📋 手动测试指南

请按照以下步骤手动验证重定向逻辑：

1. 🏠 未登录用户测试
   - 打开浏览器无痕模式
   - 访问 ${BASE_URL}/ 
     ✅ 应该停留在首页，看到"立即开始"按钮
   - 访问 ${BASE_URL}/dashboard
     ✅ 应该自动重定向到首页
   - 访问 ${BASE_URL}/login
     ✅ 应该停留在登录页，看到登录表单

2. 👤 已登录用户测试
   - 在登录页完成登录
   - 访问 ${BASE_URL}/
     ✅ 应该自动重定向到仪表盘
   - 访问 ${BASE_URL}/dashboard
     ✅ 应该停留在仪表盘
   - 访问 ${BASE_URL}/login
     ✅ 应该自动重定向到仪表盘

3. 🔍 检查要点
   - 无控制台错误
   - 无页面闪烁
   - 重定向速度合理
   - URL 地址栏正确

4. 🐛 如果发现问题
   - 检查浏览器控制台错误
   - 查看网络请求是否正常
   - 确认会话状态是否正确
`);
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('选择测试方式:');
  console.log('1. 自动化测试 (需要 puppeteer)');
  console.log('2. 手动测试指南');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--manual') || args.includes('-m')) {
    printManualTestGuide();
  } else if (args.includes('--auto') || args.includes('-a')) {
    runTests().catch(console.error);
  } else {
    printManualTestGuide();
    console.log('\n💡 提示: 使用 --auto 运行自动化测试，--manual 显示手动测试指南');
  }
}

module.exports = { runTests, printManualTestGuide };