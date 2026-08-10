import { cached } from '@/lib/cache/memory';
import { fetchJson, runProvider, toNumber } from '@/lib/providers/http';
import type { MarketDataProvider, ProviderContext } from '@/lib/providers/types';
import type { MarketData, ProviderResult, TokenProfile } from '@/lib/types/domain';

/**
 * DexScreener token endpoint. No credentials; documented at ~300 req/min for the
 * token/pair routes. It is the fastest single source that carries price,
 * liquidity, volume, per-window txn counts and pair creation time together,
 * which is why the whole market category rests on one call.
 */
const BASE = 'https://api.dexscreener.com/latest/dex/tokens';
const CACHE_TTL_MS = 15_000;

/** Raw shapes, kept loose — DexScreener adds fields without notice. */
interface DsPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  liquidity?: { usd?: number };
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  txns?: Record<string, { buys?: number; sells?: number }>;
  info?: {
    imageUrl?: string;
    header?: string;
    websites?: { label?: string; url?: string }[];
    socials?: { type?: string; url?: string }[];
  };
}

interface DsResponse {
  pairs?: DsPair[] | null;
}

function window(pair: DsPair, key: string) {
  const t = pair.txns?.[key];
  return { buys: toNumber(t?.buys), sells: toNumber(t?.sells) };
}

/** Only https URLs are kept — a link we render must not be a javascript: payload. */
function safeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function mapTokenProfile(info: DsPair['info']): TokenProfile | null {
  if (!info) return null;

  const profile: TokenProfile = {
    imageUrl: safeUrl(info.imageUrl),
    headerUrl: safeUrl(info.header),
    websites: (info.websites ?? [])
      .map((w) => ({ label: w.label?.trim() || 'Website', url: safeUrl(w.url) }))
      .filter((w): w is { label: string; url: string } => w.url !== null)
      .slice(0, 4),
    socials: (info.socials ?? [])
      .map((s) => ({ type: s.type?.trim().toLowerCase() || 'link', url: safeUrl(s.url) }))
      .filter((s): s is { type: string; url: string } => s.url !== null)
      .slice(0, 4),
  };

  const empty =
    !profile.imageUrl &&
    !profile.headerUrl &&
    profile.websites.length === 0 &&
    profile.socials.length === 0;

  return empty ? null : profile;
}

/**
 * Picks the pair the trader actually cares about: deepest USD liquidity.
 * Volume would be gameable by a wash-traded shell pair; liquidity is the pool
 * a real order would route through.
 */
export function selectPrimaryPair(pairs: DsPair[], tokenAddress: string): DsPair | null {
  const onChain = pairs.filter(
    (p) =>
      p.chainId === 'solana' &&
      p.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase(),
  );
  const candidates = onChain.length > 0 ? onChain : pairs.filter((p) => p.chainId === 'solana');
  if (candidates.length === 0) return null;

  return candidates.reduce((best, p) =>
    (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best,
  );
}

export function mapDexScreener(res: DsResponse, tokenAddress: string): MarketData | null {
  const pairs = res.pairs ?? [];
  const primary = selectPrimaryPair(pairs, tokenAddress);
  if (!primary) return null;

  const solanaPairs = pairs.filter((p) => p.chainId === 'solana');
  const totalLiquidityUsd = solanaPairs.reduce((sum, p) => sum + (p.liquidity?.usd ?? 0), 0);

  return {
    chain: 'solana',
    tokenAddress,
    profile: mapTokenProfile(primary.info),
    pairAddress: primary.pairAddress ?? null,
    dex: primary.dexId ?? null,
    name: primary.baseToken?.name ?? null,
    symbol: primary.baseToken?.symbol ?? null,
    priceUsd: toNumber(primary.priceUsd),
    marketCapUsd: toNumber(primary.marketCap),
    fdvUsd: toNumber(primary.fdv),
    liquidityUsd: toNumber(primary.liquidity?.usd),
    pairCreatedAtMs: toNumber(primary.pairCreatedAt),
    volumeUsd: {
      m5: toNumber(primary.volume?.m5),
      h1: toNumber(primary.volume?.h1),
      h6: toNumber(primary.volume?.h6),
      h24: toNumber(primary.volume?.h24),
    },
    priceChangePct: {
      m5: toNumber(primary.priceChange?.m5),
      h1: toNumber(primary.priceChange?.h1),
      h6: toNumber(primary.priceChange?.h6),
      h24: toNumber(primary.priceChange?.h24),
    },
    txns: {
      m5: window(primary, 'm5'),
      h1: window(primary, 'h1'),
      h6: window(primary, 'h6'),
      h24: window(primary, 'h24'),
    },
    pairCount: solanaPairs.length || null,
    totalLiquidityUsd: totalLiquidityUsd > 0 ? totalLiquidityUsd : null,
  };
}

export class DexScreenerProvider implements MarketDataProvider {
  readonly name = 'dexscreener';
  readonly available = true;

  async getMarketData(ctx: ProviderContext): Promise<ProviderResult<MarketData>> {
    return runProvider(this.name, () =>
      cached(`ds:${ctx.address}`, CACHE_TTL_MS, async () => {
        const res = await fetchJson<DsResponse>(`${BASE}/${ctx.address}`, {
          timeoutMs: ctx.timeoutMs,
        });
        return mapDexScreener(res, ctx.address);
      }),
    );
  }
}
