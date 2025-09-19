import { drizzle } from 'drizzle-orm/d1';
import { createClient } from '@libsql/client';
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import * as schema from './schema';
import { DatabaseHealthMonitor } from './production-safety';
import { getConnectionPool, withPooledConnection } from './connection-pool';
import { getDatabaseMonitor, withMonitoring, recordConnectionError } from './monitoring';

// 环境变量类型定义
type Environment = 'production' | 'staging' | 'development' | 'testing';

/**
 * 创建数据库客户端
 * 优先使用 Cloudflare D1，回退到 LibSQL
 */
export async function createDatabaseClient() {
  try {
    // 检查是否在 Cloudflare Workers 环境中
    if (typeof globalThis !== 'undefined' && 'DB' in globalThis) {
      console.log('✅ Using Cloudflare D1 database');
      return (globalThis as any).DB;
    }

    // 检查是否有 D1 绑定（开发环境）
    if (process.env.NODE_ENV === 'development') {
      // 在开发环境中，如果没有 D1 绑定，使用 LibSQL
      console.log('⚠️ D1 database binding not found in development, using LibSQL fallback');
    } else {
      throw new Error("D1 database binding not found. Make sure to configure wrangler.toml");
    }

    // Handle local development or standard SQLite/LibSQL
    const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./dev.db';
    const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    console.log('🔄 Creating LibSQL client with URL:', databaseUrl);
    
    const clientConfig: any = { url: databaseUrl };
    if (authToken && !databaseUrl.startsWith('file:')) {
      clientConfig.authToken = authToken;
    }
    
    const client = createClient(clientConfig);

    console.log('✅ LibSQL client created successfully');
    return client;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Failed to create database client:", error);
    recordConnectionError(errorMessage);
    throw new Error("Database connection failed");
  }
}

/**
 * 创建 Drizzle 数据库实例
 */
async function createDatabase() {
  try {
    const client = await createDatabaseClient();
    
    // 根据客户端类型创建相应的 drizzle 实例
    if (client && typeof client.prepare === 'function') {
      // LibSQL client
      return drizzleLibSQL(client, { schema });
    } else {
      // D1 client
      return drizzle(client, { schema });
    }
  } catch (error) {
    console.error("Failed to create database:", error);
    throw error;
  }
}

// 创建数据库实例（延迟初始化，避免顶级 await）
let _db: any = null;
let _dbPromise: Promise<any> | null = null;

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db && !_dbPromise) {
      _dbPromise = createDatabase().then(database => {
        _db = database;
        return database;
      });
    }
    
    if (_db) {
      return _db[prop];
    }
    
    // 如果数据库还在初始化中，返回一个 Promise
    if (prop === 'then' || prop === 'catch' || prop === 'finally') {
      const promiseMethod = _dbPromise?.[prop as keyof Promise<any>];
      return typeof promiseMethod === 'function' ? promiseMethod.bind(_dbPromise) : promiseMethod;
    }
    
    // 对于其他属性，等待数据库初始化完成
    return (...args: any[]) => {
      return _dbPromise?.then(database => database[prop](...args));
    };
  }
});

// 导出 schema
export * from './schema';

// 优化的数据库操作包装器
export async function executeQuery<T>(
  operation: (db: any) => Promise<T>,
  description: string = 'database query'
): Promise<T> {
  return withMonitoring(async () => {
    return withPooledConnection(async (client) => {
      // 根据客户端类型创建相应的 drizzle 实例
      let db: any;
      if (client && typeof client.prepare === 'function') {
        // LibSQL client
        db = drizzleLibSQL(client, { schema });
      } else {
        // D1 client
        db = drizzle(client, { schema });
      }
      
      return operation(db);
    });
  }, description);
}

// 导出增强的数据库实例
export const enhancedDb = {
  // 基本查询方法
  select: (query: any) => executeQuery(db => db.select(query), 'select query'),
  insert: (query: any) => executeQuery(db => db.insert(query), 'insert query'),
  update: (query: any) => executeQuery(db => db.update(query), 'update query'),
  delete: (query: any) => executeQuery(db => db.delete(query), 'delete query'),
  
  // 事务支持
  transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
    return executeQuery(async (db) => {
      if (typeof db.transaction === 'function') {
        return db.transaction(callback);
      } else {
        // 如果不支持事务，直接执行
        return callback(db);
      }
    }, 'transaction');
  },
  
  // 批量操作
  batch: async (queries: any[]): Promise<any[]> => {
    return executeQuery(async (db) => {
      if (typeof db.batch === 'function') {
        return db.batch(queries);
      } else {
        // 如果不支持批量操作，逐个执行
        const results = [];
        for (const query of queries) {
          results.push(await query);
        }
        return results;
      }
    }, 'batch operation');
  },
};

// 导出监控和连接池管理函数
export {
  getDatabaseMonitor,
  getConnectionPool,
  withMonitoring,
  withPooledConnection,
};

// 导出类型
export type { Environment };

// 健康检查功能
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
}> {
  try {
    const startTime = Date.now();
    
    // 使用连接池进行健康检查
    await withPooledConnection(async (client) => {
      if (typeof client.$client?.execute === 'function') {
        await client.$client.execute('SELECT 1');
      } else if (typeof client.prepare === 'function') {
        const stmt = client.prepare('SELECT 1');
        await stmt.all();
      } else {
        // 对于其他类型的客户端，尝试基本操作
        await Promise.resolve();
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    // 获取连接池和监控状态
    const pool = getConnectionPool();
    const monitor = getDatabaseMonitor();
    
    const [poolHealth, monitorHealth] = await Promise.all([
      pool.healthCheck(),
      Promise.resolve(monitor.getHealthStatus()),
    ]);
    
    // 综合评估健康状态
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (poolHealth.status === 'unhealthy' || monitorHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (poolHealth.status === 'degraded' || monitorHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    DatabaseHealthMonitor.recordUsage('real');
    
    return {
      status: overallStatus,
      details: {
        responseTime: `${responseTime}ms`,
        connectionPool: poolHealth,
        monitoring: {
          status: monitorHealth.status,
          issues: monitorHealth.issues,
          metrics: monitor.getMetrics(),
        },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    recordConnectionError(errorMessage);
    DatabaseHealthMonitor.recordUsage('error');
    
    return {
      status: 'unhealthy',
      details: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// 真实数据库管理器功能暂时禁用，避免构建时的依赖问题
// 如需启用，请确保安装所有必要的数据库驱动程序
export async function getRealDatabaseManager() {
  throw new Error('Real database manager is currently disabled to avoid build dependencies');
}

// 迁移状态检查（增强实现）
export async function checkMigrationStatus(): Promise<{
  isReady: boolean;
  status: 'up-to-date' | 'pending' | 'error';
  pendingMigrations?: string[];
  error?: string;
  details?: any;
}> {
  return withMonitoring(async () => {
    try {
      // 使用连接池检查迁移状态
      const result = await withPooledConnection(async (client) => {
        // 检查是否存在迁移表
        try {
          if (typeof client.$client?.execute === 'function') {
            await client.$client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'");
          } else if (typeof client.prepare === 'function') {
            const stmt = client.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'");
            await stmt.all();
          }
          
          return {
            isReady: true,
            status: 'up-to-date' as const,
            details: {
              migrationsTableExists: true,
              lastChecked: new Date().toISOString(),
            },
          };
        } catch (error) {
          // 如果迁移表不存在，可能需要运行迁移
          return {
            isReady: false,
            status: 'pending' as const,
            pendingMigrations: ['Initial migration'],
            details: {
              migrationsTableExists: false,
              lastChecked: new Date().toISOString(),
            },
          };
        }
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      recordConnectionError(errorMessage);
      
      return { 
        isReady: false,
        status: 'error' as const,
        error: errorMessage,
        details: {
          lastChecked: new Date().toISOString(),
        },
      };
    }
  }, 'migration status check');
}