/**
 * 增强的 Edge Runtime 模拟数据库
 * 更接近真实数据库行为，包含约束检查和错误处理
 * 
 * ⚠️ 警告：此模拟数据库仅用于开发和测试环境
 * 🚨 严禁在生产环境使用！
 */

import * as schema from './schema';

// 内存存储 - 使用 Map 提供更好的性能
const memoryStore = new Map<string, Map<string, any>>();
const autoIncrementCounters = new Map<string, number>();

// 数据约束定义
interface TableConstraints {
  primaryKey: string;
  unique: string[];
  required: string[];
  autoIncrement?: string;
  timestamps: string[];
  foreignKeys: { field: string; references: { table: string; field: string } }[];
}

// 表约束配置
const tableConstraints: Record<string, TableConstraints> = {
  'ai-generate-station_user': {
    primaryKey: 'id',
    unique: ['email'],
    required: ['email'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: []
  },
  'ai-generate-station_account': {
    primaryKey: 'id',
    unique: [],
    required: ['userId', 'type', 'provider', 'providerAccountId'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: [
      { field: 'userId', references: { table: 'ai-generate-station_user', field: 'id' } }
    ]
  },
  'ai-generate-station_session': {
    primaryKey: 'id',
    unique: ['sessionToken'],
    required: ['sessionToken', 'userId'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: [
      { field: 'userId', references: { table: 'ai-generate-station_user', field: 'id' } }
    ]
  },
  'ai-generate-station_verification_token': {
    primaryKey: 'token',
    unique: ['token'],
    required: ['identifier', 'token', 'expires'],
    timestamps: ['created_at'],
    foreignKeys: []
  },
  'ai-generate-station_post': {
    primaryKey: 'id',
    unique: [],
    required: ['title', 'content', 'authorId'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: [
      { field: 'authorId', references: { table: 'ai-generate-station_user', field: 'id' } }
    ]
  },
  'ai-generate-station_task': {
    primaryKey: 'id',
    unique: [],
    required: ['title', 'userId'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: [
      { field: 'userId', references: { table: 'ai-generate-station_user', field: 'id' } }
    ]
  },
  'ai-generate-station_user_preference': {
    primaryKey: 'id',
    unique: ['userId'],
    required: ['userId'],
    autoIncrement: 'id',
    timestamps: ['created_at', 'updated_at'],
    foreignKeys: [
      { field: 'userId', references: { table: 'ai-generate-station_user', field: 'id' } }
    ]
  }
};

/**
 * 初始化表结构
 */
const initializeTables = () => {
  Object.keys(tableConstraints).forEach(tableName => {
    if (!memoryStore.has(tableName)) {
      memoryStore.set(tableName, new Map());
      autoIncrementCounters.set(tableName, 0);
    }
  });
  
  console.log('📋 Initialized mock database tables:', Object.keys(tableConstraints));
};

/**
 * 生成自增 ID
 */
const generateAutoIncrementId = (tableName: string): number => {
  const current = autoIncrementCounters.get(tableName) || 0;
  const newId = current + 1;
  autoIncrementCounters.set(tableName, newId);
  return newId;
};

/**
 * 验证数据约束
 */
const validateConstraints = (tableName: string, data: any, isUpdate: boolean = false): void => {
  const constraints = tableConstraints[tableName];
  if (!constraints) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  // 检查必填字段（插入时）
  if (!isUpdate) {
    for (const field of constraints.required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new Error(`Field '${field}' is required for table '${tableName}'`);
      }
    }
  }

  // 检查唯一约束
  const table = memoryStore.get(tableName)!;
  for (const field of constraints.unique) {
    if (data[field] !== undefined) {
      for (const [existingId, existingRecord] of table.entries()) {
        if (existingRecord[field] === data[field] && (!isUpdate || existingId !== data[constraints.primaryKey])) {
          throw new Error(`Duplicate value '${data[field]}' for unique field '${field}' in table '${tableName}'`);
        }
      }
    }
  }

  // 检查外键约束
  for (const fk of constraints.foreignKeys) {
    if (data[fk.field] !== undefined && data[fk.field] !== null) {
      const referencedTable = memoryStore.get(fk.references.table);
      if (referencedTable) {
        const referencedRecord = Array.from(referencedTable.values()).find(
          record => record[fk.references.field] === data[fk.field]
        );
        if (!referencedRecord) {
          throw new Error(`Foreign key constraint failed: ${fk.field} references ${fk.references.table}.${fk.references.field}`);
        }
      }
    }
  }
};

/**
 * 添加时间戳
 */
const addTimestamps = (tableName: string, data: any, isUpdate: boolean = false): any => {
  const constraints = tableConstraints[tableName];
  if (!constraints) return data;

  const now = new Date().toISOString();
  const result = { ...data };

  for (const field of constraints.timestamps) {
    if (field === 'created_at' && !isUpdate && !result[field]) {
      result[field] = now;
    }
    if (field === 'updated_at') {
      result[field] = now;
    }
  }

  return result;
};

/**
 * 增强的模拟数据库类
 */
class EnhancedMockDatabase {
  constructor() {
    initializeTables();
    
    // 在开发环境显示警告
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Using Enhanced Mock Database in development mode');
      console.warn('⚠️ Data will be lost when the process restarts');
    }
    
    // 在生产环境显示严重警告
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Enhanced Mock Database is running in PRODUCTION!');
      console.error('🚨 This will cause DATA LOSS and should be fixed immediately!');
    }
  }

  /**
   * 插入数据
   */
  async insert(tableName: string, data: any): Promise<any> {
    try {
      const constraints = tableConstraints[tableName];
      if (!constraints) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      // 验证约束
      validateConstraints(tableName, data);

      // 生成自增 ID
      if (constraints.autoIncrement && !data[constraints.autoIncrement]) {
        data[constraints.autoIncrement] = generateAutoIncrementId(tableName);
      }

      // 添加时间戳
      const recordWithTimestamps = addTimestamps(tableName, data);

      // 存储数据
      const table = memoryStore.get(tableName)!;
      const id = recordWithTimestamps[constraints.primaryKey];
      table.set(String(id), recordWithTimestamps);

      console.log(`📝 Mock DB INSERT: ${tableName}`, { id, data: recordWithTimestamps });
      return recordWithTimestamps;
    } catch (error) {
      console.error(`❌ Mock DB INSERT failed: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * 查询数据
   */
  async select(tableName: string, options: {
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  } = {}): Promise<any[]> {
    try {
      const table = memoryStore.get(tableName);
      if (!table) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      let results = Array.from(table.values());

      // 应用 WHERE 条件
      if (options.where) {
        results = results.filter(record => {
          return Object.entries(options.where!).every(([key, value]) => {
            if (value === null) return record[key] === null;
            if (value === undefined) return record[key] === undefined;
            return record[key] === value;
          });
        });
      }

      // 排序
      if (options.orderBy) {
        const { field, direction } = options.orderBy;
        results.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          let comparison = 0;
          
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;
          
          return direction === 'desc' ? -comparison : comparison;
        });
      }

      // 分页
      if (options.offset) {
        results = results.slice(options.offset);
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      console.log(`🔍 Mock DB SELECT: ${tableName}`, { 
        options, 
        resultCount: results.length,
        totalRecords: table.size 
      });
      
      return results;
    } catch (error) {
      console.error(`❌ Mock DB SELECT failed: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * 更新数据
   */
  async update(tableName: string, data: any, where: Record<string, any>): Promise<{ changes: number }> {
    try {
      const constraints = tableConstraints[tableName];
      if (!constraints) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      const table = memoryStore.get(tableName)!;
      let changes = 0;

      // 查找匹配的记录
      for (const [id, record] of table.entries()) {
        const matches = Object.entries(where).every(([key, value]) => record[key] === value);
        
        if (matches) {
          // 验证更新数据的约束
          const updatedData = { ...record, ...data };
          validateConstraints(tableName, updatedData, true);

          // 添加更新时间戳
          const recordWithTimestamps = addTimestamps(tableName, updatedData, true);
          
          table.set(id, recordWithTimestamps);
          changes++;
        }
      }

      console.log(`✏️ Mock DB UPDATE: ${tableName}`, { where, data, changes });
      return { changes };
    } catch (error) {
      console.error(`❌ Mock DB UPDATE failed: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async delete(tableName: string, where: Record<string, any>): Promise<{ changes: number }> {
    try {
      const table = memoryStore.get(tableName);
      if (!table) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      let changes = 0;
      const toDelete: string[] = [];

      // 查找要删除的记录
      for (const [id, record] of table.entries()) {
        const matches = Object.entries(where).every(([key, value]) => record[key] === value);
        if (matches) {
          toDelete.push(id);
        }
      }

      // 删除记录
      toDelete.forEach(id => {
        table.delete(id);
        changes++;
      });

      console.log(`🗑️ Mock DB DELETE: ${tableName}`, { where, changes });
      return { changes };
    } catch (error) {
      console.error(`❌ Mock DB DELETE failed: ${tableName}`, error);
      throw error;
    }
  }

  /**
   * 执行原始 SQL（简化实现）
   */
  async run(sql: string): Promise<{ changes: number }> {
    console.log(`🔧 Mock DB RAW SQL: ${sql}`);
    // 简化实现，返回成功状态
    return { changes: 1 };
  }

  /**
   * 获取表统计信息
   */
  getTableStats(): Record<string, { recordCount: number; autoIncrementCounter: number }> {
    const stats: Record<string, { recordCount: number; autoIncrementCounter: number }> = {};
    
    for (const [tableName, table] of memoryStore.entries()) {
      stats[tableName] = {
        recordCount: table.size,
        autoIncrementCounter: autoIncrementCounters.get(tableName) || 0
      };
    }
    
    return stats;
  }

  /**
   * 清空所有数据（用于测试）
   */
  clearAllData(): void {
    memoryStore.clear();
    autoIncrementCounters.clear();
    initializeTables();
    console.log('🧹 Mock database cleared');
  }
}

/**
 * 创建增强的 Edge Runtime 模拟数据库
 * 兼容 Drizzle ORM 接口
 */
export const createEnhancedEdgeMockDatabase = () => {
  const mockDb = new EnhancedMockDatabase();
  
  // 返回兼容 Drizzle ORM 的接口
  return {
    // 查询接口
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          limit: (count: number) => mockDb.select(table._.name, { where: condition, limit: count }),
        }),
        limit: (count: number) => mockDb.select(table._.name, { limit: count }),
      }),
    }),
    
    // 插入接口
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: () => Promise.resolve([mockDb.insert(table._.name, data)]),
      }),
    }),
    
    // 更新接口
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => mockDb.update(table._.name, data, condition),
      }),
    }),
    
    // 删除接口
    delete: (table: any) => ({
      where: (condition: any) => mockDb.delete(table._.name, condition),
    }),
    
    // 原始 SQL 执行
    run: (sql: string) => mockDb.run(sql),
    
    // 添加 schema 支持
    ...Object.keys(schema).reduce((acc, key) => {
      acc[key] = schema[key as keyof typeof schema];
      return acc;
    }, {} as any),
    
    // 调试和管理接口
    _mockDb: {
      getStats: () => mockDb.getTableStats(),
      clearAll: () => mockDb.clearAllData(),
      instance: mockDb
    }
  };
};

// 向后兼容的导出
export const createEdgeMockDatabase = createEnhancedEdgeMockDatabase;