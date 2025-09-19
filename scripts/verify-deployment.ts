#!/usr/bin/env node

/**
 * 简化的 Cloudflare Pages 部署验证脚本
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 验证 Cloudflare Pages 部署配置...\n');

let allPassed = true;

// 1. 检查必需文件
const requiredFiles = [
  'wrangler.toml',
  'next.config.js', 
  'package.json',
  '.env'
];

console.log('📁 检查必需文件...');
for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allPassed = false;
  }
}

// 2. 检查 wrangler.toml 配置
console.log('\n⚙️  检查 wrangler.toml 配置...');
try {
  const wranglerContent = readFileSync('wrangler.toml', 'utf-8');
  
  // 检查是否只使用支持的环境
  if (wranglerContent.includes('[env.development')) {
    console.log('❌ 使用了不支持的 development 环境');
    console.log('   💡 Cloudflare Pages 只支持 preview 和 production 环境');
    allPassed = false;
  } else {
    console.log('✅ 环境配置正确 (只使用 preview 和 production)');
  }
  
  // 检查必需配置
  if (wranglerContent.includes('pages_build_output_dir')) {
    console.log('✅ 构建输出目录已配置');
  } else {
    console.log('❌ 缺少构建输出目录配置');
    allPassed = false;
  }
  
} catch (error) {
  console.log('❌ 无法读取 wrangler.toml');
  allPassed = false;
}

// 3. 检查 package.json 脚本
console.log('\n📦 检查 package.json 脚本...');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = ['build:cf', 'pages:build', 'pages:deploy'];
  for (const script of requiredScripts) {
    if (scripts[script]) {
      console.log(`✅ ${script} 脚本已配置`);
    } else {
      console.log(`❌ 缺少 ${script} 脚本`);
      allPassed = false;
    }
  }
} catch (error) {
  console.log('❌ 无法读取 package.json');
  allPassed = false;
}

// 4. 检查 Next.js 配置
console.log('\n⚛️  检查 Next.js 配置...');
try {
  const nextConfigExists = existsSync('next.config.js');
  if (nextConfigExists) {
    console.log('✅ Next.js 配置文件存在');
  } else {
    console.log('❌ Next.js 配置文件不存在');
    allPassed = false;
  }
} catch (error) {
  console.log('❌ 无法检查 Next.js 配置');
  allPassed = false;
}

// 5. 检查环境变量
console.log('\n🔐 检查环境变量...');
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} 已设置`);
  } else {
    console.log(`⚠️  ${envVar} 未设置 (可能在部署时配置)`);
  }
}

// 总结
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 所有验证通过！项目已准备好部署到 Cloudflare Pages。');
  console.log('\n📋 下一步：');
  console.log('  1. 运行: pnpm build:cf');
  console.log('  2. 运行: pnpm pages:build');
  console.log('  3. 运行: pnpm pages:deploy');
  process.exit(0);
} else {
  console.log('⚠️  部分验证失败。请修复上述问题后再次尝试部署。');
  process.exit(1);
}