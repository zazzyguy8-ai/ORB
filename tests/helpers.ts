import type {
  CollectedData,
  HolderData,
  MarketData,
  ProviderResult,
  SecurityData,
  WalletData,
} from '@/lib/types/domain';

export const NOW = 1_760_000_000_000;

export function ok<T>(data: T): ProviderResult<T> {
  return { status: 'ok', data, source: 'test', latencyMs: 1 };
}

export function missing<T>(): ProviderResult<T> {
  return { status: 'unavailable', reason: 'test', source: 'test', latencyMs: 0 };
}

export function marketData(over: Partial<MarketData> = {}): MarketData {
  return {
    chain: 'solana',
    tokenAddress: 'Fixture1111111111111111111111111111111111111',
    profile: null,
    pairAddress: 'PAIR',
    dex: 'raydium',
    name: 'Fixture Coin',
    symbol: 'FIX',
    priceUsd: 0.0000415,
    marketCapUsd: 415_000,
    fdvUsd: 415_000,
    liquidityUsd: 62_000,
    pairCreatedAtMs: NOW - 6 * 60 * 60 * 1000,
    volumeUsd: { m5: 4_800, h1: 24_000, h6: 96_000, h24: 300_000 },
    priceChangePct: { m5: 2.4, h1: 6.5, h6: 14.2, h24: 31 },
    txns: {
      m5: { buys: 40, sells: 22 },
      h1: { buys: 320, sells: 198 },
      h6: { buys: 1200, sells: 950 },
      h24: { buys: 4100, sells: 3600 },
    },
    pairCount: 2,
    totalLiquidityUsd: 70_000,
    ...over,
  };
}

export function securityData(over: Partial<SecurityData> = {}): SecurityData {
  return {
    mintAuthorityEnabled: false,
    freezeAuthorityEnabled: false,
    metadataMutable: false,
    transferFeeBps: 0,
    transferHookPresent: false,
    lpLockedOrBurnedPct: 0.97,
    creatorAddress: 'Creator',
    creatorBalancePct: 0.01,
    isToken2022: false,
    providerFlaggedScam: false,
    ...over,
  };
}

export function holderData(over: Partial<HolderData> = {}): HolderData {
  return {
    holderCount: 1840,
    top10Pct: 0.18,
    top20Pct: 0.26,
    largestHolderPct: 0.045,
    topHolders: [],
    poolAccountsExcluded: true,
    ...over,
  };
}

export function walletData(over: Partial<WalletData> = {}): WalletData {
  return {
    windowMinutes: 30,
    events: [],
    uniqueBuyers: 6,
    uniqueSellers: 2,
    netFlowUsd: 4_000,
    largeTradeThresholdUsd: 1000,
    qualityScoredWallets: null,
    ...over,
  };
}

export function collected(over: Partial<CollectedData> = {}): CollectedData {
  return {
    market: ok(marketData()),
    security: ok(securityData()),
    holders: ok(holderData()),
    wallets: ok(walletData()),
    social: missing(),
    ...over,
  };
}
