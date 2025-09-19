/**
 * 数据库连接池管理器
 * 提供高效的连接复用和管理
 */

interface PoolConnection {
  id: string;
  client: any;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  usageCount: number;
}

interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  maxIdleTime: number; // 毫秒
  connectionTimeout: number; // 毫秒
  retryAttempts: number;
  retryDelay: number; // 毫秒
}

class DatabaseConnectionPool {
  private connections: Map<string, PoolConnection> = new Map();
  private config: PoolConfig;
  private isInitialized = false;
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
  };

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      maxIdleTime: 300000, // 5 分钟
      connectionTimeout: 10000, // 10 秒
      retryAttempts: 3,
      retryDelay: 1000, // 1 秒
      ...config,
    };
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔄 Initializing database connection pool...');
    
    try {
      // 创建最小连接数
      for (let i = 0; i < this.config.minConnections; i++) {
        await this.createConnection();
      }
      
      // 启动清理任务
      this.startCleanupTask();
      
      this.isInitialized = true;
      console.log(`✅ Connection pool initialized with ${this.connections.size} connections`);
    } catch (error) {
      console.error('❌ Failed to initialize connection pool:', error);
      throw error;
    }
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<any> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 查找可用连接
      let connection = this.findAvailableConnection();
      
      if (!connection) {
        // 如果没有可用连接且未达到最大连接数，创建新连接
        if (this.connections.size < this.config.maxConnections) {
          connection = await this.createConnection();
        } else {
          // 等待连接可用
          connection = await this.waitForConnection();
        }
      }

      if (!connection) {
        throw new Error('No database connection available');
      }

      // 更新连接状态
      connection.isActive = true;
      connection.lastUsed = new Date();
      connection.usageCount++;
      this.stats.activeConnections++;

      // 更新响应时间统计
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      return connection.client;
    } catch (error) {
      this.stats.failedRequests++;
      console.error('Failed to get database connection:', error);
      throw error;
    }
  }

  /**
   * 释放连接
   */
  releaseConnection(client: any): void {
    for (const [id, connection] of this.connections) {
      if (connection.client === client) {
        connection.isActive = false;
        connection.lastUsed = new Date();
        this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
        break;
      }
    }
  }

  /**
   * 创建新连接
   */
  private async createConnection(): Promise<PoolConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // 简化的客户端创建逻辑，避免循环依赖
      const { createClient } = await import('@libsql/client');
      const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:./dev.db';
      const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
      
      const clientConfig: any = { url: databaseUrl };
      if (authToken && !databaseUrl.startsWith('file:')) {
        clientConfig.authToken = authToken;
      }
      
      const client = await this.retryOperation(async () => createClient(clientConfig));
      
      const connection: PoolConnection = {
        id: connectionId,
        client,
        isActive: false,
        lastUsed: new Date(),
        createdAt: new Date(),
        usageCount: 0,
      };

      this.connections.set(connectionId, connection);
      this.stats.totalConnections++;
      
      console.log(`✅ Created new database connection: ${connectionId}`);
      return connection;
    } catch (error) {
      console.error(`❌ Failed to create connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * 查找可用连接
   */
  private findAvailableConnection(): PoolConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.isActive) {
        return connection;
      }
    }
    return null;
  }

  /**
   * 等待连接可用
   */
  private async waitForConnection(): Promise<PoolConnection | null> {
    const timeout = this.config.connectionTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const connection = this.findAvailableConnection();
      if (connection) {
        return connection;
      }
      
      // 等待 100ms 后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  }

  /**
   * 重试操作
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          console.warn(`Retry attempt ${attempt}/${this.config.retryAttempts} failed:`, error);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理空闲连接
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [id, connection] of this.connections) {
      const idleTime = now - connection.lastUsed.getTime();
      
      if (!connection.isActive && 
          idleTime > this.config.maxIdleTime && 
          this.connections.size > this.config.minConnections) {
        connectionsToRemove.push(id);
      }
    }

    for (const id of connectionsToRemove) {
      const connection = this.connections.get(id);
      if (connection) {
        try {
          // 尝试关闭连接
          if (connection.client && typeof connection.client.close === 'function') {
            connection.client.close();
          }
        } catch (error) {
          console.warn(`Failed to close connection ${id}:`, error);
        }
        
        this.connections.delete(id);
        this.stats.totalConnections--;
        console.log(`🧹 Cleaned up idle connection: ${id}`);
      }
    }
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(responseTime: number): void {
    const alpha = 0.1; // 指数移动平均的平滑因子
    this.stats.averageResponseTime = 
      this.stats.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  /**
   * 获取连接池统计信息
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.connections.size,
      config: this.config,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        isActive: conn.isActive,
        lastUsed: conn.lastUsed,
        createdAt: conn.createdAt,
        usageCount: conn.usageCount,
      })),
    };
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    console.log('🔄 Closing database connection pool...');
    
    const closePromises = Array.from(this.connections.values()).map(async (connection) => {
      try {
        if (connection.client && typeof connection.client.close === 'function') {
          await connection.client.close();
        }
      } catch (error) {
        console.warn(`Failed to close connection ${connection.id}:`, error);
      }
    });

    await Promise.allSettled(closePromises);
    
    this.connections.clear();
    this.stats.totalConnections = 0;
    this.stats.activeConnections = 0;
    this.isInitialized = false;
    
    console.log('✅ Connection pool closed');
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const stats = this.getStats();
      const failureRate = stats.totalRequests > 0 ? 
        (stats.failedRequests / stats.totalRequests) * 100 : 0;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (failureRate > 50) {
        status = 'unhealthy';
      } else if (failureRate > 10 || stats.averageResponseTime > 5000) {
        status = 'degraded';
      }
      
      return {
        status,
        details: {
          ...stats,
          failureRate: `${failureRate.toFixed(2)}%`,
          averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }
}

// 全局连接池实例
let globalConnectionPool: DatabaseConnectionPool | null = null;

/**
 * 获取全局连接池实例
 */
export function getConnectionPool(): DatabaseConnectionPool {
  if (!globalConnectionPool) {
    globalConnectionPool = new DatabaseConnectionPool({
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
      maxIdleTime: parseInt(process.env.DB_MAX_IDLE_TIME || '300000'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    });
  }
  return globalConnectionPool;
}

/**
 * 使用连接池执行数据库操作
 */
export async function withPooledConnection<T>(
  operation: (client: any) => Promise<T>
): Promise<T> {
  const pool = getConnectionPool();
  const client = await pool.getConnection();
  
  try {
    return await operation(client);
  } finally {
    pool.releaseConnection(client);
  }
}

export { DatabaseConnectionPool };
export type { PoolConnection, PoolConfig };