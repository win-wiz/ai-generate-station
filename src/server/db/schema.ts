import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator, text, integer } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `ai-generate-station_${name}`,
);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    title: d.text({ length: 256 }).notNull(),
    content: d.text(),
    status: d.text({ length: 20 }).default("draft").notNull(), // draft, published, archived
    slug: d.text({ length: 256 }),
    tags: d.text(), // JSON array of tags
    createdById: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
    publishedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("post_created_by_idx").on(t.createdById),
    index("post_title_idx").on(t.title),
    index("post_status_idx").on(t.status),
    index("post_slug_idx").on(t.slug),
    index("post_published_at_idx").on(t.publishedAt),
  ],
);

// AI Generation related tables
export const aiGenerationTasks = createTable(
  "task",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    taskType: d.text({ length: 50 }).notNull(), // text, image, code, etc.
    prompt: d.text().notNull(),
    result: d.text(),
    status: d.text({ length: 20 }).default("pending").notNull(), // pending, processing, completed, failed
    metadata: d.text(), // JSON metadata
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    completedAt: d.integer({ mode: "timestamp" }),
  }),
  (t) => [
    index("task_user_id_idx").on(t.userId),
    index("task_type_idx").on(t.taskType),
    index("task_status_idx").on(t.status),
    index("task_created_at_idx").on(t.createdAt),
  ],
);

export const userPreferences = createTable(
  "user_preference",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    theme: d.text({ length: 20 }).default("light").notNull(),
    language: d.text({ length: 10 }).default("en").notNull(),
    aiModel: d.text({ length: 50 }).default("gpt-3.5-turbo"),
    settings: d.text(), // JSON settings
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_id_unique_idx").on(t.userId),
  ],
);

export const users = createTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull(),
  emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
  image: d.text({ length: 255 }),
  // Traditional login fields
  password: d.text({ length: 255 }), // bcrypt hashed password
  loginFailedCount: d.integer().default(0).notNull(),
  lastLoginFailedAt: d.integer({ mode: "timestamp" }),
  lockedUntil: d.integer({ mode: "timestamp" }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  posts: many(posts),
  aiGenerationTasks: many(aiGenerationTasks),
  preferences: many(userPreferences),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  createdBy: one(users, { fields: [posts.createdById], references: [users.id] }),
}));

export const aiGenerationTasksRelations = relations(aiGenerationTasks, ({ one }) => ({
  user: one(users, { fields: [aiGenerationTasks.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.text({ length: 255 }).$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: d.text({ length: 255 }).notNull(),
    providerAccountId: d.text({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.text({ length: 255 }),
    scope: d.text({ length: 255 }),
    id_token: d.text(),
    session_state: d.text({ length: 255 }),
  }),
  (t) => [
    primaryKey({
      columns: [t.provider, t.providerAccountId],
    }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.text({ length: 255 }).notNull(),
    token: d.text({ length: 255 }).notNull(),
    expires: d.integer({ mode: "timestamp" }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
