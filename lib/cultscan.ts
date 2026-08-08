import { generateStructured, obj, str } from './anthropic'
import { EFFORT } from './models'

/**
 * The scan.
 *
 * Every existing token tool answers a solved question: is the contract safe?
 * RugCheck, TokenSniffer and DexScreener all do that, and they do it better
 * than a language model could.
 *
 * Nobody tools the question people actually decide on. A memecoin is not a
 * product, it is a cult, and cults live or die on whether the story survives
 * contact with a group chat. That is a language problem, which is exactly
 * what a model is good at — and it is what this scores.
 */

export interface TokenInput {
  /** Ticker, e.g. "WIF". */
  ticker: string
  /** Name or the one-line pitch. */
  name: string
  /** Free-text: the thesis, the lore, the meme, whatever they have. */
  pitch: string
  /** Optional chain, for tone. */
  chain?: string
}

export interface Comparable {
  name: string
  whyItRhymes: string
  whereTheAnalogyBreaks: string
}

export interface RiskMarker {
  marker: string
  severity: string
  whatItLooksLike: string
}

export interface CultScan {
  verdict: string
  cultScore: number
  scoreBand: string
  scoreReasoning: string
  tickerMemetics: {
    readsAs: string
    saysOutLoud: string
    memeSurface: string
    replyGuyTest: string
    verdict: string
  }
  narrative: {
    thesis: string
    whoBuys: string
    whatMakesThemSell: string
    ceiling: string
    timeToStale: string
  }
  comparables: Comparable[]
  fatalFlaw: {
    flaw: string
    whenItBites: string
    canItBeFixed: string
  }
  riskMarkers: RiskMarker[]
  ifYouLaunchThis: string[]
  ifYouAreBuying: string[]
  oneLineForTwitter: string
}

const SCAN_SCHEMA = obj({
  verdict: {
    type: 'string',
    description: 'One brutal sentence. The thing you would say to a friend who asked. No hedging.',
  },
  cultScore: {
    type: 'integer',
    description:
      'Narrative survivability, 0-100. Not a price prediction. 0-30 dead on arrival, 31-55 needs a catalyst it does not have, 56-75 real cult potential, 76-100 rare. Most things score under 50 — be honest.',
  },
  scoreBand: { type: 'string', description: 'Short label for the band, e.g. "NEEDS A CATALYST".' },
  scoreReasoning: {
    type: 'string',
    description: 'Two or three sentences on what moved the score up and what held it down.',
  },
  tickerMemetics: obj({
    readsAs: { type: 'string', description: 'What the ticker looks like scrolling past in a feed.' },
    saysOutLoud: { type: 'string', description: 'How it sounds spoken. Whether it survives a voiceover.' },
    memeSurface: { type: 'string', description: 'What images, formats and jokes it naturally generates.' },
    replyGuyTest: {
      type: 'string',
      description: 'Can a stranger use this in a reply to a big account and get engagement? That is the real distribution test.',
    },
    verdict: str,
  }),
  narrative: obj({
    thesis: { type: 'string', description: 'The story in one sentence, stated more clearly than the owner stated it.' },
    whoBuys: { type: 'string', description: 'The specific psychographic. Not "degens" — be specific.' },
    whatMakesThemSell: { type: 'string', description: 'The exact moment conviction breaks.' },
    ceiling: { type: 'string', description: 'How far this story can travel before it needs a new one.' },
    timeToStale: { type: 'string', description: 'Rough window before the narrative stops being novel.' },
  }),
  comparables: {
    type: 'array',
    description: 'Exactly 3 past tokens or memes whose narrative shape rhymes with this one.',
    items: obj({
      name: str,
      whyItRhymes: str,
      whereTheAnalogyBreaks: {
        type: 'string',
        description: 'The honest part. Why this is not that.',
      },
    }),
  },
  fatalFlaw: obj({
    flaw: { type: 'string', description: 'The single specific thing most likely to kill this narrative.' },
    whenItBites: str,
    canItBeFixed: str,
  }),
  riskMarkers: {
    type: 'array',
    description:
      'Manipulation and rug patterns visible in the framing itself — unfalsifiable claims, manufactured urgency, borrowed credibility, vague team, promises of returns. Empty array if genuinely none.',
    items: obj({
      marker: str,
      severity: { type: 'string', description: 'low, medium or high' },
      whatItLooksLike: { type: 'string', description: 'How this shows up in practice, concretely.' },
    }),
  },
  ifYouLaunchThis: {
    type: 'array',
    description: 'Exactly 5 concrete actions for someone shipping this. Specific, not "build community".',
    items: str,
  },
  ifYouAreBuying: {
    type: 'array',
    description:
      'Exactly 5 things to check or watch before and after buying. Include what would make you exit. Never give a price target.',
    items: str,
  },
  oneLineForTwitter: {
    type: 'string',
    description: 'A quotable line under 200 characters summarising the verdict. This is what people screenshot.',
  },
})

const SCAN_SYSTEM = `You are CULTSCAN. You analyse whether a memecoin's narrative can sustain collective attention — the only thing that actually determines whether a memecoin lives.

WHAT YOU ARE
You are the friend who has watched a thousand launches and tells people the truth even when they wanted encouragement. You are specific, you are unsentimental, and you are never a hype man.

HOW YOU SCORE
Attention is the scarce resource. Score narrative survivability: can this story be retold by a stranger, does it generate its own content, does it survive the first red candle, does it have somewhere to go after the first week. Most projects are not special — the median score is under 50 and you should not drift upward to be pleasant. A high score is rare and has to be earned by the actual material in front of you.

HARD RULES
- Never predict a price, a market cap, a multiple, or a timeframe for returns. Not even hedged. If you are tempted, write about narrative instead.
- Never tell anyone to buy or sell. Analyse the thing; the reader decides.
- Always fill riskMarkers honestly. If the pitch uses unfalsifiable claims, manufactured scarcity, borrowed credibility from names it has no relationship with, guaranteed-return language, or an anonymous team presented as a feature, say so plainly. If there are genuinely none, return an empty array rather than inventing one.
- You are describing the pitch you were given, not the contract. You cannot see liquidity, holder distribution, or mint authority — never imply that you can. If the reader would need on-chain data to act on a point, say which data.
- Do not write marketing copy here. This is the audit.

VOICE
Native to crypto Twitter without being a caricature. Short sentences. Concrete nouns. No emoji, no rocket metaphors, no "in the ever-evolving landscape". If something is derivative, use the word derivative.`

export async function generateScan(input: TokenInput): Promise<CultScan> {
  const prompt = [
    `TICKER: ${input.ticker}`,
    `NAME: ${input.name}`,
    input.chain ? `CHAIN: ${input.chain}` : null,
    '',
    'THE PITCH, IN THEIR WORDS:',
    input.pitch,
    '',
    'Scan it. Score the narrative, not the chart.',
  ]
    .filter(Boolean)
    .join('\n')

  return generateStructured<CultScan>({
    system: SCAN_SYSTEM,
    prompt,
    schema: SCAN_SCHEMA,
    maxTokens: 8000,
    effort: EFFORT.deep,
  })
}

/* ------------------------------------------------------------------ */
/* The free tier: enough to be genuinely useful, and enough to screenshot. */
/* ------------------------------------------------------------------ */

export interface VibeCheck {
  cultScore: number
  scoreBand: string
  verdict: string
  strongestThing: string
  weakestThing: string
  oneLineForTwitter: string
}

const VIBE_SCHEMA = obj({
  cultScore: {
    type: 'integer',
    description: 'Narrative survivability 0-100. Most things are under 50. Do not inflate.',
  },
  scoreBand: { type: 'string', description: 'Short band label, e.g. "DERIVATIVE".' },
  verdict: { type: 'string', description: 'One brutal sentence.' },
  strongestThing: { type: 'string', description: 'The single best thing about this narrative.' },
  weakestThing: { type: 'string', description: 'The single worst thing. Be specific.' },
  oneLineForTwitter: {
    type: 'string',
    description: 'Quotable, under 200 characters. This is what gets screenshotted.',
  },
})

export async function generateVibeCheck(input: TokenInput): Promise<VibeCheck> {
  return generateStructured<VibeCheck>({
    system: SCAN_SYSTEM,
    prompt: [
      `TICKER: ${input.ticker}`,
      `NAME: ${input.name}`,
      '',
      'THE PITCH:',
      input.pitch,
      '',
      'Fast read only. Score, verdict, best thing, worst thing.',
    ].join('\n'),
    schema: VIBE_SCHEMA,
    maxTokens: 3000,
    effort: EFFORT.fast,
  })
}
