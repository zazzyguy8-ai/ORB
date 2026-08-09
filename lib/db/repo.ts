import { getDb } from '@/lib/db/client';
import type { AnalysisResult, CollectedData } from '@/lib/types/domain';

/**
 * Persistence. Everything here is best-effort by design: a database hiccup must
 * degrade history and outcome tracking, never the analysis the user is waiting
 * on. Callers fire this after the response payload is built.
 */

export const CHECKPOINTS = [
  { key: 'm5', minutes: 5 },
  { key: 'm15', minutes: 15 },
  { key: 'h1', minutes: 60 },
  { key: 'h6', minutes: 360 },
  { key: 'h24', minutes: 1440 },
] as const;

export type CheckpointKey = (typeof CHECKPOINTS)[number]['key'];

async function upsertToken(result: AnalysisResult): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from('tokens')
    .upsert(
      {
        chain: result.chain,
        address: result.address,
        name: result.name,
        symbol: result.symbol,
        pair_address: result.market?.pairAddress ?? null,
        dex: result.market?.dex ?? null,
        pair_created_at: result.market?.pairCreatedAtMs
          ? new Date(result.market.pairCreatedAtMs).toISOString()
          : null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'chain,address' },
    )
    .select('id')
    .single();

  if (error) return null;
  return data.id as string;
}

export interface PersistOptions {
  userId: string | null;
  data: CollectedData;
}

/** Writes the analysis and schedules its outcome checkpoints. Returns the id. */
export async function persistAnalysis(
  result: AnalysisResult,
  options: PersistOptions,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const tokenId = await upsertToken(result);
    if (!tokenId) return null;

    const { data: analysis, error } = await db
      .from('analyses')
      .insert({
        token_id: tokenId,
        user_id: options.userId,
        chain: result.chain,
        address: result.address,
        decision: result.decision,
        confidence: result.confidence,
        score: Number(result.score.total.toFixed(2)),
        coverage: Number(result.score.coverage.toFixed(3)),
        scoring_version: result.score.version,
        reasons: result.explanation.reasons,
        risk_notes: result.explanation.riskNotes,
        explanation_source: result.explanation.source,
        category_scores: Object.fromEntries(
          result.score.categories.map((c) => [c.category, { score: c.score, coverage: c.coverage }]),
        ),
        metrics: result.metrics,
        availability: result.availability,
        price_usd: result.market?.priceUsd ?? null,
        market_cap_usd: result.market?.marketCapUsd ?? null,
        liquidity_usd: result.market?.liquidityUsd ?? null,
        latency_ms: result.timings.totalMs,
      })
      .select('id')
      .single();

    if (error || !analysis) return null;
    const analysisId = analysis.id as string;

    const baseline = result.market?.priceUsd ?? null;
    const now = Date.now();

    // Everything below is independent; run it concurrently and ignore partial
    // failures — a missing metric row must not cost us the analysis row.
    await Promise.allSettled([
      db.from('analysis_metrics').insert(buildMetricRows(analysisId, result)),
      result.riskFlags.length > 0
        ? db.from('risk_flags').insert(
            result.riskFlags.map((flag) => ({
              analysis_id: analysisId,
              code: flag.code,
              severity: flag.severity,
              title: flag.title,
              detail: flag.detail,
              veto: flag.veto,
              evidence: flag.evidence,
            })),
          )
        : Promise.resolve(),
      writeWalletEvents(analysisId, tokenId, options.data),
      db.from('price_snapshots').insert({
        token_id: tokenId,
        analysis_id: analysisId,
        checkpoint: 't0',
        price_usd: baseline,
        liquidity_usd: result.market?.liquidityUsd ?? null,
        market_cap_usd: result.market?.marketCapUsd ?? null,
        volume_h1_usd: result.market?.volumeUsd.h1 ?? null,
      }),
      db.from('analysis_outcomes').insert(
        CHECKPOINTS.map((cp) => ({
          analysis_id: analysisId,
          token_id: tokenId,
          checkpoint: cp.key,
          due_at: new Date(now + cp.minutes * 60_000).toISOString(),
          baseline_price_usd: baseline,
        })),
      ),
    ]);

    return analysisId;
  } catch {
    return null;
  }
}

function buildMetricRows(analysisId: string, result: AnalysisResult) {
  const scoreByKey = new Map(
    result.score.categories.flatMap((category) =>
      category.contributions.map(
        (c) => [c.key, { score: c.score, category: category.category }] as const,
      ),
    ),
  );

  const rows = Object.entries(result.metrics)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .map(([key, value]) => ({
      analysis_id: analysisId,
      metric_key: key,
      metric_value: value as number,
      signal_score: null as number | null,
      category: null as string | null,
    }));

  for (const [key, entry] of scoreByKey) {
    rows.push({
      analysis_id: analysisId,
      metric_key: `signal.${key}`,
      metric_value: null as unknown as number,
      signal_score: Number(entry.score.toFixed(2)),
      category: entry.category,
    });
  }

  return rows;
}

async function writeWalletEvents(analysisId: string, tokenId: string, data: CollectedData) {
  const db = getDb();
  if (!db || data.wallets.status !== 'ok') return;

  const events = data.wallets.data.events;
  if (events.length === 0) return;

  await db.from('wallet_events').upsert(
    events.map((event) => ({
      analysis_id: analysisId,
      token_id: tokenId,
      wallet: event.wallet,
      side: event.side,
      amount_usd: event.amountUsd,
      criterion: event.criterion,
      tx_signature: event.txSignature,
      occurred_at: new Date(event.occurredAtMs).toISOString(),
    })),
    { onConflict: 'tx_signature,wallet,side', ignoreDuplicates: true },
  );
}

export interface HistoryRow {
  id: string;
  address: string;
  symbol: string | null;
  name: string | null;
  decision: string;
  confidence: number;
  score: number;
  reasons: string[];
  createdAt: string;
  priceUsd: number | null;
}

export async function listRecentAnalyses(
  userId: string | null,
  limit = 25,
): Promise<HistoryRow[]> {
  const db = getDb();
  if (!db) return [];

  let query = db
    .from('analyses')
    .select('id,address,decision,confidence,score,reasons,created_at,price_usd,tokens(symbol,name)')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  // Anonymous callers see the shared recent feed; signed-in users see their own.
  query = userId ? query.eq('user_id', userId) : query.is('user_id', null);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    address: row.address,
    symbol: row.tokens?.symbol ?? null,
    name: row.tokens?.name ?? null,
    decision: row.decision,
    confidence: row.confidence,
    score: Number(row.score),
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    createdAt: row.created_at,
    priceUsd: row.price_usd === null ? null : Number(row.price_usd),
  }));
}
