import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { env } from "@/env";
import * as schema from "./schema";

// Type declarations for Cloudflare D1
declare global {
  var DB: unknown;
}

/**
 * Create database client with error handling and connection options
 */
function createDatabaseClient() {
  try {
    // Handle Cloudflare D1 remote connection
    if (env.DATABASE_URL === "d1-remote") {
      // For D1, we'll use the binding in production
      // This will be handled by the Cloudflare Workers runtime
      if (typeof globalThis.DB !== "undefined") {
        return globalThis.DB;
      }
      throw new Error("D1 database binding not found. Make sure to configure wrangler.toml");
    }

    // For local development, use in-memory SQLite
    const url = env.DATABASE_URL === ":memory:" ? ":memory:" : env.DATABASE_URL;
    
    console.log("Creating database client with URL:", url);
    
    const client = createClient({
      url,
      // For in-memory database, no auth token needed
      ...(url === ":memory:" && {
        authToken: undefined,
      }),
    });

    return client;
  } catch (error) {
    console.error("Failed to create database client:", error);
    throw new Error("Database connection failed");
  }
}

/**
 * Cache the database connection
 */
const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof createDatabaseClient> | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function createDatabase() {
  const conn = createDatabaseClient();
  
  console.log("Initializing database with LibSQL adapter");
  return drizzle(conn, { 
    schema,
    logger: env.NODE_ENV === "development",
  });
}

const db = globalForDb.db ?? createDatabase();
if (env.NODE_ENV !== "production") globalForDb.db = db;

export { db };
