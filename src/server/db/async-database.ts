/**
 * 异步数据库初始化器
 * 解决 Next.js 中数据库连接的异步初始化问题
 */

// 动态导入类型定义，避免构建时的依赖问题
type Environment = 'production' | 'staging' | 'development' | 'testing';
type User = {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'readonly';
  permissions: string[];
  environment: Environment;
};
type DatabaseOperation = {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER';
  table?: string;
  query?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
};
type DatabaseConnection = {
  id: string;
  environment: Environment;
  type: 'cloudflare-d1' | 'libsql' | 'postgresql';
  client: any;
  config: any;
  createdAt: Date;
  lastUsed: Date;
  isHealthy: boolean;
};

import { DatabaseHealthMonitor } from './production-safety';

// 全局数据库连接缓存
let globalDatabaseConnection: DatabaseConnection | null = null;
let initializationPromise: Promise<any> | null = null;

/**
 * 异步初始化数据库连接
 */
export async function getAsyncDatabase(
  environment: Environment = 'development',
  user?: User,
  operation?: DatabaseOperation
): Promise<any> {
  // 如果已经有连接，直接返回
  if (globalDatabaseConnection && globalDatabaseConnection.isHealthy) {
    globalDatabaseConnection.lastUsed = new Date();
    return globalDatabaseConnection.client;
  }

  // 如果正在初始化，等待完成
  if (initializationPromise) {
    return await initializationPromise;
  }

  // 开始初始化
  initializationPromise = initializeDatabase(environment, user, operation);
  
  try {
    const client = await initializationPromise;
    initializationPromise = null;
    return client;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

/**
 * 内部初始化函数
 */
async function initializeDatabase(
  environment: Environment,
  user?: User,
  operation?: DatabaseOperation
): Promise<any> {
  console.log(`🔄 Initializing async database for ${environment} environment...`);

  try {
    // 尝试动态导入真实数据库管理器
    try {
      const module = await import('./real-database-manager');
      const manager = module.RealDatabaseManager.getInstance();
      
      // 获取连接
      const connection = await manager.getConnection(environment, user, operation);
      
      // 缓存连接
      globalDatabaseConnection = connection;
      
      console.log(`✅ Async database initialized for ${environment} environment`);
      DatabaseHealthMonitor.recordUsage('real');
      
      return connection.client;
    } catch (realDbError) {
      console.warn('⚠️ Real database manager not available, falling back to legacy method:', realDbError);
      
      // 回退到传统数据库连接方法
      const { db } = await import('./index');
      
      // 创建模拟连接对象
      globalDatabaseConnection = {
        id: `fallback_${Date.now()}`,
        environment,
        type: 'libsql',
        client: db,
        config: {},
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true
      };
      
      console.log(`✅ Fallback database initialized for ${environment} environment`);
      DatabaseHealthMonitor.recordUsage('mock');
      
      return db;
    }
  } catch (error) {
    console.error('❌ Failed to initialize async database:', error);
    DatabaseHealthMonitor.recordUsage('error');
    throw new Error(`Async database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 初始化全局数据库连接
 */
export async function initializeGlobalDatabase(
  environment: Environment = 'development'
): Promise<void> {
  try {
    await getAsyncDatabase(environment);
    console.log('✅ Global database connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize global database connection:', error);
    throw error;
  }
}

/**
 * 获取全局数据库连接
 */
export function getGlobalDatabase(): any {
  if (!globalDatabaseConnection) {
    throw new Error('Database not initialized. Call initializeGlobalDatabase() first.');
  }
  
  if (!globalDatabaseConnection.isHealthy) {
    throw new Error('Database connection is not healthy. Reinitialize required.');
  }
  
  globalDatabaseConnection.lastUsed = new Date();
  return globalDatabaseConnection.client;
}

/**
 * 检查数据库连接状态
 */
export function getDatabaseConnectionStatus(): {
  isConnected: boolean;
  environment?: Environment;
  lastUsed?: Date;
  connectionId?: string;
} {
  if (!globalDatabaseConnection) {
    return { isConnected: false };
  }
  
  return {
    isConnected: globalDatabaseConnection.isHealthy,
    environment: globalDatabaseConnection.environment,
    lastUsed: globalDatabaseConnection.lastUsed,
    connectionId: globalDatabaseConnection.id
  };
}

/**
 * 关闭数据库连接
 */
export async function closeAsyncDatabase(): Promise<void> {
  if (globalDatabaseConnection) {
    try {
      // 尝试关闭底层连接
      const client = globalDatabaseConnection.client;
      if (client && typeof client.close === 'function') {
        await client.close();
      }
      
      globalDatabaseConnection = null;
      console.log('✅ Async database connection closed');
    } catch (error) {
      console.error('❌ Error closing async database connection:', error);
    }
  }
}

/**
 * 重置数据库连接
 */
export async function resetAsyncDatabase(
  environment: Environment = 'development'
): Promise<any> {
  await closeAsyncDatabase();
  return await getAsyncDatabase(environment);
}

// 导出类型
export type { Environment, User, DatabaseOperation, DatabaseConnection };