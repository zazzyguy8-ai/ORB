import { buildEvidence } from '@/lib/ai/evidence';
import { explain } from '@/lib/ai/explain';
import { env } from '@/lib/config/env';
import { classify } from '@/lib/decision/classify';
import { deriveMetrics } from '@/lib/metrics/derive';
import { getProviders } from '@/lib/providers/registry';
import type { ProviderContext } from '@/lib/providers/types';
import { evaluateRisk, unavailableChecks } from '@/lib/risk/rules';
import { scoreToken } from '@/lib/scoring/score';
import type {
  AnalysisResult,
  Chain,
  CollectedData,
  ProviderResult,
} from '@/lib/types/domain';

/**
 * The pipeline: collect in parallel → compute → explain.
 *
 * Ordering note (spec §15): market data is awaited a fraction earlier than the
 * rest *only* because the wallet provider needs a price to convert token
 * amounts into USD. Every other provider starts in the same tick, so the
 * collection stage costs the slowest provider, not the sum of them.
 */

/**
 * Belt and braces: providers already convert failures into ProviderResults, but
 * a bug in one of them must not take down the request. Anything that escapes is
 * caught here and becomes an `error` result for that category alone.
 */
async function guard<T>(
  source: string,
  call: () => Promise<ProviderResult<T>>,
): Promise<ProviderResult<T>> {
  try {
    return await call();
  } catch (err) {
    return {
      status: 'error',
      reason: err instanceof Error ? err.message : 'Provider failed.',
      source,
      latencyMs: 0,
    };
  }
}

async function collect(chain: Chain, address: string): Promise<CollectedData> {
  const providers = getProviders();
  const base: ProviderContext = { chain, address, timeoutMs: env.providerTimeoutMs };

  const market = guard(providers.market.name, () => providers.market.getMarketData(base));
  const security = guard(providers.security.name, () => providers.security.getSecurityData(base));
  const holders = guard(providers.holders.name, () => providers.holders.getHolderData(base));
  const social = guard(providers.social.name, () => providers.social.getSocialData(base));

  // Wallet sizing needs a USD price; chain it off market rather than issuing a
  // second price lookup.
  const wallets = market.then((result) =>
    guard(providers.wallets.name, () =>
      providers.wallets.getWalletData({
        ...base,
        hint: {
          priceUsd: result.status === 'ok' ? result.data.priceUsd : null,
          pairAddress: result.status === 'ok' ? result.data.pairAddress : null,
        },
      }),
    ),
  );

  const [marketResult, securityResult, holderResult, walletResult, socialResult] =
    await Promise.all([market, security, holders, wallets, social]);

  return {
    market: marketResult,
    security: securityResult,
    holders: holderResult,
    wallets: walletResult,
    social: socialResult,
  };
}

function latency(result: ProviderResult<unknown>): number {
  return result.latencyMs;
}

export interface AnalyzeOptions {
  chain?: Chain;
  /** Skips the LLM entirely; used by tests and by the outcome-tracking backfill. */
  skipAi?: boolean;
}

export interface AnalysisRun {
  result: AnalysisResult;
  /** Raw provider bundle, kept out of the API payload but needed for persistence. */
  collected: CollectedData;
}

export async function runAnalysis(
  address: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisRun> {
  const chain = options.chain ?? 'solana';
  const startedAt = Date.now();

  const data = await collect(chain, address);
  const collectMs = Date.now() - startedAt;

  const computeStart = Date.now();
  const metrics = deriveMetrics(data, computeStart);
  const score = scoreToken(metrics);
  const flags = evaluateRisk({ metrics, data });
  const { decision, confidence } = classify(score, flags);
  const evidence = buildEvidence(score, flags, metrics);
  const unavailable = unavailableChecks(data);
  const computeMs = Date.now() - computeStart;

  const aiStart = Date.now();
  const explanation = options.skipAi
    ? {
        reasons: evidence.slice(0, 3).map((e) => e.text),
        riskNotes: flags.slice(0, 3).map((f) => f.detail),
        source: 'deterministic' as const,
        fallbackReason: 'AI explanation skipped.',
      }
    : await explain({
        symbol: data.market.status === 'ok' ? data.market.data.symbol : null,
        decision,
        confidence,
        score: score.total,
        coverage: score.coverage,
        evidence,
        flags,
        unavailable,
      });
  const aiMs = Date.now() - aiStart;

  const market = data.market.status === 'ok' ? data.market.data : null;

  const result: AnalysisResult = {
    id: null,
    chain,
    address,
    name: market?.name ?? null,
    symbol: market?.symbol ?? null,
    decision,
    confidence,
    score,
    explanation,
    riskFlags: flags,
    metrics,
    market,
    security: data.security.status === 'ok' ? data.security.data : null,
    holders: data.holders.status === 'ok' ? data.holders.data : null,
    wallets: data.wallets.status === 'ok' ? data.wallets.data : null,
    availability: {
      market: data.market.status,
      security: data.security.status,
      holders: data.holders.status,
      wallets: data.wallets.status,
      social: data.social.status,
    },
    unavailable,
    timings: {
      totalMs: Date.now() - startedAt,
      collectMs,
      computeMs,
      aiMs,
      providers: {
        market: latency(data.market),
        security: latency(data.security),
        holders: latency(data.holders),
        wallets: latency(data.wallets),
        social: latency(data.social),
      },
    },
    persisted: false,
    createdAt: new Date(startedAt).toISOString(),
    delta: null,
  };

  return { result, collected: data };
}

/** Convenience wrapper for callers that do not need the raw provider bundle. */
export async function analyzeToken(
  address: string,
  options: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  return (await runAnalysis(address, options)).result;
}

/** False when we have so little data that publishing a label would be dishonest. */
export function hasUsableData(result: AnalysisResult): boolean {
  return result.availability.market === 'ok';
}
