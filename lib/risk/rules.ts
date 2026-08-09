import type { CollectedData, DerivedMetrics, RiskFlag } from '@/lib/types/domain';

/**
 * Risk rules.
 *
 * Separate from scoring on purpose: a score is a blend, but some conditions are
 * not blendable. A live mint authority is not "worth -12 points" — it means the
 * supply can be inflated at will, and no amount of momentum offsets that. Those
 * rules carry `veto: true` and force AVOID in the classifier.
 *
 * Every rule states the value that triggered it, so nothing in the UI is a
 * claim we cannot point at a number for.
 */

export interface RuleContext {
  metrics: DerivedMetrics;
  data: CollectedData;
}

type Rule = (ctx: RuleContext) => RiskFlag | null;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const rules: Rule[] = [
  // --- Vetoes ------------------------------------------------------------
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (security?.mintAuthorityEnabled !== true) return null;
    return {
      code: 'MINT_AUTHORITY_ACTIVE',
      severity: 'critical',
      title: 'Mint authority is still active',
      detail: 'The creator can mint unlimited new supply and dilute holders at any time.',
      evidence: { key: 'security.mintAuthorityEnabled', value: true },
      veto: true,
    };
  },
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (security?.freezeAuthorityEnabled !== true) return null;
    return {
      code: 'FREEZE_AUTHORITY_ACTIVE',
      severity: 'critical',
      title: 'Freeze authority is still active',
      detail: 'Token accounts can be frozen, which can prevent you from selling.',
      evidence: { key: 'security.freezeAuthorityEnabled', value: true },
      veto: true,
    };
  },
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (security?.providerFlaggedScam !== true) return null;
    return {
      code: 'PROVIDER_FLAGGED',
      severity: 'critical',
      title: 'Security provider flagged this mint',
      detail: 'GoPlus reports this mint as closable or otherwise hazardous.',
      evidence: { key: 'security.providerFlaggedScam', value: true },
      veto: true,
    };
  },
  ({ metrics }) => {
    if (metrics.largestHolderPct === null || metrics.largestHolderPct < 0.5) return null;
    return {
      code: 'SINGLE_WALLET_MAJORITY',
      severity: 'critical',
      title: 'One wallet holds a majority of supply',
      detail: `A single non-pool wallet controls ${pct(metrics.largestHolderPct)} of supply and can exit into any bid.`,
      evidence: { key: 'largestHolderPct', value: metrics.largestHolderPct },
      veto: true,
    };
  },
  ({ metrics }) => {
    if (metrics.liquidityUsd === null || metrics.liquidityUsd >= 3_000) return null;
    return {
      code: 'LIQUIDITY_TOO_THIN',
      severity: 'critical',
      title: 'Liquidity is effectively zero',
      detail: `The pool holds only $${Math.round(metrics.liquidityUsd).toLocaleString('en-US')}; any meaningful exit would move the price against you.`,
      evidence: { key: 'liquidityUsd', value: metrics.liquidityUsd },
      veto: true,
    };
  },

  // --- High ---------------------------------------------------------------
  ({ metrics }) => {
    if (metrics.lpLockedOrBurnedPct === null || metrics.lpLockedOrBurnedPct >= 0.5) return null;
    return {
      code: 'LP_UNLOCKED',
      severity: 'high',
      title: 'Liquidity is not locked',
      detail: `Only ${pct(metrics.lpLockedOrBurnedPct)} of LP is locked or burned, so the pool can be withdrawn.`,
      evidence: { key: 'lpLockedOrBurnedPct', value: metrics.lpLockedOrBurnedPct },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.top10Pct === null || metrics.top10Pct < 0.35) return null;
    return {
      code: 'HOLDER_CONCENTRATION',
      severity: metrics.top10Pct >= 0.5 ? 'high' : 'medium',
      title: 'Supply is concentrated',
      detail: `Top 10 holders control ${pct(metrics.top10Pct)} of supply.`,
      evidence: { key: 'top10Pct', value: metrics.top10Pct },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.creatorBalancePct === null || metrics.creatorBalancePct < 0.05) return null;
    return {
      code: 'CREATOR_HOLDINGS',
      severity: metrics.creatorBalancePct >= 0.15 ? 'high' : 'medium',
      title: 'Creator still holds a large position',
      detail: `The creator wallet holds ${pct(metrics.creatorBalancePct)} of supply.`,
      evidence: { key: 'creatorBalancePct', value: metrics.creatorBalancePct },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.liquidityToMcapRatio === null || metrics.liquidityToMcapRatio >= 0.02) return null;
    return {
      code: 'LIQUIDITY_VS_MCAP',
      severity: 'high',
      title: 'Market cap is far above the liquidity backing it',
      detail: `Liquidity is only ${pct(metrics.liquidityToMcapRatio)} of market cap.`,
      evidence: { key: 'liquidityToMcapRatio', value: metrics.liquidityToMcapRatio },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.tokenAgeMinutes === null || metrics.tokenAgeMinutes > 30) return null;
    return {
      code: 'VERY_NEW_PAIR',
      severity: 'high',
      title: 'Pair is minutes old',
      detail: `The pair was created ${Math.round(metrics.tokenAgeMinutes)} minutes ago; there is no track record to judge.`,
      evidence: { key: 'tokenAgeMinutes', value: metrics.tokenAgeMinutes },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.largeWalletFlowRatio === null || metrics.largeWalletFlowRatio > -0.15) return null;
    return {
      code: 'LARGE_WALLET_DISTRIBUTION',
      severity: 'high',
      title: 'Large wallets are distributing',
      detail: `Large-wallet net flow is negative and equals ${pct(Math.abs(metrics.largeWalletFlowRatio))} of hourly volume.`,
      evidence: { key: 'largeWalletFlowRatio', value: metrics.largeWalletFlowRatio },
      veto: false,
    };
  },

  // --- Medium / low --------------------------------------------------------
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (!security?.transferFeeBps || security.transferFeeBps <= 0) return null;
    return {
      code: 'TRANSFER_FEE',
      severity: security.transferFeeBps >= 500 ? 'high' : 'medium',
      title: 'Token charges a transfer fee',
      detail: `Every transfer is taxed ${(security.transferFeeBps / 100).toFixed(2)}%.`,
      evidence: { key: 'security.transferFeeBps', value: security.transferFeeBps },
      veto: false,
    };
  },
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (security?.transferHookPresent !== true) return null;
    return {
      code: 'TRANSFER_HOOK',
      severity: 'medium',
      title: 'Token uses a transfer hook',
      detail: 'Transfers run custom program logic, which can restrict selling.',
      evidence: { key: 'security.transferHookPresent', value: true },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.buySellRatio1h === null || metrics.buySellRatio1h >= 0.7) return null;
    return {
      code: 'SELL_PRESSURE',
      severity: 'medium',
      title: 'Sell pressure dominates',
      detail: `Only ${metrics.buySellRatio1h.toFixed(2)} buys per sell over the last hour.`,
      evidence: { key: 'buySellRatio1h', value: metrics.buySellRatio1h },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.priceChange1h === null || metrics.priceChange1h > -25) return null;
    return {
      code: 'SHARP_DRAWDOWN',
      severity: 'medium',
      title: 'Sharp drawdown in progress',
      detail: `Price is down ${Math.abs(metrics.priceChange1h).toFixed(1)}% over the last hour.`,
      evidence: { key: 'priceChange1h', value: metrics.priceChange1h },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (
      metrics.liquidityTurnover1h === null ||
      metrics.liquidityTurnover1h < 10 ||
      metrics.avgTradeSizeUsd1h === null ||
      metrics.avgTradeSizeUsd1h > 30
    ) {
      return null;
    }
    return {
      code: 'POSSIBLE_WASH_TRADING',
      severity: 'medium',
      title: 'Trading pattern looks automated',
      detail: `Turnover is ${metrics.liquidityTurnover1h.toFixed(1)}x liquidity on an average trade size of $${metrics.avgTradeSizeUsd1h.toFixed(0)} — consistent with bot or wash activity.`,
      evidence: { key: 'liquidityTurnover1h', value: metrics.liquidityTurnover1h },
      veto: false,
    };
  },
  ({ metrics }) => {
    if (metrics.holderCount === null || metrics.holderCount >= 100) return null;
    return {
      code: 'FEW_HOLDERS',
      severity: 'medium',
      title: 'Very few holders',
      detail: `${Math.round(metrics.holderCount)} holders in total.`,
      evidence: { key: 'holderCount', value: metrics.holderCount },
      veto: false,
    };
  },
  ({ data }) => {
    const security = data.security.status === 'ok' ? data.security.data : null;
    if (security?.metadataMutable !== true) return null;
    return {
      code: 'METADATA_MUTABLE',
      severity: 'low',
      title: 'Token metadata is mutable',
      detail: 'Name, symbol and image can still be changed by the update authority.',
      evidence: { key: 'security.metadataMutable', value: true },
      veto: false,
    };
  },
];

const SEVERITY_ORDER: Record<RiskFlag['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function evaluateRisk(ctx: RuleContext): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const rule of rules) {
    const flag = rule(ctx);
    if (flag) flags.push(flag);
  }
  return flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/**
 * Categories we could not evaluate at all. Surfaced verbatim in the UI so the
 * user knows the difference between "checked and clean" and "could not check"
 * (spec §4, §7).
 */
export function unavailableChecks(data: CollectedData): string[] {
  const gaps: string[] = [];
  if (data.market.status !== 'ok') gaps.push('Market data unavailable.');
  if (data.security.status !== 'ok') gaps.push('Security and developer analysis unavailable.');
  if (data.holders.status !== 'ok') gaps.push('Holder distribution unavailable.');
  if (data.wallets.status !== 'ok') gaps.push('Wallet activity unavailable.');
  if (data.social.status !== 'ok') gaps.push('Social momentum unavailable.');
  return gaps;
}
