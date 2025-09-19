#!/usr/bin/env node

/**
 * Cloudflare Pages 部署脚本
 * 自动化部署流程，包括构建、验证和部署
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 开始 Cloudflare Pages 部署流程...\n');

try {
  // 1. 验证配置
  console.log('🔍 验证项目配置...');
  execSync('pnpm cf:verify', { stdio: 'inherit' });
  console.log('✅ 配置验证通过\n');

  // 2. 构建项目
  console.log('🔨 构建项目...');
  execSync('pnpm build:cf', { stdio: 'inherit' });
  console.log('✅ 项目构建完成\n');

  // 3. 生成 Cloudflare Pages 输出
  console.log('📦 生成 Cloudflare Pages 输出...');
  execSync('pnpm pages:build', { stdio: 'inherit' });
  console.log('✅ Pages 输出生成完成\n');

  // 4. 检查输出目录
  const outputDir = '.vercel/output/static';
  if (!fs.existsSync(outputDir)) {
    throw new Error(`输出目录不存在: ${outputDir}`);
  }
  console.log('✅ 输出目录验证通过\n');

  // 5. 部署到 Cloudflare Pages
  console.log('🌐 部署到 Cloudflare Pages...');
  execSync('wrangler pages deploy .vercel/output/static --project-name=ai-generate-station', { 
    stdio: 'inherit' 
  });
  console.log('✅ 部署完成！\n');

  console.log('🎉 Cloudflare Pages 部署成功！');
  console.log('📋 后续步骤：');
  console.log('   1. 在 Cloudflare Dashboard 中配置环境变量');
  console.log('   2. 绑定 D1 数据库');
  console.log('   3. 运行数据库迁移');
  console.log('   4. 测试部署的应用');

} catch (error: any) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
}