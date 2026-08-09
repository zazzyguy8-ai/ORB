import { cached } from '@/lib/cache/memory';
import { env } from '@/lib/config/env';
import { fetchJson, runProvider, toNumber } from '@/lib/providers/http';
import type { HolderDataProvider, ProviderContext } from '@/lib/providers/types';
import type { HolderAccount, HolderData, ProviderResult } from '@/lib/types/domain';

/**
 * Holder concentration from the chain itself.
 *
 * `getTokenLargestAccounts` gives the top 20 *token accounts*, which is exactly
 * the top-10/top-20 concentration the spec asks for — but the AMM's pool vault
 * is a token account too, and counting it as a "holder" would flag every healthy
 * token as dangerously concentrated. We resolve each account's owner and drop
 * the ones owned by known AMM authorities before computing percentages.
 *
 * Two round trips, both inside the provider deadline. Holder count is not
 * available from RPC at any reasonable cost, so it stays null here and is
 * filled from GoPlus by the composite provider when present.
 */
const CACHE_TTL_MS = 60_000;

/** Owners whose token accounts are pools/vaults rather than real holders. */
const POOL_AUTHORITIES = new Set([
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium AMM v4 authority
  'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ', // Raydium staking/CLMM authority
  'DWpvfqzGWuVy9jVSKSShdM2733nrEsnnhsUStYbkj6Nn', // Raydium CPMM authority
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // Serum/OpenBook vault signer family
  '3uaZBfHPfmpAHW7dsimC1SnyR61X4bJqQZKWmRSCXJxv', // Meteora pool authority
  '5unTfT2kssBuNvHPY6LbJfJpLqEcdMxGYLWHwShaeTLi', // Meteora DLMM authority
]);

interface RpcResponse<T> {
  result?: T;
  error?: { message?: string };
}

interface LargestAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
}

interface ParsedTokenAccount {
  data?: { parsed?: { info?: { owner?: string; tokenAmount?: { amount?: string } } } };
}

async function rpcBatch<T>(calls: { method: string; params: unknown[] }[], timeoutMs: number) {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c.method, params: c.params }));
  const res = await fetchJson<(RpcResponse<T> & { id: number })[]>(env.solanaRpcUrl, {
    method: 'POST',
    timeoutMs,
    body,
  });
  const ordered = new Array<RpcResponse<T> | undefined>(calls.length);
  for (const item of Array.isArray(res) ? res : []) ordered[item.id] = item;
  return ordered;
}

export function computeConcentration(
  holders: HolderAccount[],
): Pick<HolderData, 'top10Pct' | 'top20Pct' | 'largestHolderPct'> {
  const sorted = [...holders].sort((a, b) => b.pct - a.pct);
  const sum = (n: number) => sorted.slice(0, n).reduce((acc, h) => acc + h.pct, 0);
  return {
    top10Pct: sorted.length > 0 ? Math.min(1, sum(10)) : null,
    top20Pct: sorted.length > 0 ? Math.min(1, sum(20)) : null,
    largestHolderPct: sorted.length > 0 ? sorted[0].pct : null,
  };
}

export class SolanaRpcHolderProvider implements HolderDataProvider {
  readonly name = 'solana-rpc';
  readonly available = true;

  async getHolderData(ctx: ProviderContext): Promise<ProviderResult<HolderData>> {
    return runProvider(this.name, () =>
      cached(`rpc-holders:${ctx.address}`, CACHE_TTL_MS, async () => {
        const deadline = Date.now() + ctx.timeoutMs;

        const [supplyRes, largestRes] = await rpcBatch<any>(
          [
            { method: 'getTokenSupply', params: [ctx.address] },
            { method: 'getTokenLargestAccounts', params: [ctx.address] },
          ],
          ctx.timeoutMs,
        );

        const totalSupplyRaw = toNumber(supplyRes?.result?.value?.amount);
        const largest: LargestAccount[] = largestRes?.result?.value ?? [];
        if (totalSupplyRaw === null || totalSupplyRaw <= 0 || largest.length === 0) return null;

        // Resolve owners so pool vaults can be excluded. If this second call
        // does not fit in the remaining budget, fall back to un-filtered data
        // and say so via poolAccountsExcluded.
        let owners = new Map<string, string>();
        const remaining = deadline - Date.now();
        if (remaining > 300) {
          try {
            const [accountsRes] = await rpcBatch<any>(
              [
                {
                  method: 'getMultipleAccounts',
                  params: [largest.map((a) => a.address), { encoding: 'jsonParsed' }],
                },
              ],
              remaining,
            );
            const values: (ParsedTokenAccount | null)[] = accountsRes?.result?.value ?? [];
            values.forEach((v, i) => {
              const owner = v?.data?.parsed?.info?.owner;
              if (owner) owners.set(largest[i].address, owner);
            });
          } catch {
            owners = new Map();
          }
        }

        const resolvedOwners = owners.size > 0;
        const holders: HolderAccount[] = [];
        for (const account of largest) {
          const raw = toNumber(account.amount);
          if (raw === null || raw <= 0) continue;
          const owner = owners.get(account.address);
          const isPool = owner ? POOL_AUTHORITIES.has(owner) : false;
          if (isPool) continue;
          holders.push({ address: owner ?? account.address, pct: raw / totalSupplyRaw, isPool });
        }

        if (holders.length === 0) return null;

        return {
          holderCount: null,
          ...computeConcentration(holders),
          topHolders: holders.slice(0, 20),
          poolAccountsExcluded: resolvedOwners,
        } satisfies HolderData;
      }),
    );
  }
}
