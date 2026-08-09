import { runProvider, toNumber } from '@/lib/providers/http';
import { computeConcentration, SolanaRpcHolderProvider } from '@/lib/providers/holders/solana-rpc';
import { fetchGoPlusToken, type GpToken } from '@/lib/providers/security/goplus';
import type { HolderDataProvider, ProviderContext } from '@/lib/providers/types';
import type { HolderAccount, HolderData, ProviderResult } from '@/lib/types/domain';

/**
 * Holder view assembled from two sources, because neither alone is complete:
 *   - Solana RPC gives trustworthy top-20 balances but no holder count.
 *   - GoPlus gives a holder count and its own top-holder list.
 * Both are already cached and both are fetched concurrently, so the composite
 * costs no more wall-clock time than the slower of the two.
 */
export function mapGoPlusHolders(token: GpToken | null): Partial<HolderData> | null {
  if (!token) return null;

  const holderCount = toNumber(token.holder_count);
  const holders: HolderAccount[] = (token.holders ?? [])
    .map((h) => ({ address: h.account ?? '', pct: toNumber(h.percent) ?? 0 }))
    .filter((h) => h.address !== '' && h.pct > 0);

  if (holderCount === null && holders.length === 0) return null;
  return { holderCount, topHolders: holders, ...computeConcentration(holders) };
}

export class CompositeHolderProvider implements HolderDataProvider {
  readonly name = 'solana-rpc+goplus';
  readonly available = true;

  private readonly rpc = new SolanaRpcHolderProvider();

  async getHolderData(ctx: ProviderContext): Promise<ProviderResult<HolderData>> {
    return runProvider(this.name, async () => {
      const [rpcResult, goplusToken] = await Promise.all([
        this.rpc.getHolderData(ctx),
        fetchGoPlusToken(ctx.address, ctx.timeoutMs).catch(() => null),
      ]);

      const chain = rpcResult.status === 'ok' ? rpcResult.data : null;
      const goplus = mapGoPlusHolders(goplusToken);

      if (!chain && !goplus) return null;

      // On-chain balances win for concentration; GoPlus only fills gaps. Its
      // percentages are derived from an indexer snapshot that can lag.
      return {
        holderCount: chain?.holderCount ?? goplus?.holderCount ?? null,
        top10Pct: chain?.top10Pct ?? goplus?.top10Pct ?? null,
        top20Pct: chain?.top20Pct ?? goplus?.top20Pct ?? null,
        largestHolderPct: chain?.largestHolderPct ?? goplus?.largestHolderPct ?? null,
        topHolders: chain?.topHolders ?? goplus?.topHolders ?? [],
        poolAccountsExcluded: chain?.poolAccountsExcluded ?? false,
      } satisfies HolderData;
    });
  }
}
