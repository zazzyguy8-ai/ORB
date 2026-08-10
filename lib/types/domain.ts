/**
 * Domain types shared across providers, metrics, scoring and the API surface.
 *
 * Rule that governs this whole file: every field that can be absent is `null`,
 * never `0` and never a guess. Downstream code distinguishes "we know it is zero"
 * from "we do not know" — that distinction is the difference between an honest
 * score and an invented one.
 */

import type { AnalysisDelta } from '@/lib/decision/delta';

export type Chain = 'solana';

export type Decision = 'BUY' | 'WATCH' | 'AVOID';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Uniform envelope returned by every data provider. */
export type ProviderResult<T> =
  | { status: 'ok'; data: T; source: string; latencyMs: number }
  | { status: 'unavailable'; reason: string; source: string; latencyMs: number }
  | { status: 'error'; reason: string; source: string; latencyMs: number };

export type ProviderStatus = ProviderResult<unknown>['status'];

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

/** Buys / sells over a single window. */
export interface TxnWindow {
  buys: number | null;
  sells: number | null;
}

/**
 * Presentational identity for a token — logo and official links.
 *
 * Purely cosmetic: nothing here feeds a metric, a score or a risk flag, and it
 * must never influence a decision. A token with a slick logo is not safer than
 * one without. It exists so the trader can confirm at a glance that they pasted
 * the address they meant to.
 */
export interface TokenProfile {
  imageUrl: string | null;
  headerUrl: string | null;
  websites: { label: string; url: string }[];
  socials: { type: string; url: string }[];
}

export interface MarketData {
  chain: Chain;
  tokenAddress: string;
  profile: TokenProfile | null;
  pairAddress: string | null;
  dex: string | null;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  /** Unix ms of pair creation; the best free proxy we have for token age. */
  pairCreatedAtMs: number | null;
  volumeUsd: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  priceChangePct: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  txns: { m5: TxnWindow; h1: TxnWindow; h6: TxnWindow; h24: TxnWindow };
  /** Number of tradeable pairs discovered for this mint. */
  pairCount: number | null;
  /** Total liquidity across all discovered pairs, not just the primary one. */
  totalLiquidityUsd: number | null;
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export interface SecurityData {
  /** Mint authority still live => supply can be inflated. */
  mintAuthorityEnabled: boolean | null;
  /** Freeze authority still live => balances can be frozen. */
  freezeAuthorityEnabled: boolean | null;
  metadataMutable: boolean | null;
  transferFeeBps: number | null;
  /** Presence of a transfer hook / non-standard transfer logic. */
  transferHookPresent: boolean | null;
  /** Share of LP tokens that are burned or provably locked, 0..1. */
  lpLockedOrBurnedPct: number | null;
  creatorAddress: string | null;
  /** Creator's share of total supply, 0..1. */
  creatorBalancePct: number | null;
  /** True when the token program is Token-2022 (extension risk surface). */
  isToken2022: boolean | null;
  /** Set when the provider explicitly flags a closed/scam mint. */
  providerFlaggedScam: boolean | null;
}

// ---------------------------------------------------------------------------
// Holders
// ---------------------------------------------------------------------------

export interface HolderAccount {
  /** Token account or owner address, provider-dependent. */
  address: string;
  /** Share of circulating supply, 0..1. */
  pct: number;
  /** True when this address is known to be a liquidity pool / program vault. */
  isPool?: boolean;
}

export interface HolderData {
  holderCount: number | null;
  top10Pct: number | null;
  top20Pct: number | null;
  largestHolderPct: number | null;
  topHolders: HolderAccount[];
  /** True when pool/vault accounts were identified and excluded from the above. */
  poolAccountsExcluded: boolean;
}

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------

export type WalletEventSide = 'buy' | 'sell';

export interface WalletEvent {
  wallet: string;
  side: WalletEventSide;
  amountUsd: number | null;
  occurredAtMs: number;
  txSignature: string | null;
  /**
   * Why this wallet was considered notable. Free text is deliberately not allowed:
   * a wallet is only ever labelled by a criterion we can actually measure.
   */
  criterion: 'large_trade_usd';
}

export interface WalletData {
  windowMinutes: number;
  events: WalletEvent[];
  uniqueBuyers: number | null;
  uniqueSellers: number | null;
  netFlowUsd: number | null;
  /** Minimum trade size that qualified an event as "large". */
  largeTradeThresholdUsd: number;
  /**
   * Deliberately null in this MVP. Populating it requires a provider that can
   * supply verified historical wallet performance; see docs/ARCHITECTURE.md §0.
   */
  qualityScoredWallets: null;
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

export interface SocialData {
  mentions24h: number | null;
  mentionVelocity: number | null;
  sentimentScore: number | null;
}

// ---------------------------------------------------------------------------
// Collected bundle
// ---------------------------------------------------------------------------

export interface CollectedData {
  market: ProviderResult<MarketData>;
  security: ProviderResult<SecurityData>;
  holders: ProviderResult<HolderData>;
  wallets: ProviderResult<WalletData>;
  social: ProviderResult<SocialData>;
}

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

/**
 * Deterministically computed from CollectedData. The AI never computes any of these.
 * `null` propagates: a metric derived from missing input is missing, not zero.
 */
export interface DerivedMetrics {
  tokenAgeMinutes: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  volume1hUsd: number | null;
  volume24hUsd: number | null;
  /** volume h1 annualised against liquidity — how fast the pool is turning over. */
  liquidityTurnover1h: number | null;
  liquidityToMcapRatio: number | null;
  /** volume(m5)*12 / volume(h1) — >1 means the last 5 minutes outpace the hour. */
  volumeAcceleration: number | null;
  /** volume(h1)*6 / volume(h6). */
  volumeTrend6h: number | null;
  buySellRatio1h: number | null;
  buySellRatio5m: number | null;
  txCount1h: number | null;
  txCount24h: number | null;
  /** Average trade size over the last hour, USD. */
  avgTradeSizeUsd1h: number | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  /** Price acceleration: 5m rate vs 1h rate, in percentage points per 5 min. */
  priceAcceleration: number | null;
  /** Positive when volume is rising faster than price — accumulation-shaped. */
  volumePriceDivergence: number | null;
  holderCount: number | null;
  top10Pct: number | null;
  top20Pct: number | null;
  largestHolderPct: number | null;
  creatorBalancePct: number | null;
  lpLockedOrBurnedPct: number | null;
  largeWalletNetFlowUsd: number | null;
  largeWalletBuyers: number | null;
  largeWalletSellers: number | null;
  /** Net flow expressed against hourly volume, so it is comparable across sizes. */
  largeWalletFlowRatio: number | null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type ScoreCategory =
  | 'momentum'
  | 'liquidity'
  | 'holders'
  | 'wallets'
  | 'developer'
  | 'trading'
  | 'security';

export interface SignalContribution {
  /** Stable identifier — used as the join key for historical signal analysis. */
  key: string;
  label: string;
  /** Raw metric value that produced this contribution. */
  value: number | null;
  /** 0..100 sub-score. */
  score: number;
  /** Relative weight of this signal inside its category. */
  weight: number;
}

export interface CategoryScore {
  category: ScoreCategory;
  /** 0..100, or null when no signal in the category had data. */
  score: number | null;
  /** Fraction of the category's weight that had data behind it, 0..1. */
  coverage: number;
  weight: number;
  contributions: SignalContribution[];
}

export interface ScoreResult {
  /** 0..100 overall, coverage-renormalised. */
  total: number;
  /** 0..1 — fraction of total model weight backed by real data. */
  coverage: number;
  categories: CategoryScore[];
  version: string;
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

export interface RiskFlag {
  code: string;
  severity: Severity;
  title: string;
  /** Short factual statement, always derived from a real value. */
  detail: string;
  /** The metric that triggered the rule, for auditability. */
  evidence: { key: string; value: number | string | boolean | null };
  /** Critical vetoes force AVOID regardless of score. */
  veto: boolean;
}

// ---------------------------------------------------------------------------
// Evidence + AI output
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  id: string;
  /** Pre-rendered factual sentence. The model may reuse or lightly rephrase it. */
  text: string;
  polarity: 'positive' | 'negative' | 'neutral';
  /** 0..1 importance used for deterministic ranking and fallback selection. */
  magnitude: number;
}

export interface Explanation {
  reasons: string[];
  riskNotes: string[];
  /** 'llm' when the model produced compliant output, 'deterministic' otherwise. */
  source: 'llm' | 'deterministic';
  /** Populated when the LLM was attempted but its output was rejected. */
  fallbackReason?: string;
}

// ---------------------------------------------------------------------------
// Analysis result
// ---------------------------------------------------------------------------

export interface DataAvailability {
  market: ProviderStatus;
  security: ProviderStatus;
  holders: ProviderStatus;
  wallets: ProviderStatus;
  social: ProviderStatus;
}

export interface AnalysisTimings {
  totalMs: number;
  collectMs: number;
  computeMs: number;
  aiMs: number;
  providers: Record<string, number>;
}

export interface AnalysisResult {
  id: string | null;
  chain: Chain;
  address: string;
  name: string | null;
  symbol: string | null;
  decision: Decision;
  /** 0..100. Score quality, not a probability of profit. */
  confidence: number;
  score: ScoreResult;
  explanation: Explanation;
  riskFlags: RiskFlag[];
  metrics: DerivedMetrics;
  market: MarketData | null;
  /**
   * Raw provider payloads, so the UI can render the detail behind a score
   * without re-deriving it. Null means that category was not collected — the
   * interface must show it as unchecked rather than as clean or as zero.
   */
  security: SecurityData | null;
  holders: HolderData | null;
  wallets: WalletData | null;
  availability: DataAvailability;
  unavailable: string[];
  timings: AnalysisTimings;
  persisted: boolean;
  createdAt: string;
  /**
   * Set when this token has been analysed before. The comparison is the one
   * thing a live data feed cannot reproduce — it needs our own history.
   */
  delta: AnalysisDelta | null;
}
