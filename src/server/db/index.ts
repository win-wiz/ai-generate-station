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

    // Handle local development or standard SQLite/LibSQL
    const url = env.DATABASE_URL === "d1-local" ? "file:./db.sqlite" : env.DATABASE_URL;
    
    const client = createClient({
      url,
      // SQLite specific optimizations
      ...(url.startsWith("file:") && {
        syncUrl: undefined,
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
  
  // For now, we'll use LibSQL adapter for all connections
  // D1 support can be added when deploying to Cloudflare Workers
  return drizzle(conn as ReturnType<typeof createClient>, { 
    schema,
    logger: env.NODE_ENV === "development",
  });
}

const db = globalForDb.db ?? createDatabase();
if (env.NODE_ENV !== "production") globalForDb.db = db;

export { db };
