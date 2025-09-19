/**
 * 生产环境安全检查和数据库策略
 * 确保在生产环境中不会意外使用 Mock 数据库
 */

/**
 * 生产环境数据库安全检查
 */
export class ProductionDatabaseSafety {
  /**
   * 检查当前环境是否允许使用 Mock 数据库
   */
  static validateMockDatabaseUsage(): {
    allowed: boolean;
    reason: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  } {
    const environment = process.env.NODE_ENV;
    const isProduction = environment === 'production';
    const strictMode = process.env.STRICT_PRODUCTION_MODE === 'true';
    const emergencyMode = process.env.EMERGENCY_MOCK_ALLOWED === 'true';
    
    // 生产环境检查
    if (isProduction) {
      if (strictMode && !emergencyMode) {
        return {
          allowed: false,
          reason: 'Mock database is strictly prohibited in production environment',
          severity: 'critical'
        };
      }
      
      if (emergencyMode) {
        return {
          allowed: true,
          reason: 'Emergency mode: Mock database allowed but will cause data loss',
          severity: 'critical'
        };
      }
      
      return {
        allowed: true,
        reason: 'Production environment detected but no strict mode - DANGEROUS!',
        severity: 'critical'
      };
    }
    
    // 测试环境
    if (environment === 'test') {
      return {
        allowed: true,
        reason: 'Test environment: Mock database is appropriate',
        severity: 'info'
      };
    }
    
    // 开发环境
    return {
      allowed: true,
      reason: 'Development environment: Mock database is acceptable',
      severity: 'warning'
    };
  }
  
  /**
   * 记录数据库使用情况
   */
  static logDatabaseUsage(databaseType: 'real' | 'mock' | 'hybrid', details: string): void {
    const timestamp = new Date().toISOString();
    const environment = process.env.NODE_ENV;
    
    // 生成兼容 Edge Runtime 的进程ID
    const getProcessId = () => {
      if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
        // Edge Runtime 环境，使用随机ID
        return `edge-${Math.floor(Math.random() * 10000)}`;
      }
      if (typeof process !== 'undefined' && process.pid) {
        // Node.js 环境，使用真实进程ID
        return process.pid;
      }
      // 其他环境，使用随机ID
      return Math.floor(Math.random() * 10000);
    };
    
    const logEntry = {
      timestamp,
      environment,
      databaseType,
      details,
      processId: getProcessId(),
      runtime: typeof (globalThis as any).EdgeRuntime !== 'undefined' ? 'edge' : 'nodejs'
    };
    
    if (databaseType === 'mock' && environment === 'production') {
      console.error('🚨 PRODUCTION MOCK DATABASE USAGE:', JSON.stringify(logEntry, null, 2));
    } else if (databaseType === 'mock') {
      console.warn('⚠️ Mock database usage:', JSON.stringify(logEntry, null, 2));
    } else {
      console.log('✅ Database usage:', JSON.stringify(logEntry, null, 2));
    }
  }
  
  /**
   * 创建数据库使用报告
   */
  static createUsageReport(): {
    environment: string;
    databaseType: string;
    risks: string[];
    recommendations: string[];
    timestamp: string;
  } {
    const environment = process.env.NODE_ENV || 'unknown';
    const validation = this.validateMockDatabaseUsage();
    
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    if (validation.severity === 'critical') {
      risks.push('Data loss risk: All data will be lost on process restart');
      risks.push('Data inconsistency: Multiple instances will have different data');
      risks.push('Authentication failures: Users cannot login after registration');
      
      recommendations.push('Immediately configure a real database (D1, LibSQL, PostgreSQL)');
      recommendations.push('Set STRICT_PRODUCTION_MODE=true to prevent mock database usage');
      recommendations.push('Implement proper database migration and backup strategies');
    }
    
    if (validation.severity === 'warning') {
      risks.push('Development data will not persist');
      recommendations.push('Consider using a local SQLite file for development persistence');
    }
    
    return {
      environment,
      databaseType: validation.allowed ? 'mock' : 'real',
      risks,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 数据库连接策略枚举
 */
export enum DatabaseStrategy {
  REAL_ONLY = 'real_only',           // 仅使用真实数据库
  MOCK_ALLOWED = 'mock_allowed',     // 允许使用 Mock 数据库
  HYBRID = 'hybrid',                 // 混合策略（缓存 + 远程）
  EMERGENCY_MOCK = 'emergency_mock'  // 紧急情况下的 Mock 数据库
}

/**
 * 获取当前环境的数据库策略
 */
export function getDatabaseStrategy(): DatabaseStrategy {
  const environment = process.env.NODE_ENV;
  const strictMode = process.env.STRICT_PRODUCTION_MODE === 'true';
  const emergencyMode = process.env.EMERGENCY_MOCK_ALLOWED === 'true';
  
  if (environment === 'production') {
    if (strictMode && !emergencyMode) {
      return DatabaseStrategy.REAL_ONLY;
    }
    if (emergencyMode) {
      return DatabaseStrategy.EMERGENCY_MOCK;
    }
    return DatabaseStrategy.HYBRID;
  }
  
  if (environment === 'test') {
    return DatabaseStrategy.MOCK_ALLOWED;
  }
  
  // 开发环境
  return DatabaseStrategy.MOCK_ALLOWED;
}

/**
 * 数据库健康监控
 */
export class DatabaseHealthMonitor {
  private static usageStats = {
    mockUsageCount: 0,
    realUsageCount: 0,
    errorCount: 0,
    lastUsage: null as string | null
  };
  
  /**
   * 记录数据库使用
   */
  static recordUsage(type: 'mock' | 'real' | 'error'): void {
    this.usageStats.lastUsage = new Date().toISOString();
    
    switch (type) {
      case 'mock':
        this.usageStats.mockUsageCount++;
        break;
      case 'real':
        this.usageStats.realUsageCount++;
        break;
      case 'error':
        this.usageStats.errorCount++;
        break;
    }
  }
  
  /**
   * 获取使用统计
   */
  static getStats() {
    return { ...this.usageStats };
  }
  
  /**
   * 重置统计
   */
  static resetStats(): void {
    this.usageStats = {
      mockUsageCount: 0,
      realUsageCount: 0,
      errorCount: 0,
      lastUsage: null
    };
  }
}