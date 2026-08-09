import { NextResponse } from 'next/server';
import { validateSolanaAddress } from '@/lib/chains/solana';
import { env, isAiConfigured, isSupabaseConfigured, providerAvailability } from '@/lib/config/env';
import { DEFAULT_PROBE_MINT, probeProviders } from '@/lib/diagnostics/probe';
import { SCORING_VERSION } from '@/lib/scoring/weights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Live provider diagnostics — run this first after any deploy.
 *
 *   curl -H "authorization: Bearer $CRON_SECRET" \
 *        "https://<host>/api/diagnostics?address=<mint>"
 *
 * Protected by the same shared secret as the cron worker: it issues outbound
 * requests to several third parties, so leaving it open would hand anyone a
 * free amplification vector against our rate-limit budget.
 */
export async function GET(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured; diagnostics are disabled.' },
      { status: 503 },
    );
  }

  const provided = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (provided !== env.cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const requested = new URL(request.url).searchParams.get('address');
  const address = requested ?? DEFAULT_PROBE_MINT;

  const validation = validateSolanaAddress(address);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const report = await probeProviders(validation.address);

  return NextResponse.json({
    ...report,
    usingDefaultToken: requested === null,
    config: {
      scoringVersion: SCORING_VERSION,
      ai: isAiConfigured(),
      persistence: isSupabaseConfigured(),
      providers: providerAvailability(),
      solanaRpcHost: safeHost(env.solanaRpcUrl),
      timeouts: { providerMs: env.providerTimeoutMs, aiMs: env.aiTimeoutMs },
    },
  });
}

/** Host only — a paid RPC URL usually carries the key in its path. */
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
}
