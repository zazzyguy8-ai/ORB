import { CompositeHolderProvider } from '@/lib/providers/holders/composite';
import { DexScreenerProvider } from '@/lib/providers/market/dexscreener';
import { GoPlusSecurityProvider } from '@/lib/providers/security/goplus';
import { NullSocialDataProvider } from '@/lib/providers/social/null';
import { createWalletProvider } from '@/lib/providers/wallets/helius';
import { NullWalletDataProvider } from '@/lib/providers/wallets/null';
import type { CryptoDataProviders } from '@/lib/providers/types';

/**
 * The only place that decides which concrete provider serves each category.
 * Swapping DexScreener for Birdeye, or wiring a real social provider, is a
 * one-line change here.
 */
let cachedProviders: CryptoDataProviders | null = null;

export function getProviders(): CryptoDataProviders {
  if (cachedProviders) return cachedProviders;

  cachedProviders = {
    market: new DexScreenerProvider(),
    security: new GoPlusSecurityProvider(),
    holders: new CompositeHolderProvider(),
    wallets: createWalletProvider() ?? new NullWalletDataProvider(),
    social: new NullSocialDataProvider(),
  };

  return cachedProviders;
}

/** Test seam. */
export function setProviders(providers: CryptoDataProviders | null): void {
  cachedProviders = providers;
}
