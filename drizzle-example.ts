import { eq, desc, and } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

// 简化的表定义，用于测试
const users = sqliteTable("ai-generate-station_user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  image: text("image"),
});

const posts = sqliteTable("ai-generate-station_post", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title", { length: 256 }).notNull(),
  content: text("content"),
  status: text("status", { length: 20 }).default("draft").notNull(),
  createdById: text("createdById", { length: 255 }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

const userPreferences = sqliteTable("ai-generate-station_user_preference", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("userId", { length: 255 }).notNull(),
  theme: text("theme", { length: 20 }).default("light").notNull(),
  language: text("language", { length: 10 }).default("en").notNull(),
  aiModel: text("aiModel", { length: 50 }).default("gpt-3.5-turbo"),
  settings: text("settings"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

const aiGenerationTasks = sqliteTable("ai-generate-station_ai_generation_task", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("userId", { length: 255 }).notNull(),
  taskType: text("taskType", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  result: text("result"),
  status: text("status", { length: 20 }).default("pending").notNull(),
  metadata: text("metadata"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
});

// 初始化数据库连接
const client = createClient({
  url: "file:db.sqlite"
});
const db = drizzle(client);

async function runExample() {
  console.log("🚀 开始 Drizzle 本地数据库示例...\n");

  try {
    // 1. 创建用户
    console.log("1. 创建用户...");
    const newUser = await db.insert(users).values({
      name: "张三",
      email: "zhangsan@example.com",
      image: "https://example.com/avatar.jpg"
    }).returning();
    
    if (!newUser[0]) {
      throw new Error("用户创建失败");
    }
    
    const userId = newUser[0].id;
    console.log("✅ 用户创建成功:", newUser[0]);

    // 2. 创建用户偏好设置
    console.log("\n2. 创建用户偏好设置...");
    const userPref = await db.insert(userPreferences).values({
      userId: userId,
      theme: "dark",
      language: "zh",
      aiModel: "gpt-4",
      settings: JSON.stringify({ notifications: true, autoSave: true }),
      createdAt: new Date(),
    }).returning();
    console.log("✅ 用户偏好创建成功:", userPref[0]);

    // 3. 创建文章
    console.log("\n3. 创建文章...");
    const newPost = await db.insert(posts).values({
      title: "我的第一篇文章",
      content: "这是使用 Drizzle ORM 创建的第一篇文章内容。",
      status: "published",
      createdById: userId,
      createdAt: new Date(),
    }).returning();
    
    if (!newPost[0]) {
      throw new Error("文章创建失败");
    }
    
    console.log("✅ 文章创建成功:", newPost[0]);

    // 4. 创建 AI 生成任务
    console.log("\n4. 创建 AI 生成任务...");
    const aiTask = await db.insert(aiGenerationTasks).values({
      userId: userId,
      taskType: "text",
      prompt: "写一篇关于人工智能的文章",
      status: "completed",
      result: "人工智能是一项革命性的技术...",
      metadata: JSON.stringify({ model: "gpt-4", tokens: 150 }),
      createdAt: new Date(),
      completedAt: new Date(),
    }).returning();
    console.log("✅ AI 任务创建成功:", aiTask[0]);

    // 5. 查询操作
    console.log("\n5. 执行查询操作...");
    
    // 查询所有用户
    const allUsers = await db.select().from(users);
    console.log("📋 所有用户:", allUsers);

    // 查询特定用户的文章
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.createdById, userId))
      .orderBy(desc(posts.createdAt));
    console.log("📝 用户文章:", userPosts);

    // 查询用户的 AI 任务
    const userTasks = await db
      .select()
      .from(aiGenerationTasks)
      .where(and(
        eq(aiGenerationTasks.userId, userId),
        eq(aiGenerationTasks.status, "completed")
      ));
    console.log("🤖 用户 AI 任务:", userTasks);

    // 6. 更新操作
    console.log("\n6. 执行更新操作...");
    const updatedPost = await db
      .update(posts)
      .set({
        title: "我的第一篇文章（已更新）",
        updatedAt: new Date(),
      })
      .where(eq(posts.id, newPost[0].id))
      .returning();
    console.log("✏️ 文章更新成功:", updatedPost[0]);

    // 7. 统计查询
    console.log("\n7. 执行统计查询...");
    const userStats = await db
      .select({
        userId: users.id,
        userName: users.name,
        postCount: posts.id,
      })
      .from(users)
      .leftJoin(posts, eq(users.id, posts.createdById))
      .where(eq(users.id, userId));
    console.log("📊 用户统计:", userStats);

    console.log("\n🎉 所有数据库操作完成！");
    console.log("✅ 本地 Drizzle 数据库连接和操作验证成功！");

  } catch (error) {
    console.error("❌ 数据库操作失败:", error);
    throw error;
  } finally {
    client.close();
    console.log("🔒 数据库连接已关闭");
  }
}

// 运行示例
runExample().catch(console.error);