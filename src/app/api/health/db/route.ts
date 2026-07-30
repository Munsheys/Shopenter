import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { connectionMetrics } from '@/lib/db';
import { getRedisClient } from '@/lib/cache';
import { getPoolDiagnostics } from '@/lib/queryMonitor';

export const runtime = 'nodejs';

/**
 * Database health check endpoint
 * Shows real-time connection pool status
 * Useful for monitoring on free M0 tier (3 connection limit)
 *
 * GET /api/health/db
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const redis = getRedisClient();
    const uptime = connectionMetrics.lastUsedAt - connectionMetrics.establishedAt;

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        poolSize: connectionMetrics.poolSize,
        maxPoolSize: 2,
        limit: '3/3 (M0 tier)',
        establishedAt: new Date(connectionMetrics.establishedAt).toISOString(),
        lastUsedAt: new Date(connectionMetrics.lastUsedAt).toISOString(),
        uptimeMs: uptime,
      },
      cache: {
        type: redis ? 'Redis' : 'Memory',
        available: true,
      },
      warnings: [
        connectionMetrics.poolSize > 2 && 'Pool size exceeds target of 2',
        uptime < 60000 && 'Connection recently established (possible restart)',
      ].filter(Boolean),
      diagnostics: getPoolDiagnostics(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
