import { NextResponse } from 'next/server';
import { validateSolanaAddress, QUOTE_MINTS } from '@/lib/chains/solana';
import { env } from '@/lib/config/env';
import { getUserIdFromToken } from '@/lib/db/client';
import { buildDelta } from '@/lib/decision/delta';
import { getPreviousAnalysis, persistAnalysis } from '@/lib/db/repo';
import { runAnalysis } from '@/lib/pipeline/analyze';
import {
  checkIpLimit,
  checkUserQuota,
  clientIp,
  refundIpLimit,
  refundUserQuota,
} from '@/lib/ratelimit/limiter';
import { getProviders } from '@/lib/providers/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The product endpoint: address in, decision out.
 *
 * Order matters for both cost and latency — validate (free), rate limit (free),
 * then run the pipeline (expensive). Persistence happens after the payload is
 * assembled so it never sits in the user's wait.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const address = (body as { address?: unknown })?.address;
  const validation = validateSolanaAddress(address);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (QUOTE_MINTS.has(validation.address)) {
    return NextResponse.json(
      { error: 'That is a quote asset (SOL/USDC/USDT), not a memecoin to analyse.' },
      { status: 400 },
    );
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const userId = await getUserIdFromToken(token);
  const ip = clientIp(request.headers);

  if (userId) {
    const quota = await checkUserQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason, plan: quota.plan.id }, { status: 429 });
    }
  } else {
    const ipLimit = checkIpLimit(ip, env.anonAnalysesPerDay);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: ipLimit.reason, signInSuggested: true },
        {
          status: 429,
          headers: ipLimit.retryAfterSeconds
            ? { 'retry-after': String(ipLimit.retryAfterSeconds) }
            : undefined,
        },
      );
    }
  }

  try {
    // Read the previous analysis alongside the new one — it must be fetched
    // before persistAnalysis writes the current row, or "previous" would be
    // this very analysis.
    const [{ result, collected }, previous] = await Promise.all([
      runAnalysis(validation.address),
      getPreviousAnalysis('solana', validation.address),
    ]);

    if (result.availability.market !== 'ok') {
      // Without market data there is no token to talk about — do not publish a
      // label built on nothing (spec §4). A failed attempt is refunded: the user
      // should not lose a daily analysis because a provider was down.
      if (userId) await refundUserQuota(userId);
      else refundIpLimit(ip);

      // 'error' means we could not reach the provider; 'unavailable' means the
      // provider answered and had nothing. Those are different problems and the
      // user deserves to know which one they hit.
      const unreachable = result.availability.market === 'error';
      return NextResponse.json(
        {
          error: unreachable
            ? 'Market data provider could not be reached. Try again in a moment.'
            : 'No tradeable pair found for this address. It may be too new, not yet listed, or not a Solana token.',
          availability: result.availability,
        },
        { status: unreachable ? 503 : 404 },
      );
    }

    if (previous) {
      result.delta = buildDelta(previous, {
        decision: result.decision,
        score: result.score.total,
        priceUsd: result.market?.priceUsd ?? null,
        liquidityUsd: result.market?.liquidityUsd ?? null,
      });
    }

    const analysisId = await persistAnalysis(result, { userId, data: collected });

    return NextResponse.json({
      ...result,
      id: analysisId,
      persisted: analysisId !== null,
      timings: { ...result.timings, totalMs: Date.now() - startedAt },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Lightweight diagnostics for the UI's provider strip. */
export async function GET() {
  const providers = getProviders();
  return NextResponse.json({
    providers: Object.entries(providers).map(([key, provider]) => ({
      key,
      name: provider.name,
      available: provider.available,
      reason: provider.unavailableReason ?? null,
    })),
  });
}
