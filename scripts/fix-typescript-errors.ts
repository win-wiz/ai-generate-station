#!/usr/bin/env tsx

/**
 * 修复 TypeScript 错误的脚本
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const fixes = [
  // 修复 tailwind.config.ts
  {
    file: 'tailwind.config.ts',
    search: `darkMode: ['class'],`,
    replace: `darkMode: 'class',`
  },
  
  // 修复 async-database.ts 的导入
  {
    file: 'src/server/db/async-database.ts',
    search: `await import('./real-database-manager.ts')`,
    replace: `await import('./real-database-manager')`
  },
];

function applyFixes() {
  console.log('🔧 Applying TypeScript fixes...');
  
  for (const fix of fixes) {
    try {
      const filePath = join(process.cwd(), fix.file);
      const content = readFileSync(filePath, 'utf-8');
      
      if (content.includes(fix.search)) {
        const newContent = content.replace(fix.search, fix.replace);
        writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Fixed ${fix.file}`);
      } else {
        console.log(`⚠️ Pattern not found in ${fix.file}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing ${fix.file}:`, error);
    }
  }
  
  console.log('🎉 TypeScript fixes completed!');
}

applyFixes();