import { drizzle } from "drizzle-orm/libsql";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { createClient } from "@libsql/client";

import { env } from "@/env";
import * as schema from "./schema";
import type { D1Database } from "@/types/cloudflare";

// Type declarations for Cloudflare D1
declare global {
  var DB: D1Database | undefined;
}

/**
 * Create database client with error handling and connection options
 */
function createDatabaseClient() {
  try {
    // Handle Cloudflare D1 remote connection
    if (env.DATABASE_URL === "d1-remote") {
      // Check if we're in Cloudflare Workers/Pages environment
      if (typeof globalThis.DB !== "undefined" && globalThis.DB) {
        console.log("Using Cloudflare D1 database binding");
        return globalThis.DB;
      }
      
      // If D1 binding is not available, fall back to local SQLite for development
      console.warn("D1 database binding not found, falling back to local SQLite for development");
      const client = createClient({
        url: "file:./db.sqlite",
        syncUrl: undefined,
        authToken: undefined,
      });
      return client;
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
  
  // Use D1 adapter for Cloudflare D1, LibSQL adapter for others
  if (env.DATABASE_URL === "d1-remote" && typeof globalThis.DB !== "undefined") {
    return drizzleD1(conn as D1Database, { 
      schema,
      logger: env.NODE_ENV === "development",
    });
  }
  
  // Use LibSQL adapter for local development and other connections
  return drizzle(conn as ReturnType<typeof createClient>, { 
    schema,
    logger: env.NODE_ENV === "development",
  });
}

const db = globalForDb.db ?? createDatabase();
if (env.NODE_ENV !== "production") globalForDb.db = db;

export { db };
