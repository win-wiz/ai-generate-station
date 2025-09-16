import { NextResponse } from "next/server";
import { healthCheck } from "@/server/db/utils";

/**
 * Database health check endpoint
 * GET /api/health
 */
export async function GET() {
  try {
    const health = await healthCheck();
    
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: health,
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}