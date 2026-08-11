import { env } from '@/lib/config/env';
import { getDb } from '@/lib/db/client';
import { persistAnalysis, recordDiscoveries } from '@/lib/db/repo';
import { evaluateForShortlist, rankShortlist } from '@/lib/discovery/shortlist';
import { runAnalysis } from '@/lib/pipeline/analyze';
import { fetchCandidates, type CandidateSource } from '@/lib/providers/discovery/dexscreener';

/**
 * The scanner.
 *
 * Instead of waiting for someone to paste an address, this walks the public
 * listing feeds, runs the *same* pipeline over each candidate, and keeps the
 * few that clear the shortlist bar. Same model, same scoring, same refusal to
 * guess at missing data — the only difference is who chose the token.
 *
 * Three constraints shape the implementation, all of them about not being a
 * bad citizen:
 *
 *   - **Bounded.** A hard cap on candidates per run, and a small concurrency
 *     limit, because every candidate costs four upstream calls on free tiers.
 *   - **Idempotent-ish.** Tokens analysed recently are skipped, so running the
 *     scan more often does not multiply the load.
 *   - **Best-effort.** Persistence failures degrade the shortlist, never the
 *     scan; a scan that cannot write still returns its findings to the caller.
 */

const MAX_CANDIDATES = 30;
const CONCURRENCY = 3;
/** A token analysed inside this window is not worth re-analysing on a scan. */
const RESCAN_COOLDOWN_MINUTES = 180;

export interface ScanHit {
  address: string;
  symbol: string | null;
  name: string | null;
  decision: string;
  score: number;
  confidence: number;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  ageMinutes: number | null;
  reasons: string[];
  source: CandidateSource;
  analysisId: string | null;
}

export interface ScanReport {
  candidates: number;
  analysed: number;
  skipped: number;
  failed: number;
  hits: ScanHit[];
  /** Why the rejected ones were rejected, counted. Tells us if the bar is wrong. */
  rejections: Record<string, number>;
}

/** Addresses seen in the DB within the cooldown, so a scan does not repeat work. */
async function recentlyAnalysed(addresses: string[], nowMs: number): Promise<Set<string>> {
  const db = getDb();
  if (!db || addresses.length === 0) return new Set();

  try {
    const since = new Date(nowMs - RESCAN_COOLDOWN_MINUTES * 60_000).toISOString();
    const { data, error } = await db
      .from('analyses')
      .select('address')
      .in('address', addresses)
      .gte('created_at', since);

    if (error || !data) return new Set();
    return new Set((data as { address: string }[]).map((row) => row.address));
  } catch {
    return new Set();
  }
}

/** Runs `worker` over `items` with a fixed number in flight at a time. */
async function pooled<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}

export async function runScan(nowMs: number = Date.now()): Promise<ScanReport> {
  const report: ScanReport = {
    candidates: 0,
    analysed: 0,
    skipped: 0,
    failed: 0,
    hits: [],
    rejections: {},
  };

  const candidates = await fetchCandidates(env.providerTimeoutMs);
  report.candidates = candidates.length;
  if (candidates.length === 0) return report;

  const capped = candidates.slice(0, MAX_CANDIDATES);
  const seen = await recentlyAnalysed(
    capped.map((c) => c.address),
    nowMs,
  );

  const fresh = capped.filter((c) => !seen.has(c.address));
  report.skipped = capped.length - fresh.length;

  const hits: ScanHit[] = [];

  await pooled(fresh, CONCURRENCY, async (candidate) => {
    try {
      const { result, collected } = await runAnalysis(candidate.address);

      // No market data means there is no token to talk about — not a failure of
      // the scan, just a listing that leads nowhere.
      if (result.availability.market !== 'ok') {
        report.failed += 1;
        return;
      }

      report.analysed += 1;

      const verdict = evaluateForShortlist(result);
      if (!verdict.passed) {
        for (const reason of verdict.failures) {
          report.rejections[reason] = (report.rejections[reason] ?? 0) + 1;
        }
        return;
      }

      // Only shortlisted tokens are written. The rejects were the point of the
      // exercise, but storing thirty analyses a scan would bury the history a
      // person actually asked for under machine noise.
      const analysisId = await persistAnalysis(result, { userId: null, data: collected });

      hits.push({
        address: result.address,
        symbol: result.symbol,
        name: result.name,
        decision: result.decision,
        score: result.score.total,
        confidence: result.confidence,
        liquidityUsd: result.market?.liquidityUsd ?? null,
        marketCapUsd: result.market?.marketCapUsd ?? null,
        ageMinutes: result.metrics.tokenAgeMinutes,
        reasons: result.explanation.reasons.slice(0, 2),
        source: candidate.source,
        analysisId,
      });
    } catch {
      report.failed += 1;
    }
  });

  report.hits = rankShortlist(hits);

  await recordDiscoveries(
    report.hits.map((hit) => ({
      analysisId: hit.analysisId,
      address: hit.address,
      symbol: hit.symbol,
      name: hit.name,
      decision: hit.decision,
      score: hit.score,
      confidence: hit.confidence,
      liquidityUsd: hit.liquidityUsd,
      marketCapUsd: hit.marketCapUsd,
      ageMinutes: hit.ageMinutes,
      reasons: hit.reasons,
      source: hit.source,
    })),
  );

  return report;
}
