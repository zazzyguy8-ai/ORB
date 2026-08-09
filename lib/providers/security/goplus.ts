import { cached } from '@/lib/cache/memory';
import { env } from '@/lib/config/env';
import { fetchJson, runProvider, toFlag, toNumber } from '@/lib/providers/http';
import type { ProviderContext, SecurityDataProvider } from '@/lib/providers/types';
import type { ProviderResult, SecurityData } from '@/lib/types/domain';

/**
 * GoPlus Solana token security. Free without credentials at roughly 30 req/min;
 * an app key raises that. Security posture barely changes minute to minute, so
 * this is cached far longer than market data.
 */
const BASE = 'https://api.gopluslabs.io/api/v1/solana/token_security';
const CACHE_TTL_MS = 300_000;

interface GpHolder {
  account?: string;
  balance?: string;
  percent?: string;
  is_locked?: number | string;
  tag?: string;
}

interface GpToken {
  metadata?: { mutable?: boolean | string; name?: string; symbol?: string };
  mintable?: { status?: string | boolean; authority?: unknown[] };
  freezable?: { status?: string | boolean; authority?: unknown[] };
  closable?: { status?: string | boolean };
  transfer_fee?: unknown;
  transfer_fee_upgradable?: { status?: string | boolean };
  transfer_hook?: unknown[];
  transfer_hook_upgradable?: { status?: string | boolean };
  holder_count?: string | number;
  total_supply?: string | number;
  holders?: GpHolder[];
  lp_holders?: GpHolder[];
  creators?: { address?: string }[];
  balance_mutable_authority?: { status?: string | boolean };
}

interface GpResponse {
  code?: number;
  message?: string;
  result?: Record<string, GpToken>;
}

export type { GpToken };

/**
 * One cached fetch shared by the security and holder providers — GoPlus returns
 * both concerns in a single document, and calling it twice would spend our
 * scarce rate-limit budget for nothing.
 */
export function fetchGoPlusToken(address: string, timeoutMs: number): Promise<GpToken | null> {
  return cached(`gp-raw:${address}`, CACHE_TTL_MS, async () => {
    const res = await fetchJson<GpResponse>(
      `${BASE}?contract_addresses=${encodeURIComponent(address)}`,
      {
        timeoutMs,
        headers: env.goplusAppKey ? { 'X-App-Key': env.goplusAppKey } : undefined,
      },
    );
    return res.result?.[address] ?? res.result?.[address.toLowerCase()] ?? null;
  });
}

/** GoPlus mixes "1"/"0" strings, booleans and absent fields for the same concept. */
function status(value: unknown): boolean | null {
  const flag = toFlag(value);
  if (flag !== null) return flag;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function transferFeeBps(raw: unknown): number | null {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const pct = toNumber(obj.fee_rate ?? obj.current_fee_rate);
    if (pct !== null) return Math.round(pct * 10_000);
  }
  return null;
}

export function mapGoPlus(token: GpToken | null): SecurityData | null {
  if (!token) return null;

  const lpHolders = token.lp_holders ?? [];
  // Burned LP shows up as a burn address or an explicitly locked entry; both count.
  const lockedPct = lpHolders.reduce((sum, h) => {
    const pct = toNumber(h.percent) ?? 0;
    const locked = toFlag(h.is_locked) === true;
    const burned = (h.tag ?? '').toLowerCase().includes('burn');
    return locked || burned ? sum + pct : sum;
  }, 0);

  const creator = token.creators?.[0]?.address ?? null;
  const creatorHolding = creator
    ? (token.holders ?? []).find((h) => h.account === creator)
    : undefined;

  const hooks = token.transfer_hook ?? [];

  return {
    mintAuthorityEnabled: status(token.mintable?.status),
    freezeAuthorityEnabled: status(token.freezable?.status),
    metadataMutable: status(token.metadata?.mutable),
    transferFeeBps: transferFeeBps(token.transfer_fee),
    transferHookPresent: hooks.length > 0 ? true : hooks.length === 0 ? false : null,
    lpLockedOrBurnedPct: lpHolders.length > 0 ? Math.min(1, lockedPct) : null,
    creatorAddress: creator,
    creatorBalancePct: creatorHolding ? toNumber(creatorHolding.percent) : null,
    isToken2022: null,
    providerFlaggedScam: status(token.closable?.status),
  };
}

export class GoPlusSecurityProvider implements SecurityDataProvider {
  readonly name = 'goplus';
  readonly available = true;

  async getSecurityData(ctx: ProviderContext): Promise<ProviderResult<SecurityData>> {
    return runProvider(this.name, async () =>
      mapGoPlus(await fetchGoPlusToken(ctx.address, ctx.timeoutMs)),
    );
  }
}
