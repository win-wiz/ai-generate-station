import { NextResponse } from 'next/server';
import { checkDatabaseHealth, checkMigrationStatus } from '@/server/db';

export const runtime = 'edge';

/**
 * GET /api/health - 系统健康检查
 */
export async function GET() {
  try {
    const [dbHealth, migrationStatus] = await Promise.all([
      checkDatabaseHealth(),
      checkMigrationStatus(),
    ]);

    const isHealthy = dbHealth.status === 'healthy' && migrationStatus.status === 'up-to-date';

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        migrations: migrationStatus,
      },
      version: process.env.npm_package_version || '1.0.0',
    }, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
    });
  }
}