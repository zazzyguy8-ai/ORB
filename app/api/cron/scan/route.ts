import { NextResponse } from 'next/server';
import { publishScanHits } from '@/lib/alerts/telegram';
import { env } from '@/lib/config/env';
import { runScan } from '@/lib/discovery/scan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A scan runs the full pipeline over up to thirty tokens; give it room. */
export const maxDuration = 300;

/**
 * Runs the scanner and publishes what it found.
 *
 * Protected by CRON_SECRET, and refuses to run when that is unset rather than
 * defaulting to open — this endpoint costs dozens of upstream calls per
 * invocation and would be an obvious thing to hammer.
 *
 * Sensible cadence is every few hours. More often mostly re-reads the same
 * listing feeds, and the cooldown inside the scan would skip the work anyway.
 */
async function handle(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (token !== env.cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const startedAt = Date.now();
  const report = await runScan();
  const published = await publishScanHits(report.hits);

  return NextResponse.json({
    ...report,
    published,
    tookMs: Date.now() - startedAt,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

/** GET as well, because most free schedulers only send GET. */
export async function GET(request: Request) {
  return handle(request);
}
