import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { recordDueOutcomes } from '@/lib/outcomes/tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Records due price checkpoints. Intended to run every minute (see vercel.json)
 * so the +5m checkpoint lands close to its nominal time.
 *
 * Protected by a shared secret. When CRON_SECRET is unset the endpoint refuses
 * to run rather than defaulting open — an unauthenticated endpoint that issues
 * outbound provider calls is a free amplification vector.
 */
async function handle(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const header = request.headers.get('authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  if (provided !== env.cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const report = await recordDueOutcomes();
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
