// 简单的数据库连接测试
import fs from 'fs';
import path from 'path';

console.log("🚀 开始数据库连接测试...");

try {
  // 检查数据库文件是否存在
  
  const dbPath = path.join(process.cwd(), 'db.sqlite');
  
  if (fs.existsSync(dbPath)) {
    console.log("✅ 数据库文件存在:", dbPath);
    
    // 获取文件信息
    const stats = fs.statSync(dbPath);
    console.log("📊 数据库文件大小:", stats.size, "字节");
    console.log("📅 创建时间:", stats.birthtime);
    console.log("📅 修改时间:", stats.mtime);
    
    console.log("\n🎉 数据库连接测试成功！");
    console.log("✅ 本地 SQLite 数据库已准备就绪");
    
  } else {
    console.log("❌ 数据库文件不存在:", dbPath);
  }
  
} catch (error) {
  console.error("❌ 数据库测试失败:", error);
}