/**
 * 数据库连接测试工具
 * 用于验证数据库配置和连接状态
 */

import { db, checkDatabaseHealth, checkMigrationStatus } from './index';
import { users } from './schema';

/**
 * 测试数据库连接
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  details: any;
  errors: string[];
}> {
  const errors: string[] = [];
  let success = true;

  console.log('🔍 Testing database connection...');

  try {
    // 1. 检查数据库健康状态
    console.log('📊 Checking database health...');
    const healthCheck = await checkDatabaseHealth();
    console.log('Health status:', healthCheck.status);
    
    if (healthCheck.status === 'unhealthy') {
      success = false;
      errors.push(`Database health check failed: ${JSON.stringify(healthCheck.details)}`);
    }

    // 2. 检查迁移状态
    console.log('🔄 Checking migration status...');
    const migrationStatus = await checkMigrationStatus();
    console.log('Migration status:', migrationStatus.status);
    
    if (!migrationStatus.isReady) {
      errors.push(`Database migrations not ready: ${migrationStatus.error || 'Unknown error'}`);
    }

    // 3. 测试基本查询
    console.log('📝 Testing basic query...');
    try {
      // 尝试查询用户表（如果存在）
      const userCount = await db.select().from(users).limit(1);
      console.log('✅ Basic query successful');
    } catch (queryError) {
      const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown query error';
      console.warn('⚠️ Basic query failed (this might be expected if tables don\'t exist yet):', errorMessage);
      // 不将查询失败标记为致命错误，因为表可能还不存在
    }

    // 4. 测试连接池
    console.log('🏊 Testing connection pool...');
    const { getConnectionPool } = await import('./connection-pool');
    const pool = getConnectionPool();
    const poolHealth = await pool.healthCheck();
    console.log('Connection pool status:', poolHealth.status);
    
    if (poolHealth.status === 'unhealthy') {
      success = false;
      errors.push(`Connection pool unhealthy: ${JSON.stringify(poolHealth.details)}`);
    }

    return {
      success: success && errors.length === 0,
      details: {
        health: healthCheck,
        migration: migrationStatus,
        connectionPool: poolHealth,
        timestamp: new Date().toISOString(),
      },
      errors,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection test failed:', error);
    
    return {
      success: false,
      details: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      errors: [errorMessage],
    };
  }
}

/**
 * 运行完整的数据库诊断
 */
export async function runDatabaseDiagnostics(): Promise<void> {
  console.log('\n🔧 Running Database Diagnostics\n' + '='.repeat(50));
  
  try {
    const result = await testDatabaseConnection();
    
    if (result.success) {
      console.log('\n✅ Database diagnostics completed successfully!');
      console.log('📊 Details:', JSON.stringify(result.details, null, 2));
    } else {
      console.log('\n❌ Database diagnostics found issues:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      console.log('\n📊 Details:', JSON.stringify(result.details, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 Database diagnostics crashed:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

// 如果直接运行此文件，执行诊断
if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseDiagnostics().catch(console.error);
}