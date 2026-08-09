import { cached } from '@/lib/cache/memory';
import { env } from '@/lib/config/env';
import { fetchJson, runProvider, toNumber } from '@/lib/providers/http';
import type { ProviderContext, WalletDataProvider } from '@/lib/providers/types';
import type { ProviderResult, WalletData, WalletEvent } from '@/lib/types/domain';

/**
 * Large-wallet flow from Helius parsed transactions.
 *
 * IMPORTANT — this is NOT "smart money" (spec §6). We can measure that a wallet
 * moved a large amount of USD in the last N minutes; we cannot, from this data,
 * measure whether that wallet has historically been right. Everything produced
 * here is labelled "large wallet", the criterion is recorded on each event, and
 * WalletData.qualityScoredWallets stays null until a provider can supply
 * verified historical wallet performance.
 */
const CACHE_TTL_MS = 30_000;
const WINDOW_MINUTES = 30;
const DEFAULT_LARGE_TRADE_USD = 1_000;
const MAX_TX = 100;

interface HeliusTokenTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  tokenAmount?: number | string;
  mint?: string;
}

interface HeliusTx {
  signature?: string;
  timestamp?: number;
  type?: string;
  feePayer?: string;
  tokenTransfers?: HeliusTokenTransfer[];
}

export function mapHeliusTransactions(
  txs: HeliusTx[],
  opts: { mint: string; priceUsd: number | null; nowMs: number; thresholdUsd: number },
): WalletData | null {
  if (!Array.isArray(txs) || txs.length === 0) return null;

  const cutoffSec = (opts.nowMs - WINDOW_MINUTES * 60_000) / 1000;
  const events: WalletEvent[] = [];
  const buyers = new Set<string>();
  const sellers = new Set<string>();
  let netFlowUsd = 0;
  let sawPricedTrade = false;

  for (const tx of txs) {
    const ts = toNumber(tx.timestamp);
    if (ts === null || ts < cutoffSec) continue;
    if (tx.type && tx.type !== 'SWAP') continue;

    const trader = tx.feePayer;
    if (!trader) continue;

    for (const transfer of tx.tokenTransfers ?? []) {
      if (transfer.mint !== opts.mint) continue;

      const amount = toNumber(transfer.tokenAmount);
      if (amount === null || amount <= 0) continue;

      const side =
        transfer.toUserAccount === trader
          ? 'buy'
          : transfer.fromUserAccount === trader
            ? 'sell'
            : null;
      if (!side) continue;

      const amountUsd = opts.priceUsd !== null ? amount * opts.priceUsd : null;
      if (amountUsd !== null) {
        sawPricedTrade = true;
        if (amountUsd < opts.thresholdUsd) continue;
        netFlowUsd += side === 'buy' ? amountUsd : -amountUsd;
      } else {
        // Without a price we cannot apply a USD threshold, so we cannot honestly
        // call anything "large". Skip rather than guess.
        continue;
      }

      (side === 'buy' ? buyers : sellers).add(trader);
      events.push({
        wallet: trader,
        side,
        amountUsd,
        occurredAtMs: ts * 1000,
        txSignature: tx.signature ?? null,
        criterion: 'large_trade_usd',
      });
    }
  }

  if (!sawPricedTrade) return null;

  return {
    windowMinutes: WINDOW_MINUTES,
    events: events.sort((a, b) => b.occurredAtMs - a.occurredAtMs).slice(0, 50),
    uniqueBuyers: buyers.size,
    uniqueSellers: sellers.size,
    netFlowUsd,
    largeTradeThresholdUsd: opts.thresholdUsd,
    qualityScoredWallets: null,
  };
}

export class HeliusWalletDataProvider implements WalletDataProvider {
  readonly name = 'helius-large-flow';
  readonly available = true;

  constructor(private readonly apiKey: string) {}

  async getWalletData(ctx: ProviderContext): Promise<ProviderResult<WalletData>> {
    const priceUsd = ctx.hint?.priceUsd ?? null;

    return runProvider(this.name, () =>
      cached(`helius:${ctx.address}:${priceUsd ?? 'nopx'}`, CACHE_TTL_MS, async () => {
        const url =
          `https://api.helius.xyz/v0/addresses/${ctx.address}/transactions` +
          `?api-key=${encodeURIComponent(this.apiKey)}&type=SWAP&limit=${MAX_TX}`;
        const txs = await fetchJson<HeliusTx[]>(url, { timeoutMs: ctx.timeoutMs });
        return mapHeliusTransactions(txs, {
          mint: ctx.address,
          priceUsd,
          nowMs: Date.now(),
          thresholdUsd: DEFAULT_LARGE_TRADE_USD,
        });
      }),
    );
  }
}

export function createWalletProvider(): WalletDataProvider | null {
  return env.heliusApiKey ? new HeliusWalletDataProvider(env.heliusApiKey) : null;
}
