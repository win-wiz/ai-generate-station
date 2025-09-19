#!/usr/bin/env tsx

/**
 * 数据库测试脚本
 * 用于验证数据库配置和连接
 */

import { testDatabaseConnection, runDatabaseDiagnostics } from '../src/server/db/test-connection';

async function main() {
  console.log('🚀 Starting database test...\n');
  
  try {
    await runDatabaseDiagnostics();
    
    console.log('\n🎯 Running connection test...');
    const result = await testDatabaseConnection();
    
    if (result.success) {
      console.log('✅ All database tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some database tests failed.');
      console.log('Errors:', result.errors);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Database test script failed:', error);
    process.exit(1);
  }
}

main();