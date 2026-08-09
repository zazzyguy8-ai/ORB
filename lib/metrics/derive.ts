import type { CollectedData, DerivedMetrics } from '@/lib/types/domain';

/**
 * Pure derivation of everything the model reasons about.
 *
 * Two rules hold throughout:
 *  1. No I/O, no randomness, no clock except the injected `nowMs` — the same
 *     inputs must always produce the same metrics, or historical evaluation
 *     (spec §14) is meaningless.
 *  2. Missing in, missing out. A ratio whose denominator is unknown is null,
 *     never 0 and never a default.
 */

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

export function deriveMetrics(data: CollectedData, nowMs: number = Date.now()): DerivedMetrics {
  const market = data.market.status === 'ok' ? data.market.data : null;
  const security = data.security.status === 'ok' ? data.security.data : null;
  const holders = data.holders.status === 'ok' ? data.holders.data : null;
  const wallets = data.wallets.status === 'ok' ? data.wallets.data : null;

  const liquidity = market?.liquidityUsd ?? null;
  const vol5m = market?.volumeUsd.m5 ?? null;
  const vol1h = market?.volumeUsd.h1 ?? null;
  const vol6h = market?.volumeUsd.h6 ?? null;

  const buys1h = market?.txns.h1.buys ?? null;
  const sells1h = market?.txns.h1.sells ?? null;
  const buys5m = market?.txns.m5.buys ?? null;
  const sells5m = market?.txns.m5.sells ?? null;

  const txCount1h = buys1h !== null && sells1h !== null ? buys1h + sells1h : null;
  const buys24h = market?.txns.h24.buys ?? null;
  const sells24h = market?.txns.h24.sells ?? null;
  const txCount24h = buys24h !== null && sells24h !== null ? buys24h + sells24h : null;

  const priceChange5m = market?.priceChangePct.m5 ?? null;
  const priceChange1h = market?.priceChangePct.h1 ?? null;

  const tokenAgeMinutes =
    market?.pairCreatedAtMs != null ? Math.max(0, (nowMs - market.pairCreatedAtMs) / 60_000) : null;

  // Volume acceleration: the last 5 minutes, projected to an hour, against the
  // actual last hour. 1.0 = steady, 2.0 = the last 5 minutes ran at twice the
  // hourly pace. Meaningless below a floor of real volume, so we gate it.
  const volumeAcceleration =
    vol5m !== null && vol1h !== null && vol1h > 0 ? (vol5m * 12) / vol1h : null;

  const volumeTrend6h = vol1h !== null && vol6h !== null && vol6h > 0 ? (vol1h * 6) / vol6h : null;

  // Price acceleration in percentage points per 5 minutes: recent rate minus
  // the hourly average rate. Positive => the move is speeding up.
  const priceAcceleration =
    priceChange5m !== null && priceChange1h !== null ? priceChange5m - priceChange1h / 12 : null;

  // Volume rising while price is flat is accumulation-shaped; price rising on
  // shrinking volume is exhaustion-shaped. Expressed as accel minus normalised
  // price move so the two are on a comparable scale.
  const volumePriceDivergence =
    volumeAcceleration !== null && priceChange5m !== null
      ? volumeAcceleration - 1 - priceChange5m / 10
      : null;

  const netFlow = wallets?.netFlowUsd ?? null;

  return {
    tokenAgeMinutes,
    liquidityUsd: liquidity,
    marketCapUsd: market?.marketCapUsd ?? market?.fdvUsd ?? null,
    volume1hUsd: vol1h,
    volume24hUsd: market?.volumeUsd.h24 ?? null,
    liquidityTurnover1h: ratio(vol1h, liquidity),
    liquidityToMcapRatio: ratio(liquidity, market?.marketCapUsd ?? market?.fdvUsd ?? null),
    volumeAcceleration,
    volumeTrend6h,
    buySellRatio1h: buys1h !== null && sells1h !== null ? buys1h / Math.max(1, sells1h) : null,
    buySellRatio5m: buys5m !== null && sells5m !== null ? buys5m / Math.max(1, sells5m) : null,
    txCount1h,
    txCount24h,
    avgTradeSizeUsd1h: ratio(vol1h, txCount1h),
    priceChange5m,
    priceChange1h,
    priceChange6h: market?.priceChangePct.h6 ?? null,
    priceChange24h: market?.priceChangePct.h24 ?? null,
    priceAcceleration,
    volumePriceDivergence,
    holderCount: holders?.holderCount ?? null,
    top10Pct: holders?.top10Pct ?? null,
    top20Pct: holders?.top20Pct ?? null,
    largestHolderPct: holders?.largestHolderPct ?? null,
    creatorBalancePct: security?.creatorBalancePct ?? null,
    lpLockedOrBurnedPct: security?.lpLockedOrBurnedPct ?? null,
    largeWalletNetFlowUsd: netFlow,
    largeWalletBuyers: wallets?.uniqueBuyers ?? null,
    largeWalletSellers: wallets?.uniqueSellers ?? null,
    largeWalletFlowRatio: ratio(netFlow, vol1h),
  };
}
