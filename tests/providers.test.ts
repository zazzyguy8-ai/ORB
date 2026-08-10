import { describe, expect, it } from 'vitest';
import dexscreenerFixture from './fixtures/dexscreener.json';
import goplusFixture from './fixtures/goplus.json';
import { mapDexScreener, mapTokenProfile, selectPrimaryPair } from '@/lib/providers/market/dexscreener';
import { mapGoPlus } from '@/lib/providers/security/goplus';
import { mapGoPlusHolders } from '@/lib/providers/holders/composite';
import { computeConcentration } from '@/lib/providers/holders/solana-rpc';
import { mapHeliusTransactions } from '@/lib/providers/wallets/helius';
import { validateSolanaAddress } from '@/lib/chains/solana';

const MINT = 'Fixture1111111111111111111111111111111111111';
const GP_TOKEN = (goplusFixture as any).result[MINT];

describe('address validation', () => {
  it('accepts a real mint address', () => {
    expect(validateSolanaAddress('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263').valid).toBe(true);
  });

  it('rejects EVM addresses with a useful message', () => {
    const result = validateSolanaAddress('0x6b175474e89094c44da98b954eedeac495271d0f');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('EVM');
  });

  it('rejects base58-shaped strings that do not decode to 32 bytes', () => {
    // Valid base58 characters, right length band, wrong byte length.
    expect(validateSolanaAddress('1111111111111111111111111111111111').valid).toBe(false);
  });

  it('rejects non-base58 characters', () => {
    expect(validateSolanaAddress('0OIl00000000000000000000000000000000').valid).toBe(false);
  });

  it('rejects empty and short input', () => {
    expect(validateSolanaAddress('').valid).toBe(false);
    expect(validateSolanaAddress('abc').valid).toBe(false);
  });
});

describe('dexscreener mapping', () => {
  it('picks the deepest-liquidity Solana pair, not the first one', () => {
    const pair = selectPrimaryPair((dexscreenerFixture as any).pairs, MINT);
    expect(pair?.pairAddress).toBe('PAIRdeep111111111111111111111111111111111111');
  });

  it('maps the primary pair and aggregates liquidity across Solana pairs only', () => {
    const market = mapDexScreener(dexscreenerFixture as any, MINT);
    expect(market).not.toBeNull();
    expect(market!.symbol).toBe('FIX');
    expect(market!.liquidityUsd).toBe(62000);
    // 62000 + 8000; the ethereum pair's $5M must not leak in.
    expect(market!.totalLiquidityUsd).toBe(70000);
    expect(market!.pairCount).toBe(2);
    expect(market!.txns.h1).toEqual({ buys: 320, sells: 198 });
    expect(market!.priceUsd).toBeCloseTo(0.0000415, 10);
  });

  it('returns null when no pair exists', () => {
    expect(mapDexScreener({ pairs: [] }, MINT)).toBeNull();
    expect(mapDexScreener({ pairs: null }, MINT)).toBeNull();
  });
});

describe('goplus mapping', () => {
  it('reads authorities, creator and LP lock share', () => {
    const security = mapGoPlus(GP_TOKEN)!;
    expect(security.mintAuthorityEnabled).toBe(false);
    expect(security.freezeAuthorityEnabled).toBe(false);
    expect(security.metadataMutable).toBe(true);
    expect(security.lpLockedOrBurnedPct).toBeCloseTo(0.97, 5);
    expect(security.creatorAddress).toBe('CreatorWa11et11111111111111111111111111111111');
    expect(security.creatorBalancePct).toBeCloseTo(0.021, 5);
  });

  it('returns null rather than an empty object for an unknown token', () => {
    expect(mapGoPlus(null)).toBeNull();
  });

  it('extracts holder count and concentration', () => {
    const holders = mapGoPlusHolders(GP_TOKEN)!;
    expect(holders.holderCount).toBe(1840);
    expect(holders.largestHolderPct).toBeCloseTo(0.058, 5);
    expect(holders.top10Pct).toBeCloseTo(0.11, 5);
  });
});

describe('holder concentration', () => {
  it('sums the largest holders and caps at 100%', () => {
    const holders = Array.from({ length: 25 }, (_, i) => ({ address: `w${i}`, pct: 0.05 }));
    const result = computeConcentration(holders);
    expect(result.top10Pct).toBeCloseTo(0.5, 5);
    expect(result.top20Pct).toBeCloseTo(1.0, 5);
    expect(result.largestHolderPct).toBeCloseTo(0.05, 5);
  });

  it('reports nulls with no holders', () => {
    expect(computeConcentration([]).top10Pct).toBeNull();
  });
});

describe('helius large-wallet flow', () => {
  const now = 1_760_000_000_000;
  const tx = (over: Record<string, unknown>) => ({
    signature: 'sig',
    timestamp: now / 1000 - 60,
    type: 'SWAP',
    feePayer: 'WalletA',
    tokenTransfers: [{ mint: MINT, toUserAccount: 'WalletA', tokenAmount: 100_000 }],
    ...over,
  });

  it('classifies buys and sells by fee payer and nets the flow', () => {
    const data = mapHeliusTransactions(
      [
        tx({}),
        tx({
          signature: 'sig2',
          feePayer: 'WalletB',
          tokenTransfers: [{ mint: MINT, fromUserAccount: 'WalletB', tokenAmount: 40_000 }],
        }),
      ],
      { mint: MINT, priceUsd: 0.05, nowMs: now, thresholdUsd: 1000 },
    )!;

    expect(data.uniqueBuyers).toBe(1);
    expect(data.uniqueSellers).toBe(1);
    expect(data.netFlowUsd).toBeCloseTo(100_000 * 0.05 - 40_000 * 0.05, 5);
    // The MVP never claims to know wallet quality.
    expect(data.qualityScoredWallets).toBeNull();
  });

  it('drops trades below the USD threshold', () => {
    const data = mapHeliusTransactions([tx({ tokenTransfers: [{ mint: MINT, toUserAccount: 'WalletA', tokenAmount: 1 }] })], {
      mint: MINT,
      priceUsd: 0.05,
      nowMs: now,
      thresholdUsd: 1000,
    })!;
    expect(data.events).toHaveLength(0);
    expect(data.netFlowUsd).toBe(0);
  });

  it('ignores transactions outside the window', () => {
    const stale = tx({ timestamp: now / 1000 - 7200 });
    expect(
      mapHeliusTransactions([stale], { mint: MINT, priceUsd: 0.05, nowMs: now, thresholdUsd: 1000 }),
    ).toBeNull();
  });

  it('reports unavailable rather than guessing when no price is known', () => {
    expect(
      mapHeliusTransactions([tx({})], { mint: MINT, priceUsd: null, nowMs: now, thresholdUsd: 1000 }),
    ).toBeNull();
  });
});

describe('token profile', () => {
  it('maps logo, websites and socials', () => {
    const profile = mapTokenProfile({
      imageUrl: 'https://cdn.example/logo.png',
      websites: [{ label: 'Site', url: 'https://example.com' }],
      socials: [{ type: 'Twitter', url: 'https://x.com/example' }],
    })!;
    expect(profile.imageUrl).toBe('https://cdn.example/logo.png');
    expect(profile.websites).toEqual([{ label: 'Site', url: 'https://example.com' }]);
    expect(profile.socials[0].type).toBe('twitter');
  });

  it('drops anything that is not https — these URLs are third-party and get rendered', () => {
    const profile = mapTokenProfile({
      imageUrl: 'javascript:alert(1)',
      websites: [
        { label: 'Bad', url: 'javascript:alert(1)' },
        { label: 'Insecure', url: 'http://example.com' },
        { label: 'Good', url: 'https://example.com' },
      ],
      socials: [{ type: 'x', url: 'data:text/html,<script>' }],
    })!;
    expect(profile.imageUrl).toBeNull();
    expect(profile.websites).toEqual([{ label: 'Good', url: 'https://example.com' }]);
    expect(profile.socials).toEqual([]);
  });

  it('caps the number of links so a hostile payload cannot flood the UI', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      label: `L${i}`,
      url: `https://example.com/${i}`,
    }));
    const profile = mapTokenProfile({ websites: many, socials: many.map((m) => ({ type: 't', url: m.url })) })!;
    expect(profile.websites).toHaveLength(4);
    expect(profile.socials).toHaveLength(4);
  });

  it('returns null when there is nothing to show, rather than an empty shell', () => {
    expect(mapTokenProfile(undefined)).toBeNull();
    expect(mapTokenProfile({})).toBeNull();
    expect(mapTokenProfile({ websites: [], socials: [] })).toBeNull();
  });

  it('is wired into the market mapping', () => {
    const fixture = JSON.parse(JSON.stringify(dexscreenerFixture));
    fixture.pairs[1].info = { imageUrl: 'https://cdn.example/fix.png' };
    expect(mapDexScreener(fixture, MINT)!.profile!.imageUrl).toBe('https://cdn.example/fix.png');
    // Fixture without `info` must not invent a profile.
    expect(mapDexScreener(dexscreenerFixture as any, MINT)!.profile).toBeNull();
  });
});
