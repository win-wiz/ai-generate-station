import { eq, desc, asc, and, or, like, count } from "drizzle-orm";
import { db } from "./index";
import { users, posts, aiGenerationTasks, userPreferences } from "./schema";

/**
 * Database utility functions for common operations
 */

// User operations
export const userUtils = {
  /**
   * Get user by ID
   */
  async getById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Create user with default preferences
   */
  async create(userData: {
    name?: string;
    email: string;
    image?: string;
  }) {
    const [user] = await db.insert(users).values(userData).returning();
    
    if (user) {
      // Create default preferences
      await db.insert(userPreferences).values({
        userId: user.id,
        theme: "light",
        language: "en",
        aiModel: "gpt-3.5-turbo",
        createdAt: new Date(),
      });
    }
    
    return user;
  },

  /**
   * Update user
   */
  async update(id: string, updates: Partial<typeof users.$inferInsert>) {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  },
};

// Post operations
export const postUtils = {
  /**
   * Get posts with pagination and filtering
   */
  async getMany(options: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  } = {}) {
    const { page = 1, limit = 10, status, userId } = options;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(posts.status, status));
    if (userId) conditions.push(eq(posts.createdById, userId));

    if (conditions.length > 0) {
      return await db.select().from(posts)
        .where(and(...conditions))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      return await db.select().from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);
    }
  },

  /**
   * Get post by ID
   */
  async getById(id: number) {
    const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Create post
   */
  async create(postData: {
    title: string;
    content?: string;
    status?: string;
    slug?: string;
    tags?: string;
    createdById: string;
  }) {
    const [post] = await db.insert(posts).values({
      ...postData,
      createdAt: new Date(),
    }).returning();
    return post;
  },

  /**
   * Update post
   */
  async update(id: number, updates: Partial<typeof posts.$inferInsert>) {
    const [updated] = await db.update(posts).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(posts.id, id)).returning();
    return updated;
  },

  /**
   * Search posts
   */
  async search(query: string, limit = 10) {
    return await db.select().from(posts)
      .where(
        or(
          like(posts.title, `%${query}%`),
          like(posts.content, `%${query}%`)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  },
};

// AI Task operations
export const aiTaskUtils = {
  /**
   * Create AI generation task
   */
  async create(taskData: {
    userId: string;
    taskType: string;
    prompt: string;
    metadata?: string;
  }) {
    const [task] = await db.insert(aiGenerationTasks).values({
      ...taskData,
      createdAt: new Date(),
    }).returning();
    return task;
  },

  /**
   * Update task status
   */
  async updateStatus(
    id: number, 
    status: string, 
    result?: string,
    completedAt?: Date
  ) {
    const [updated] = await db.update(aiGenerationTasks).set({
      status,
      result,
      completedAt,
    }).where(eq(aiGenerationTasks.id, id)).returning();
    return updated;
  },

  /**
   * Get user tasks with pagination
   */
  async getUserTasks(userId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    taskType?: string;
  } = {}) {
    const { page = 1, limit = 10, status, taskType } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(aiGenerationTasks.userId, userId)];
    if (status) conditions.push(eq(aiGenerationTasks.status, status));
    if (taskType) conditions.push(eq(aiGenerationTasks.taskType, taskType));

    return await db.select().from(aiGenerationTasks)
      .where(and(...conditions))
      .orderBy(desc(aiGenerationTasks.createdAt))
      .limit(limit)
      .offset(offset);
  },
};

// User preferences operations
export const preferencesUtils = {
  /**
   * Get user preferences
   */
  async getByUserId(userId: string) {
    const result = await db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Update user preferences
   */
  async update(userId: string, updates: Partial<typeof userPreferences.$inferInsert>) {
    const [updated] = await db.update(userPreferences).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(userPreferences.userId, userId)).returning();
    return updated;
  },
};

/**
 * Database health check
 */
export async function healthCheck() {
  try {
    await db.select().from(users).limit(1);
    return { status: "healthy", timestamp: new Date() };
  } catch (error) {
    return { 
      status: "unhealthy", 
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date() 
    };
  }
}