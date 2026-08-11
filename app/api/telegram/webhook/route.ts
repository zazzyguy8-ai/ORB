import { NextResponse } from 'next/server';
import { extractAddress } from '@/lib/alerts/parse';
import { sendMessage } from '@/lib/alerts/telegram';
import { env } from '@/lib/config/env';
import { siteUrl } from '@/lib/config/site';
import { persistAnalysis } from '@/lib/db/repo';
import { runAnalysis } from '@/lib/pipeline/analyze';
import { checkIpLimit } from '@/lib/ratelimit/limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The bot's inbound half: send it a contract address, get the verdict back.
 *
 * This is the same pipeline the website runs, reached from the place people are
 * already discussing the token. No new analysis logic lives here — if it did,
 * the bot and the site could disagree about the same coin, and then neither
 * could be trusted.
 *
 * Security posture, because this endpoint runs expensive work on request:
 *
 *   - It refuses everything unless TELEGRAM_WEBHOOK_SECRET is set and the
 *     header Telegram echoes back matches it. Unset means the endpoint is off,
 *     not open.
 *   - Every chat is rate limited on the same daily counter as an anonymous web
 *     visitor. A chat id is a much better key than an IP here.
 *   - It always answers 200. Telegram retries non-2xx responses, and a retry
 *     storm on a failing analysis would multiply the load rather than reduce it.
 */

/** Longest message we will scan for an address; anything larger is not a request. */
const MAX_TEXT = 4_096;

const HELP = [
  'Send me a Solana contract address and I will analyse it.',
  '',
  'You get BUY, WATCH or AVOID with the evidence behind it — liquidity, holder',
  'concentration, contract authorities and momentum. Every call is recorded and',
  'published, so you can check how the previous ones turned out.',
  '',
  'I am read-only. I will never ask you to connect a wallet, sign anything, or',
  'share a seed phrase — and nobody legitimate ever will.',
].join('\n');

export async function POST(request: Request) {
  // No secret configured means the bot is not deployed. Silence, not an error
  // page that tells a prober what is here.
  if (!env.telegramWebhookSecret || !env.telegramBotToken) {
    return NextResponse.json({ ok: true });
  }

  if (
    request.headers.get('x-telegram-bot-api-secret-token') !== env.telegramWebhookSecret
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update?.message ?? update?.channel_post;
  const chatId = message?.chat?.id;
  const text: string = typeof message?.text === 'string' ? message.text.slice(0, MAX_TEXT) : '';
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const chat = String(chatId);

  if (text.startsWith('/start') || text.startsWith('/help')) {
    await sendMessage(chat, HELP);
    return NextResponse.json({ ok: true });
  }

  const address = extractAddress(text);
  if (!address) {
    // Only answer when spoken to directly. A bot in a group that replies to
    // every message it does not understand gets removed from the group.
    if (message?.chat?.type === 'private') {
      await sendMessage(chat, 'That does not look like a Solana contract address. Send /help.');
    }
    return NextResponse.json({ ok: true });
  }

  const limit = checkIpLimit(`tg:${chat}`, env.anonAnalysesPerDay);
  if (!limit.allowed) {
    await sendMessage(chat, `${limit.reason} Full analyses are always available at ${siteUrl()}/app`);
    return NextResponse.json({ ok: true });
  }

  try {
    const { result, collected } = await runAnalysis(address);

    if (result.availability.market !== 'ok') {
      await sendMessage(
        chat,
        'No tradeable pair found for that address. It may be too new, not listed, or not a Solana token.',
      );
      return NextResponse.json({ ok: true });
    }

    const analysisId = await persistAnalysis(result, { userId: null, data: collected });
    const name = result.symbol ? `$${result.symbol}` : `${address.slice(0, 6)}…`;

    const lines = [
      `${result.decision} · ${name} · ${result.score.total.toFixed(0)}/100 (confidence ${result.confidence})`,
      '',
      ...result.explanation.reasons.map((reason) => `• ${reason}`),
    ];

    if (result.explanation.riskNotes.length > 0) {
      lines.push('', 'Risk:', ...result.explanation.riskNotes.map((note) => `• ${note}`));
    }

    if (analysisId) lines.push('', `${siteUrl()}/a/${analysisId}`);
    lines.push('', 'Not advice. Memecoins routinely go to zero.');

    await sendMessage(chat, lines.join('\n'));
  } catch {
    await sendMessage(chat, 'That analysis failed. Try again in a moment.');
  }

  return NextResponse.json({ ok: true });
}
