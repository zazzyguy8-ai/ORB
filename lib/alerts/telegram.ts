import { env } from '@/lib/config/env';

/**
 * Telegram alerts (spec §20) — the delivery half only.
 *
 * Scope decision: sending a message is genuinely straightforward, so it ships.
 * Watchlists, subscription management and the event loop that decides *when* an
 * alert is warranted are not in the MVP scope list (§24) and are not built.
 * What exists here is the seam: an AlertEvent vocabulary and a transport, so
 * wiring a watchlist later means adding a scheduler, not refactoring anything.
 */

export type AlertKind =
  | 'decision_changed'
  | 'liquidity_dropped'
  | 'large_wallet_entries'
  | 'significant_move';

export interface AlertEvent {
  kind: AlertKind;
  symbol: string;
  address: string;
  message: string;
}

export interface AlertTransport {
  readonly available: boolean;
  send(chatId: string, event: AlertEvent): Promise<boolean>;
}

export class TelegramTransport implements AlertTransport {
  get available(): boolean {
    return Boolean(env.telegramBotToken);
  }

  async send(chatId: string, event: AlertEvent): Promise<boolean> {
    if (!env.telegramBotToken) return false;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `${event.symbol}: ${event.message}`,
            disable_web_page_preview: true,
          }),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export function formatDecisionChange(
  symbol: string,
  from: string,
  to: string,
): AlertEvent['message'] {
  return `AI classification changed ${from} → ${to}.`;
}
