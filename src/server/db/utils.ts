import { eq, desc, asc, and, or, like, count } from "drizzle-orm";
import { db } from "./index";
import { users, posts, aiGenerationTasks, userPreferences } from "./schema";

/**
 * Database utility functions for common operations
 */

// User operations
export const userUtils = {
  /**
   * Get user by ID with related data
   */
  async getById(id: string) {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        accounts: true,
        posts: {
          orderBy: desc(posts.createdAt),
          limit: 10,
        },
        preferences: true,
      },
    });
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
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
      });
    }
    
    return user;
  },
};

// Post operations
export const postUtils = {
  /**
   * Get posts with pagination
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [postsData, totalCount] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        with: {
          createdBy: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: desc(posts.createdAt),
        limit,
        offset,
      }),
      db.select({ count: count() }).from(posts).where(whereClause),
    ]);

    return {
      posts: postsData,
      totalCount: totalCount[0]?.count ?? 0,
      totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
      currentPage: page,
    };
  },

  /**
   * Create new post
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
      status: postData.status ?? "draft",
    }).returning();
    
    return post;
  },

  /**
   * Update post
   */
  async update(id: number, updates: Partial<typeof posts.$inferInsert>) {
    const [post] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    
    return post;
  },

  /**
   * Search posts by title or content
   */
  async search(query: string, limit = 10) {
    return await db.query.posts.findMany({
      where: or(
        like(posts.title, `%${query}%`),
        like(posts.content, `%${query}%`)
      ),
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: desc(posts.createdAt),
      limit,
    });
  },
};

// AI Generation Task operations
export const aiTaskUtils = {
  /**
   * Create new AI generation task
   */
  async create(taskData: {
    userId: string;
    taskType: string;
    prompt: string;
    metadata?: string;
  }) {
    const [task] = await db.insert(aiGenerationTasks).values(taskData).returning();
    return task;
  },

  /**
   * Update task status and result
   */
  async updateStatus(
    id: number, 
    status: string, 
    result?: string,
    completedAt?: Date
  ) {
    const [task] = await db
      .update(aiGenerationTasks)
      .set({ 
        status, 
        result,
        completedAt: completedAt ? completedAt : status === "completed" ? new Date() : undefined
      })
      .where(eq(aiGenerationTasks.id, id))
      .returning();
    
    return task;
  },

  /**
   * Get user's tasks with pagination
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

    const whereClause = and(...conditions);

    const [tasks, totalCount] = await Promise.all([
      db.query.aiGenerationTasks.findMany({
        where: whereClause,
        orderBy: desc(aiGenerationTasks.createdAt),
        limit,
        offset,
      }),
      db.select({ count: count() }).from(aiGenerationTasks).where(whereClause),
    ]);

    return {
      tasks,
      totalCount: totalCount[0]?.count ?? 0,
      totalPages: Math.ceil((totalCount[0]?.count ?? 0) / limit),
      currentPage: page,
    };
  },
};

// User Preferences operations
export const preferencesUtils = {
  /**
   * Get user preferences
   */
  async getByUserId(userId: string) {
    return await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });
  },

  /**
   * Update user preferences
   */
  async update(userId: string, updates: Partial<typeof userPreferences.$inferInsert>) {
    const existing = await this.getByUserId(userId);
    
    if (existing) {
      const [preference] = await db
        .update(userPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      
      return preference;
    } else {
      // Create if doesn't exist
      const [preference] = await db
        .insert(userPreferences)
        .values({ userId, ...updates })
        .returning();
      
      return preference;
    }
  },
};

/**
 * Database health check
 */
export async function healthCheck() {
  try {
    const result = await db.select({ count: count() }).from(users);
    return {
      status: "healthy",
      userCount: result[0]?.count ?? 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}