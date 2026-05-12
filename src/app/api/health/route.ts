import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import packageJson from '../../../../package.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ComponentStatus =
  | { status: 'up'; latency_ms: number }
  | { status: 'down'; error: string }
  | { status: 'configured'; note: string }
  | { status: 'not_configured' };

async function checkDatabase(): Promise<ComponentStatus> {
  const t = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up', latency_ms: Date.now() - t };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'unknown',
    };
  }
}

function checkRedis(): ComponentStatus {
  // The rate-limit module ships its own Redis client and falls back to an
  // in-memory store when REDIS_URL is missing. Health does not bundle a Redis
  // client of its own, so we only report whether one is configured.
  if (process.env.REDIS_URL) {
    return { status: 'configured', note: 'REDIS_URL is set; live ping handled by the rate-limit module' };
  }
  return { status: 'not_configured' };
}

export async function GET() {
  const database = await checkDatabase();
  const redis = checkRedis();

  const dbHealthy = database.status === 'up';
  const overall = dbHealthy ? 'healthy' : 'unhealthy';

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime_s: Math.floor(process.uptime()),
      components: { database, redis },
    },
    { status: overall === 'healthy' ? 200 : 503 }
  );
}
