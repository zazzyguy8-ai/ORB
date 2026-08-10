import { getDb } from '@/lib/db/client';
import type { PreviousAnalysis } from '@/lib/decision/delta';
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The token's recent analyses, newest first.
 *
 * One query serves two features: the first row is "last time we looked" for the
 * delta, and the whole list is the score history. Read before the new row is
 * written, so the current analysis is never its own predecessor.
 *
 * Scope follows the same rule as the permalink: ownerless analyses are shared,
 * and a signed-in user additionally sees their own. Their research does not
 * become part of a stranger's chart.
 */
export async function getAnalysisHistoryForToken(
  chain: string,
  address: string,
  options: { userId?: string | null; limit?: number } = {},
): Promise<PreviousAnalysis[]> {
  const db = getDb();
  if (!db) return [];

  const limit = options.limit ?? 24;
  const userId = options.userId ?? null;

  try {
    let query = db
      .from('analyses')
      .select('id,decision,score,confidence,created_at,price_usd,liquidity_usd')
      .eq('chain', chain)
      .eq('address', address);

    // The id is interpolated into a PostgREST filter expression, so it is
    // checked against the uuid shape first rather than trusted.
    query = userId && UUID.test(userId)
      ? query.or(`user_id.is.null,user_id.eq.${userId}`)
      : query.is('user_id', null);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id as string,
      decision: row.decision as PreviousAnalysis['decision'],
      score: Number(row.score),
      confidence: Number(row.confidence),
      createdAt: row.created_at as string,
      priceUsd: row.price_usd === null ? null : Number(row.price_usd),
      liquidityUsd: row.liquidity_usd === null ? null : Number(row.liquidity_usd),
    }));
  } catch {
    return [];
  }
}

/** The single most recent stored analysis, or null when this is the first. */
export async function getPreviousAnalysis(
  chain: string,
  address: string,
  userId: string | null = null,
): Promise<PreviousAnalysis | null> {
  const rows = await getAnalysisHistoryForToken(chain, address, { userId, limit: 1 });
  return rows[0] ?? null;
}

export interface SharedOutcome {
  checkpoint: CheckpointKey;
  status: string;
  returnPct: number | null;
  priceUsd: number | null;
  recordedAt: string | null;
}

export interface SharedAnalysis {
  id: string;
  address: string;
  symbol: string | null;
  name: string | null;
  decision: string;
  confidence: number;
  score: number;
  coverage: number;
  reasons: string[];
  riskNotes: string[];
  createdAt: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  riskFlags: { code: string; severity: string; title: string; detail: string; veto: boolean }[];
  outcomes: SharedOutcome[];
}

export type SharedAnalysisLookup =
  | { status: 'ok'; analysis: SharedAnalysis }
  | { status: 'missing' }
  | { status: 'error' };

/**
 * A stored analysis by id, for its public permalink.
 *
 * Anything owned by a user reads as missing: their analyses are theirs, and a
 * guessable id must never expose them. The permalink is a receipt for a call
 * that was already public, not a back door into someone's history.
 *
 * 'missing' and 'error' are separate because the page caches its render. A
 * database hiccup that returned "missing" would bake a Not Found for every
 * visitor to a link that is perfectly valid.
 */
export async function lookupSharedAnalysis(id: string): Promise<SharedAnalysisLookup> {
  const db = getDb();
  if (!db) return { status: 'error' };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: 'missing' };

  try {
    const { data, error } = await db
      .from('analyses')
      .select(
        'id,address,decision,confidence,score,coverage,reasons,risk_notes,created_at,price_usd,market_cap_usd,liquidity_usd,tokens(symbol,name),risk_flags(code,severity,title,detail,veto),analysis_outcomes(checkpoint,status,return_pct,price_usd,recorded_at)',
      )
      .eq('id', id)
      .is('user_id', null)
      .maybeSingle();

    if (error) return { status: 'error' };
    if (!data) return { status: 'missing' };
    const row = data as any;

    const order = new Map(CHECKPOINTS.map((cp, index) => [cp.key as string, index]));

    const analysis: SharedAnalysis = {
      id: row.id,
      address: row.address,
      symbol: row.tokens?.symbol ?? null,
      name: row.tokens?.name ?? null,
      decision: row.decision,
      confidence: Number(row.confidence),
      score: Number(row.score),
      coverage: Number(row.coverage),
      reasons: Array.isArray(row.reasons) ? row.reasons : [],
      riskNotes: Array.isArray(row.risk_notes) ? row.risk_notes : [],
      createdAt: row.created_at,
      priceUsd: row.price_usd === null ? null : Number(row.price_usd),
      marketCapUsd: row.market_cap_usd === null ? null : Number(row.market_cap_usd),
      liquidityUsd: row.liquidity_usd === null ? null : Number(row.liquidity_usd),
      riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
      outcomes: (Array.isArray(row.analysis_outcomes) ? row.analysis_outcomes : [])
        .map((outcome: any) => ({
          checkpoint: outcome.checkpoint as CheckpointKey,
          status: outcome.status as string,
          returnPct: outcome.return_pct === null ? null : Number(outcome.return_pct),
          priceUsd: outcome.price_usd === null ? null : Number(outcome.price_usd),
          recordedAt: outcome.recorded_at ?? null,
        }))
        .sort(
          (a: SharedOutcome, b: SharedOutcome) =>
            (order.get(a.checkpoint) ?? 99) - (order.get(b.checkpoint) ?? 99),
        ),
    };

    return { status: 'ok', analysis };
  } catch {
    return { status: 'error' };
  }
}

/** Convenience for callers that cannot act on the difference, like the OG image. */
export async function getSharedAnalysis(id: string): Promise<SharedAnalysis | null> {
  const result = await lookupSharedAnalysis(id);
  return result.status === 'ok' ? result.analysis : null;
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
