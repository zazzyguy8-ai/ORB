import { DexScreenerProvider } from '@/lib/providers/market/dexscreener';
import { env } from '@/lib/config/env';
import { getDb } from '@/lib/db/client';

/**
 * Outcome tracking (spec §14).
 *
 * The point is not to promise returns — it is to make the model falsifiable.
 * Every analysis schedules five checkpoints at write time; this worker claims
 * the ones that are due, records the price, and stores the signed return
 * against the baseline. Once enough rows exist, `decision_performance` answers
 * whether BUY actually outperformed WATCH, and `analysis_metrics` answers which
 * individual signals carried that difference.
 */

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 40;

export interface TrackerReport {
  due: number;
  recorded: number;
  failed: number;
  skipped: number;
}

interface DueRow {
  id: number;
  analysis_id: string;
  token_id: string;
  checkpoint: string;
  baseline_price_usd: number | null;
  attempts: number;
  address: string;
}

export async function recordDueOutcomes(nowMs: number = Date.now()): Promise<TrackerReport> {
  const db = getDb();
  const report: TrackerReport = { due: 0, recorded: 0, failed: 0, skipped: 0 };
  if (!db) return report;

  const { data, error } = await db
    .from('analysis_outcomes')
    .select('id,analysis_id,token_id,checkpoint,baseline_price_usd,attempts,analyses(address)')
    .eq('status', 'pending')
    .lte('due_at', new Date(nowMs).toISOString())
    .order('due_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !data) return report;

  const rows: DueRow[] = data.map((row: any) => ({
    id: row.id,
    analysis_id: row.analysis_id,
    token_id: row.token_id,
    checkpoint: row.checkpoint,
    baseline_price_usd: row.baseline_price_usd === null ? null : Number(row.baseline_price_usd),
    attempts: row.attempts ?? 0,
    address: row.analyses?.address ?? '',
  }));

  report.due = rows.length;
  if (rows.length === 0) return report;

  // One price lookup per distinct token, not per checkpoint row — several
  // analyses of the same token frequently come due together.
  const provider = new DexScreenerProvider();
  const addresses = [...new Set(rows.map((r) => r.address).filter(Boolean))];
  const prices = new Map<string, { price: number | null; liquidity: number | null; mcap: number | null; volH1: number | null }>();

  await Promise.all(
    addresses.map(async (address) => {
      const result = await provider.getMarketData({
        chain: 'solana',
        address,
        timeoutMs: env.providerTimeoutMs,
      });
      if (result.status === 'ok') {
        prices.set(address, {
          price: result.data.priceUsd,
          liquidity: result.data.liquidityUsd,
          mcap: result.data.marketCapUsd,
          volH1: result.data.volumeUsd.h1,
        });
      }
    }),
  );

  await Promise.all(
    rows.map(async (row) => {
      const quote = prices.get(row.address);
      const price = quote?.price ?? null;

      if (price === null) {
        const attempts = row.attempts + 1;
        // Give up after a few tries rather than retrying a delisted token forever.
        const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        await db.from('analysis_outcomes').update({ attempts, status }).eq('id', row.id);
        if (status === 'failed') report.failed += 1;
        else report.skipped += 1;
        return;
      }

      const baseline = row.baseline_price_usd;
      const returnPct =
        baseline !== null && baseline > 0 ? ((price - baseline) / baseline) * 100 : null;

      await Promise.allSettled([
        db
          .from('analysis_outcomes')
          .update({
            status: 'recorded',
            price_usd: price,
            return_pct: returnPct,
            attempts: row.attempts + 1,
            recorded_at: new Date(nowMs).toISOString(),
          })
          .eq('id', row.id),
        db.from('price_snapshots').upsert(
          {
            token_id: row.token_id,
            analysis_id: row.analysis_id,
            checkpoint: row.checkpoint,
            price_usd: price,
            liquidity_usd: quote?.liquidity ?? null,
            market_cap_usd: quote?.mcap ?? null,
            volume_h1_usd: quote?.volH1 ?? null,
            captured_at: new Date(nowMs).toISOString(),
          },
          { onConflict: 'analysis_id,checkpoint' },
        ),
      ]);

      report.recorded += 1;
    }),
  );

  return report;
}
