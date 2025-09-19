/**
 * Cloudflare Workers/Pages type definitions
 */

// D1 Database types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Cloudflare Workers Environment
export interface CloudflareEnv {
  DB: D1Database;
  [key: string]: unknown;
}

// Request context for Cloudflare Workers
export interface CloudflareContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Cloudflare Workers Request
export interface CloudflareRequest extends Request {
  cf?: {
    colo: string;
    country: string;
    city: string;
    region: string;
    timezone: string;
    [key: string]: unknown;
  };
}