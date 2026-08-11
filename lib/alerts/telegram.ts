import { env } from '@/lib/config/env';
import { siteUrl } from '@/lib/config/site';
import type { ScanHit } from '@/lib/discovery/scan';

/**
 * Telegram, both directions.
 *
 * Outbound: the scanner pushes its shortlist to a channel. Inbound: a person
 * sends the bot a contract address and gets the same verdict the website would
 * give, in the place they were already reading about the token.
 *
 * Every message is plain text with previews disabled. Markdown formatting means
 * escaping user-controlled strings — token names are user-controlled and are
 * routinely crafted to be hostile — and the escape rules are a footgun for no
 * visual gain in a message that is mostly numbers.
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

const API = 'https://api.telegram.org/bot';

/** Low-level send. Never throws — a failed notification must not fail a scan. */
export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  if (!env.telegramBotToken) return false;

  try {
    const res = await fetch(`${API}${env.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export class TelegramTransport implements AlertTransport {
  get available(): boolean {
    return Boolean(env.telegramBotToken);
  }

  async send(chatId: string, event: AlertEvent): Promise<boolean> {
    return sendMessage(chatId, `${event.symbol}: ${event.message}`);
  }
}

export function formatDecisionChange(
  symbol: string,
  from: string,
  to: string,
): AlertEvent['message'] {
  return `AI classification changed ${from} → ${to}.`;
}

// ---------------------------------------------------------------------------
// Message bodies
// ---------------------------------------------------------------------------

function usd(value: number | null): string {
  if (value === null) return 'unknown';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function age(minutes: number | null): string {
  if (minutes === null) return 'unknown age';
  if (minutes < 90) return `${Math.round(minutes)} min old`;
  if (minutes < 60 * 48) return `${(minutes / 60).toFixed(1)} h old`;
  return `${Math.round(minutes / 1440)} d old`;
}

/**
 * One scanner hit as a message.
 *
 * Pure and exported so the wording is testable. The last line is not optional
 * decoration: this arrives unsolicited in a channel where people act on
 * messages, and it has to say what it is not.
 */
export function formatScanHit(hit: ScanHit): string {
  const name = hit.symbol ? `$${hit.symbol}` : `${hit.address.slice(0, 6)}…`;
  const lines = [
    `${hit.decision} · ${name} · ${hit.score.toFixed(0)}/100`,
    '',
    `${usd(hit.marketCapUsd)} mcap · ${usd(hit.liquidityUsd)} liquidity · ${age(hit.ageMinutes)}`,
  ];

  for (const reason of hit.reasons) lines.push(`• ${reason}`);

  lines.push('', hit.address);
  if (hit.analysisId) lines.push(`${siteUrl()}/a/${hit.analysisId}`);
  lines.push('', 'Scanner output, not advice. Memecoins routinely go to zero.');

  return lines.join('\n');
}

/**
 * Publishes a shortlist to the configured channel.
 *
 * Silent when no channel is set, which is the default: a deployment should not
 * start broadcasting because someone added a bot token for the DM bot.
 */
export async function publishScanHits(hits: ScanHit[]): Promise<number> {
  const chatId = env.telegramChatId;
  if (!chatId || !env.telegramBotToken || hits.length === 0) return 0;

  let sent = 0;
  for (const hit of hits) {
    // Sequential: Telegram rate-limits a channel to roughly one message per
    // second, and a scan hitting that limit would drop the tail of the list.
    if (await sendMessage(chatId, formatScanHit(hit))) sent += 1;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }

  return sent;
}
