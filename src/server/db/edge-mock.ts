/**
 * Edge Runtime 兼容的模拟数据库
 * 用于在 Edge Runtime 环境中提供基本的数据库功能
 */

import * as schema from './schema';

// 内存存储
const memoryStore = new Map<string, any[]>();

// 初始化表
const initializeTables = () => {
  const tables = [
    'ai-generate-station_user',
    'ai-generate-station_account', 
    'ai-generate-station_session',
    'ai-generate-station_verification_token',
    'ai-generate-station_post',
    'ai-generate-station_task',
    'ai-generate-station_user_preference'
  ];
  
  tables.forEach(table => {
    if (!memoryStore.has(table)) {
      memoryStore.set(table, []);
    }
  });
};

// 模拟 Drizzle ORM 接口
export const createEdgeMockDatabase = () => {
  initializeTables();
  
  return {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          limit: (count: number) => Promise.resolve([]),
        }),
        limit: (count: number) => Promise.resolve([]),
      }),
    }),
    
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: () => Promise.resolve([{ id: 'mock-id', ...data }]),
      }),
    }),
    
    update: (table: any) => ({
      set: (data: any) => ({
        where: (condition: any) => Promise.resolve({ changes: 1 }),
      }),
    }),
    
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve({ changes: 1 }),
    }),
    
    run: (sql: string) => Promise.resolve({ changes: 1 }),
    
    // 添加 schema 支持
    ...Object.keys(schema).reduce((acc, key) => {
      acc[key] = schema[key as keyof typeof schema];
      return acc;
    }, {} as any),
  };
};