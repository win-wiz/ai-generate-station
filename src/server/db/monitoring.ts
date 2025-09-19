/**
 * 数据库监控和指标收集
 */

interface DatabaseMetrics {
  queryCount: number;
  errorCount: number;
  totalResponseTime: number;
  slowQueries: number;
  connectionErrors: number;
  lastError?: string;
  lastErrorTime?: Date;
}

interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

class DatabaseMonitor {
  private metrics: DatabaseMetrics = {
    queryCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    slowQueries: 0,
    connectionErrors: 0,
  };

  private recentQueries: QueryMetric[] = [];
  private readonly maxRecentQueries = 100;
  private readonly slowQueryThreshold = 1000; // 1秒

  /**
   * 记录查询指标
   */
  recordQuery(query: string, duration: number, success: boolean, error?: string): void {
    this.metrics.queryCount++;
    this.metrics.totalResponseTime += duration;

    if (!success) {
      this.metrics.errorCount++;
      this.metrics.lastError = error;
      this.metrics.lastErrorTime = new Date();
    }

    if (duration > this.slowQueryThreshold) {
      this.metrics.slowQueries++;
    }

    // 记录最近的查询
    const queryMetric: QueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      success,
      error,
    };

    this.recentQueries.push(queryMetric);
    
    // 保持最近查询数量在限制内
    if (this.recentQueries.length > this.maxRecentQueries) {
      this.recentQueries.shift();
    }
  }

  /**
   * 记录连接错误
   */
  recordConnectionError(error: string): void {
    this.metrics.connectionErrors++;
    this.metrics.lastError = error;
    this.metrics.lastErrorTime = new Date();
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const averageResponseTime = this.metrics.queryCount > 0 
      ? this.metrics.totalResponseTime / this.metrics.queryCount 
      : 0;

    const errorRate = this.metrics.queryCount > 0 
      ? (this.metrics.errorCount / this.metrics.queryCount) * 100 
      : 0;

    const slowQueryRate = this.metrics.queryCount > 0 
      ? (this.metrics.slowQueries / this.metrics.queryCount) * 100 
      : 0;

    return {
      ...this.metrics,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      slowQueryRate: Math.round(slowQueryRate * 100) / 100,
      recentQueries: this.recentQueries.slice(-10), // 最近10个查询
    };
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // 检查错误率
    if (metrics.errorRate > 50) {
      status = 'unhealthy';
      issues.push(`High error rate: ${metrics.errorRate}%`);
    } else if (metrics.errorRate > 10) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${metrics.errorRate}%`);
    }

    // 检查响应时间
    if (metrics.averageResponseTime > 5000) {
      status = 'unhealthy';
      issues.push(`Very slow response time: ${metrics.averageResponseTime}ms`);
    } else if (metrics.averageResponseTime > 2000) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Slow response time: ${metrics.averageResponseTime}ms`);
    }

    // 检查慢查询率
    if (metrics.slowQueryRate > 30) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`High slow query rate: ${metrics.slowQueryRate}%`);
    }

    // 检查连接错误
    if (metrics.connectionErrors > 5) {
      status = 'unhealthy';
      issues.push(`Multiple connection errors: ${metrics.connectionErrors}`);
    }

    return { status, issues };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      queryCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      slowQueries: 0,
      connectionErrors: 0,
    };
    this.recentQueries = [];
  }

  /**
   * 清理敏感信息的查询字符串
   */
  private sanitizeQuery(query: string): string {
    // 移除潜在的敏感数据
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .substring(0, 200); // 限制长度
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    return `
📊 Database Performance Report
=============================
Status: ${health.status.toUpperCase()}
${health.issues.length > 0 ? `Issues: ${health.issues.join(', ')}` : 'No issues detected'}

📈 Metrics:
- Total Queries: ${metrics.queryCount}
- Error Rate: ${metrics.errorRate}%
- Average Response Time: ${metrics.averageResponseTime}ms
- Slow Queries: ${metrics.slowQueries} (${metrics.slowQueryRate}%)
- Connection Errors: ${metrics.connectionErrors}

🕒 Recent Activity:
${metrics.recentQueries.slice(-5).map(q => 
  `- ${q.timestamp.toISOString()}: ${q.success ? '✅' : '❌'} ${q.duration}ms`
).join('\n')}
    `.trim();
  }
}

// 全局监控实例
let globalMonitor: DatabaseMonitor | null = null;

/**
 * 获取全局数据库监控实例
 */
export function getDatabaseMonitor(): DatabaseMonitor {
  if (!globalMonitor) {
    globalMonitor = new DatabaseMonitor();
  }
  return globalMonitor;
}

/**
 * 监控数据库操作的装饰器函数
 */
export function withMonitoring<T>(
  operation: () => Promise<T>,
  queryDescription: string = 'database operation'
): Promise<T> {
  const monitor = getDatabaseMonitor();
  const startTime = Date.now();

  return operation()
    .then(result => {
      const duration = Date.now() - startTime;
      monitor.recordQuery(queryDescription, duration, true);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      monitor.recordQuery(queryDescription, duration, false, errorMessage);
      throw error;
    });
}

/**
 * 记录连接错误
 */
export function recordConnectionError(error: string): void {
  const monitor = getDatabaseMonitor();
  monitor.recordConnectionError(error);
}

export { DatabaseMonitor };
export type { DatabaseMetrics, QueryMetric };