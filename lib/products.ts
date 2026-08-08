/**
 * CULTSCAN — the paid catalogue.
 *
 * Prices are in cents (Stripe) and micro-USDC (Solana) so no float ever
 * touches a payment path.
 *
 * Two tiers on purpose. The low one converts a trader who wants a verdict
 * before they ape. The high one converts a launcher who needs the whole
 * content arsenal on day one and does not blink at $49. Most revenue comes
 * from the second group; the first group is the top of the funnel.
 */

export type TierId = 'scan' | 'arsenal'

export interface Tier {
  id: TierId
  name: string
  tagline: string
  /** Price in euro cents, for Stripe. */
  amount: number
  currency: 'eur'
  /** Price in micro-USDC (6 decimals), for the Solana rail. */
  usdcAmount: number
  usdcDisplay: string
  includes: string[]
  /** Whether this tier unlocks the content arsenal generator. */
  arsenal: boolean
}

export const TIERS: Record<TierId, Tier> = {
  scan: {
    id: 'scan',
    name: 'CULT SCAN',
    tagline: 'Does this thing have a cult in it, or is it just a chart?',
    amount: 1900,
    currency: 'eur',
    usdcAmount: 20_000_000, // 20 USDC
    usdcDisplay: '20 USDC',
    includes: [
      'Cult Score — narrative survivability, 0–100, with the reasoning',
      'Ticker memetics: how the name behaves in a reply, a meme, a group chat',
      'The holder psychology read — who buys this and what makes them sell',
      'The fatal flaw — the specific thing that kills the narrative',
      'Comparable past runners and where the analogy breaks',
      'Manipulation & rug markers found in the framing itself',
    ],
    arsenal: false,
  },
  arsenal: {
    id: 'arsenal',
    name: 'FULL ARSENAL',
    tagline: 'The scan, plus everything you need to post for seven days.',
    amount: 4900,
    currency: 'eur',
    usdcAmount: 50_000_000, // 50 USDC
    usdcDisplay: '50 USDC',
    includes: [
      'Everything in the CULT SCAN',
      '6 faceless video scripts — hook, on-screen beats, voiceover, shot list',
      '15 posts written for crypto Twitter, not for LinkedIn',
      '6 meme concepts with image prompts you can paste into any generator',
      'Telegram + Discord launch copy, pinned message and the hostile FAQ',
      'A seven-day posting calendar with the reason behind each slot',
    ],
    arsenal: true,
  },
}

export const TIER_LIST: Tier[] = [TIERS.scan, TIERS.arsenal]

export function isTierId(value: unknown): value is TierId {
  return value === 'scan' || value === 'arsenal'
}

/** "€49" — display only, never used for charging. */
export function formatPrice(tier: Tier): string {
  const whole = tier.amount / 100
  return Number.isInteger(whole) ? `€${whole}` : `€${whole.toFixed(2)}`
}
