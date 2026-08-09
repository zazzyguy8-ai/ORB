import type {
  Chain,
  HolderData,
  MarketData,
  ProviderResult,
  SecurityData,
  SocialData,
  WalletData,
} from '@/lib/types/domain';

export interface ProviderContext {
  chain: Chain;
  address: string;
  /** Hard deadline for the call. Providers must respect it. */
  timeoutMs: number;
  /** Filled in after market data resolves, when a provider can use it. */
  hint?: { pairAddress?: string | null; priceUsd?: number | null };
}

/** Base contract: everything is swappable, nothing throws. */
export interface DataProvider {
  readonly name: string;
  readonly available: boolean;
  /** Why the provider is unavailable, surfaced to the user verbatim. */
  readonly unavailableReason?: string;
}

export interface MarketDataProvider extends DataProvider {
  getMarketData(ctx: ProviderContext): Promise<ProviderResult<MarketData>>;
}

export interface SecurityDataProvider extends DataProvider {
  getSecurityData(ctx: ProviderContext): Promise<ProviderResult<SecurityData>>;
}

export interface HolderDataProvider extends DataProvider {
  getHolderData(ctx: ProviderContext): Promise<ProviderResult<HolderData>>;
}

export interface WalletDataProvider extends DataProvider {
  getWalletData(ctx: ProviderContext): Promise<ProviderResult<WalletData>>;
}

export interface SocialDataProvider extends DataProvider {
  getSocialData(ctx: ProviderContext): Promise<ProviderResult<SocialData>>;
}

export interface CryptoDataProviders {
  market: MarketDataProvider;
  security: SecurityDataProvider;
  holders: HolderDataProvider;
  wallets: WalletDataProvider;
  social: SocialDataProvider;
}

/** Helper for providers that are wired but lack credentials. */
export function unavailable<T>(source: string, reason: string): ProviderResult<T> {
  return { status: 'unavailable', reason, source, latencyMs: 0 };
}
