import { NextResponse } from 'next/server';
import { isAiConfigured, isSupabaseConfigured, providerAvailability, env } from '@/lib/config/env';
import { SCORING_VERSION } from '@/lib/scoring/weights';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Configuration diagnostics. Reports presence of credentials, never values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    scoringVersion: SCORING_VERSION,
    ai: { configured: isAiConfigured(), model: isAiConfigured() ? env.anthropicModel : null },
    persistence: { configured: isSupabaseConfigured() },
    cron: { configured: Boolean(env.cronSecret) },
    providers: providerAvailability(),
    timeouts: { providerMs: env.providerTimeoutMs, aiMs: env.aiTimeoutMs },
  });
}
