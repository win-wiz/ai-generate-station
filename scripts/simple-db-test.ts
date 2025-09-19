#!/usr/bin/env tsx

/**
 * 简化的数据库测试脚本
 * 直接测试数据库连接，避免复杂的依赖
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/server/db/schema';

async function testSimpleConnection() {
  console.log('🔍 Testing simple database connection...');
  
  try {
    // 创建简单的数据库客户端
    const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
    console.log('📍 Database URL:', databaseUrl);
    
    const client = createClient({ url: databaseUrl });
    const db = drizzle(client, { schema });
    
    console.log('✅ Database client created successfully');
    
    // 测试基本查询
    console.log('📝 Testing basic query...');
    const users = await db.select().from(schema.users).limit(1);
    console.log('✅ Query executed successfully, found', users.length, 'users');
    
    // 测试插入（如果没有用户）
    if (users.length === 0) {
      console.log('👤 Creating test user...');
      const testUser = await db.insert(schema.users).values({
        email: 'test@example.com',
        name: 'Test User',
      }).returning();
      console.log('✅ Test user created:', testUser[0]?.id);
    }
    
    // 再次查询验证
    const allUsers = await db.select().from(schema.users);
    console.log('📊 Total users in database:', allUsers.length);
    
    console.log('🎉 Database test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting simple database test...\n');
  
  const success = await testSimpleConnection();
  
  if (success) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed!');
    process.exit(1);
  }
}

main();