import { validateSolanaAddress, QUOTE_MINTS } from '@/lib/chains/solana';

/**
 * Pulls the first plausible mint out of free text.
 *
 * Lives here rather than in the webhook route because a route module may only
 * export route handlers — Next rejects the build otherwise — and because this
 * is the one piece of the bot worth testing on its own: people paste addresses
 * surrounded by prose, links and emoji, and a quote asset in the middle of a
 * message must never be treated as the subject.
 */
export function extractAddress(text: string): string | null {
  const candidates = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
  if (!candidates) return null;

  for (const candidate of candidates) {
    const validation = validateSolanaAddress(candidate);
    if (validation.valid && !QUOTE_MINTS.has(validation.address)) return validation.address;
  }

  return null;
}
