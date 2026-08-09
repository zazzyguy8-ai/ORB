import type { DerivedMetrics, ScoreCategory } from '@/lib/types/domain';

/**
 * THE MODEL. Every weight and every breakpoint in the product lives in this
 * file and nowhere else.
 *
 * Spec §10 asks that weights not be arbitrary and that they be re-fittable from
 * historical data. Two things make that possible:
 *
 *  1. Each signal is a named function of exactly one derived metric, scored on
 *     a 0..100 curve defined by explicit `breakpoints`. Both the weight and the
 *     curve are data, so a fitting job can rewrite this file without touching
 *     any logic.
 *  2. `SCORING_VERSION` is stamped on every stored analysis, so rows scored
 *     under an old model stay interpretable after a re-fit.
 *
 * The initial values below are priors, not fitted parameters — they encode
 * widely-held memecoin heuristics (concentration is bad, locked LP is good,
 * live mint authority is disqualifying) and are explicitly the thing that
 * outcome tracking exists to correct.
 */
export const SCORING_VERSION = 'v1.0.0-prior';

export interface Breakpoint {
  /** Metric value at this point on the curve. */
  at: number;
  /** Sub-score, 0..100, at that value. */
  score: number;
}

export interface SignalDefinition {
  key: string;
  label: string;
  metric: keyof DerivedMetrics;
  weight: number;
  /**
   * Piecewise-linear curve, ascending by `at`. Values below the first point
   * take the first score; above the last, the last.
   */
  breakpoints: Breakpoint[];
  /**
   * Optional gate: the signal is treated as no-data unless this predicate
   * passes. Used to stop tiny-denominator ratios from dominating the score.
   */
  requires?: (m: DerivedMetrics) => boolean;
  /** Short factual sentence for the evidence list. */
  describe: (value: number) => string;
}

export interface CategoryDefinition {
  category: ScoreCategory;
  weight: number;
  signals: SignalDefinition[];
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const usd = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(2)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(1)}K`
      : `$${v.toFixed(0)}`;

/** Volume-derived ratios are noise below this much hourly volume. */
const MIN_MEANINGFUL_H1_CONTEXT = (m: DerivedMetrics) =>
  m.txCount1h !== null && m.txCount1h >= 10;

export const MODEL: CategoryDefinition[] = [
  {
    category: 'momentum',
    weight: 0.18,
    signals: [
      {
        key: 'volume_acceleration',
        label: 'Volume acceleration (5m vs 1h pace)',
        metric: 'volumeAcceleration',
        weight: 0.45,
        requires: MIN_MEANINGFUL_H1_CONTEXT,
        breakpoints: [
          { at: 0.2, score: 10 },
          { at: 0.8, score: 40 },
          { at: 1.0, score: 50 },
          { at: 1.8, score: 75 },
          { at: 3.0, score: 90 },
          { at: 8.0, score: 70 }, // vertical spikes are as often a top as a start
        ],
        describe: (v) =>
          `Volume over the last 5 minutes is running at ${v.toFixed(1)}x the hourly pace.`,
      },
      {
        key: 'volume_trend_6h',
        label: 'Volume trend (1h vs 6h pace)',
        metric: 'volumeTrend6h',
        weight: 0.25,
        requires: MIN_MEANINGFUL_H1_CONTEXT,
        breakpoints: [
          { at: 0.3, score: 15 },
          { at: 1.0, score: 50 },
          { at: 2.5, score: 85 },
          { at: 6.0, score: 90 },
        ],
        describe: (v) => `Hourly volume is ${v.toFixed(1)}x the 6-hour average pace.`,
      },
      {
        key: 'price_acceleration',
        label: 'Price acceleration',
        metric: 'priceAcceleration',
        weight: 0.2,
        breakpoints: [
          { at: -15, score: 5 },
          { at: -3, score: 30 },
          { at: 0, score: 50 },
          { at: 5, score: 78 },
          { at: 20, score: 85 },
          { at: 60, score: 55 }, // parabolic: momentum, but late entry
        ],
        describe: (v) =>
          `Price is ${v >= 0 ? 'accelerating' : 'decelerating'} (${v.toFixed(1)} pts per 5 min vs the hourly rate).`,
      },
      {
        key: 'volume_price_divergence',
        label: 'Volume/price divergence',
        metric: 'volumePriceDivergence',
        weight: 0.1,
        requires: MIN_MEANINGFUL_H1_CONTEXT,
        breakpoints: [
          { at: -2, score: 25 },
          { at: 0, score: 50 },
          { at: 1.5, score: 75 },
          { at: 5, score: 70 },
        ],
        describe: (v) =>
          v > 0
            ? 'Volume is rising faster than price — accumulation-shaped, not just a price spike.'
            : 'Price is moving faster than volume supports.',
      },
    ],
  },
  {
    category: 'liquidity',
    weight: 0.2,
    signals: [
      {
        key: 'liquidity_usd',
        label: 'Pool liquidity',
        metric: 'liquidityUsd',
        weight: 0.3,
        breakpoints: [
          { at: 2_000, score: 5 }, // an exit of any size is not possible here
          { at: 15_000, score: 30 },
          { at: 60_000, score: 60 },
          { at: 250_000, score: 82 },
          { at: 1_500_000, score: 92 },
        ],
        describe: (v) => `Pool liquidity is ${usd(v)}.`,
      },
      {
        key: 'liquidity_turnover_1h',
        label: 'Hourly turnover vs liquidity',
        metric: 'liquidityTurnover1h',
        weight: 0.25,
        breakpoints: [
          { at: 0.02, score: 15 }, // dead pool
          { at: 0.2, score: 45 },
          { at: 1.0, score: 80 },
          { at: 4.0, score: 85 },
          { at: 15.0, score: 45 }, // churn far above pool depth is usually wash/bot
        ],
        describe: (v) => `Hourly volume equals ${v.toFixed(2)}x the pool's liquidity.`,
      },
      {
        key: 'liquidity_to_mcap',
        label: 'Liquidity vs market cap',
        metric: 'liquidityToMcapRatio',
        weight: 0.25,
        breakpoints: [
          { at: 0.005, score: 5 }, // exit would move the price catastrophically
          { at: 0.02, score: 25 },
          { at: 0.05, score: 55 },
          { at: 0.15, score: 85 },
          { at: 0.4, score: 90 },
        ],
        describe: (v) => `Liquidity is ${pct(v)} of market cap.`,
      },
      {
        key: 'lp_locked',
        label: 'LP locked or burned',
        metric: 'lpLockedOrBurnedPct',
        weight: 0.2,
        breakpoints: [
          { at: 0, score: 5 },
          { at: 0.5, score: 40 },
          { at: 0.9, score: 85 },
          { at: 1, score: 95 },
        ],
        describe: (v) => `${pct(v)} of LP tokens are locked or burned.`,
      },
    ],
  },
  {
    category: 'holders',
    weight: 0.17,
    signals: [
      {
        key: 'top10_concentration',
        label: 'Top 10 holder concentration',
        metric: 'top10Pct',
        weight: 0.4,
        breakpoints: [
          { at: 0.1, score: 92 },
          { at: 0.2, score: 78 },
          { at: 0.3, score: 55 },
          { at: 0.45, score: 25 },
          { at: 0.7, score: 5 },
        ],
        describe: (v) => `Top 10 holders control ${pct(v)} of supply.`,
      },
      {
        key: 'largest_holder',
        label: 'Largest single holder',
        metric: 'largestHolderPct',
        weight: 0.3,
        breakpoints: [
          { at: 0.02, score: 90 },
          { at: 0.05, score: 72 },
          { at: 0.1, score: 45 },
          { at: 0.2, score: 15 },
          { at: 0.35, score: 3 },
        ],
        describe: (v) => `The largest holder controls ${pct(v)} of supply.`,
      },
      {
        key: 'holder_count',
        label: 'Holder count',
        metric: 'holderCount',
        weight: 0.3,
        breakpoints: [
          { at: 30, score: 10 },
          { at: 200, score: 40 },
          { at: 1000, score: 68 },
          { at: 5000, score: 85 },
          { at: 25000, score: 92 },
        ],
        describe: (v) => `${Math.round(v).toLocaleString('en-US')} holders.`,
      },
    ],
  },
  {
    category: 'wallets',
    weight: 0.1,
    signals: [
      {
        key: 'large_wallet_flow_ratio',
        label: 'Large-wallet net flow vs hourly volume',
        metric: 'largeWalletFlowRatio',
        weight: 0.6,
        breakpoints: [
          { at: -0.3, score: 5 },
          { at: -0.05, score: 30 },
          { at: 0, score: 50 },
          { at: 0.1, score: 72 },
          { at: 0.35, score: 90 },
        ],
        describe: (v) =>
          v >= 0
            ? `Large wallets are net buyers, worth ${pct(v)} of hourly volume.`
            : `Large wallets are net sellers, worth ${pct(Math.abs(v))} of hourly volume.`,
      },
      {
        key: 'large_wallet_buyers',
        label: 'Distinct large-wallet buyers',
        metric: 'largeWalletBuyers',
        weight: 0.4,
        breakpoints: [
          { at: 0, score: 35 },
          { at: 2, score: 55 },
          { at: 6, score: 80 },
          { at: 15, score: 90 },
        ],
        describe: (v) => `${Math.round(v)} distinct large wallets bought in the last 30 minutes.`,
      },
    ],
  },
  {
    category: 'developer',
    weight: 0.1,
    signals: [
      {
        key: 'creator_balance',
        label: 'Creator supply held',
        metric: 'creatorBalancePct',
        weight: 1.0,
        breakpoints: [
          { at: 0, score: 85 },
          { at: 0.01, score: 78 },
          { at: 0.05, score: 45 },
          { at: 0.15, score: 12 },
          { at: 0.3, score: 2 },
        ],
        describe: (v) =>
          v <= 0.0005
            ? 'The creator wallet holds effectively none of the supply.'
            : `The creator wallet still holds ${pct(v)} of supply.`,
      },
    ],
  },
  {
    category: 'trading',
    weight: 0.13,
    signals: [
      {
        key: 'buy_sell_ratio_1h',
        label: 'Buy/sell ratio (1h)',
        metric: 'buySellRatio1h',
        weight: 0.4,
        requires: MIN_MEANINGFUL_H1_CONTEXT,
        breakpoints: [
          { at: 0.5, score: 10 },
          { at: 0.9, score: 40 },
          { at: 1.0, score: 50 },
          { at: 1.3, score: 72 },
          { at: 2.0, score: 85 },
          { at: 5.0, score: 60 }, // extreme skew is usually bots, not demand
        ],
        describe: (v) => `${v.toFixed(2)} buys for every sell over the last hour.`,
      },
      {
        key: 'tx_count_1h',
        label: 'Trade count (1h)',
        metric: 'txCount1h',
        weight: 0.35,
        breakpoints: [
          { at: 5, score: 10 },
          { at: 50, score: 45 },
          { at: 300, score: 75 },
          { at: 2000, score: 88 },
        ],
        describe: (v) => `${Math.round(v).toLocaleString('en-US')} trades in the last hour.`,
      },
      {
        key: 'avg_trade_size',
        label: 'Average trade size (1h)',
        metric: 'avgTradeSizeUsd1h',
        weight: 0.25,
        requires: MIN_MEANINGFUL_H1_CONTEXT,
        breakpoints: [
          { at: 5, score: 20 }, // dust-sized fills: bot noise
          { at: 50, score: 55 },
          { at: 400, score: 80 },
          { at: 5000, score: 70 },
        ],
        describe: (v) => `Average trade size is ${usd(v)}.`,
      },
    ],
  },
  {
    category: 'security',
    weight: 0.12,
    signals: [
      {
        key: 'token_age',
        label: 'Token age',
        metric: 'tokenAgeMinutes',
        weight: 0.4,
        breakpoints: [
          { at: 5, score: 12 }, // minutes old: maximum rug surface
          { at: 60, score: 35 },
          { at: 1440, score: 65 },
          { at: 10080, score: 80 },
          { at: 129600, score: 85 },
        ],
        describe: (v) =>
          v < 60
            ? `The pair is ${Math.round(v)} minutes old.`
            : v < 1440
              ? `The pair is ${(v / 60).toFixed(1)} hours old.`
              : `The pair is ${(v / 1440).toFixed(1)} days old.`,
      },
      {
        key: 'lp_locked_security',
        label: 'LP lock (rug surface)',
        metric: 'lpLockedOrBurnedPct',
        weight: 0.6,
        breakpoints: [
          { at: 0, score: 8 },
          { at: 0.5, score: 45 },
          { at: 0.95, score: 90 },
        ],
        describe: (v) =>
          v >= 0.95
            ? 'LP is fully locked or burned, so the pool cannot simply be pulled.'
            : `Only ${pct(v)} of LP is locked or burned.`,
      },
    ],
  },
];

/** Score bands for the final classification (spec §5). */
export const DECISION_THRESHOLDS = {
  buy: 68,
  watch: 45,
  /** Below this, even a clean token is not worth the risk budget. */
  minCoverageForBuy: 0.55,
} as const;
