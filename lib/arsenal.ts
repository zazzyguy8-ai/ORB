import { generateStructured, obj, str } from './anthropic'
import { EFFORT } from './models'
import type { TokenInput } from './cultscan'

/**
 * The arsenal — everything you post in the seven days after a launch.
 *
 * Generated in three parts rather than one, for a boring but load-bearing
 * reason: a serverless function has a wall-clock ceiling (60s on most Vercel
 * plans). One request producing the whole arsenal would sit right on that
 * line and fail intermittently under load, which is the worst kind of bug to
 * have on a paid path. Three requests of ~2k output tokens each finish
 * comfortably, and the client gets a real progress bar out of it.
 */

export type ArsenalPart = 'videos' | 'posts' | 'launch'

export function isArsenalPart(value: unknown): value is ArsenalPart {
  return value === 'videos' || value === 'posts' || value === 'launch'
}

/* ----------------------------- shared voice ----------------------------- */

const ARSENAL_SYSTEM = `You are CULTSCAN's content engine. You write the posts, scripts and copy that carry a token's narrative through its first week.

WHAT GOOD LOOKS LIKE
Distribution comes from content a stranger wants to repost, not from content the team wants to publish. Every asset you write should be usable by someone with no relationship to the project. Write for the timeline, not for the pitch deck.

FORMAT DISCIPLINE
- Faceless video means no face on camera: screen recordings, charts, text-on-motion, stock B-roll, generated imagery. Every visual you specify must be producible by one person with a phone and a free editor. Never call for actors, a studio, or footage that does not exist.
- Hooks earn the first two seconds or nothing else matters. Lead with the claim, the number, or the tension. Never open with "in this video" or a greeting.
- Crypto Twitter posts are short, lowercase-tolerant, and allergic to corporate cadence. No hashtag stuffing. One idea per post.

HARD RULES — these are not stylistic preferences
- Never invent a partnership, an endorsement, an exchange listing, an audit, a backer, a holder count, a volume figure, or any other verifiable fact. If a piece of copy would be stronger with a number, write a clearly-marked placeholder like [HOLDER COUNT] instead of a plausible-looking invention.
- Never promise or imply a return, a price, a multiple, or that anything is guaranteed. No "next 100x", no "you are early", no "financial freedom".
- Never write manufactured urgency around buying, and never write copy designed to make someone feel stupid for not buying.
- Never impersonate a real person, project, or publication.
- Humour, absurdity, lore and self-awareness are the tools. Pressure is not.

You are writing for a market that can smell a corporate content calendar from a mile away. Be funnier and sharper than a marketing team would be, and be honest about what the project actually is.`

function contextBlock(input: TokenInput, context?: string): string {
  return [
    `TICKER: ${input.ticker}`,
    `NAME: ${input.name}`,
    input.chain ? `CHAIN: ${input.chain}` : null,
    '',
    'THE PITCH:',
    input.pitch,
    context ? `\nWHAT THE SCAN CONCLUDED:\n${context}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

/* -------------------------------- videos -------------------------------- */

export interface VideoBeat {
  atSecond: number
  onScreenText: string
  voiceover: string
  visual: string
}

export interface VideoScript {
  title: string
  angle: string
  lengthSeconds: number
  hookText: string
  hookVoiceover: string
  beats: VideoBeat[]
  caption: string
  hashtags: string[]
  cta: string
  retentionNote: string
}

export interface VideoPack {
  scripts: VideoScript[]
}

const VIDEO_SCHEMA = obj({
  scripts: {
    type: 'array',
    description:
      'Exactly 6 faceless vertical video scripts, each on a genuinely different angle. Do not write six variations of one idea.',
    items: obj({
      title: { type: 'string', description: 'Internal name for the script.' },
      angle: { type: 'string', description: 'The angle in a few words, e.g. "the origin lore".' },
      lengthSeconds: { type: 'integer', description: 'Target runtime, between 15 and 60.' },
      hookText: {
        type: 'string',
        description: 'The on-screen text for the first two seconds. Under 12 words.',
      },
      hookVoiceover: { type: 'string', description: 'The spoken first line.' },
      beats: {
        type: 'array',
        description: 'The shot list, in order, 4 to 8 beats.',
        items: obj({
          atSecond: { type: 'integer', description: 'When this beat starts.' },
          onScreenText: str,
          voiceover: str,
          visual: {
            type: 'string',
            description: 'Concretely what is on screen. Producible by one person with a phone.',
          },
        }),
      },
      caption: { type: 'string', description: 'The post caption. Not a summary of the video.' },
      hashtags: { type: 'array', description: '3 to 5 hashtags. No stuffing.', items: str },
      cta: { type: 'string', description: 'What the viewer does next. Soft, not pushy.' },
      retentionNote: {
        type: 'string',
        description: 'The specific reason a viewer stays past three seconds on this one.',
      },
    }),
  },
})

/* --------------------------- posts and memes ---------------------------- */

export interface CtPost {
  text: string
  format: string
  whyItWorks: string
}

export interface MemeConcept {
  concept: string
  topText: string
  bottomText: string
  imagePrompt: string
}

export interface PostPack {
  posts: CtPost[]
  memes: MemeConcept[]
}

const POST_SCHEMA = obj({
  posts: {
    type: 'array',
    description:
      'Exactly 15 crypto-Twitter posts. Mix formats: one-liners, observations, self-aware jokes, lore fragments, replies designed to be quoted. No threads.',
    items: obj({
      text: { type: 'string', description: 'The post itself, under 260 characters.' },
      format: { type: 'string', description: 'e.g. "one-liner", "lore drop", "self-own", "quotable".' },
      whyItWorks: { type: 'string', description: 'One clause on the mechanism.' },
    }),
  },
  memes: {
    type: 'array',
    description: 'Exactly 6 meme concepts using recognisable formats.',
    items: obj({
      concept: { type: 'string', description: 'The format and the joke.' },
      topText: str,
      bottomText: str,
      imagePrompt: {
        type: 'string',
        description: 'A prompt that can be pasted straight into an image generator. Describe no real person.',
      },
    }),
  },
})

/* ------------------------------ launch copy ----------------------------- */

export interface CalendarSlot {
  slot: string
  asset: string
  reason: string
}

export interface CalendarDay {
  day: number
  theme: string
  slots: CalendarSlot[]
}

export interface LaunchPack {
  telegramPinned: string
  telegramAnnouncement: string
  discordWelcome: string
  faq: { question: string; answer: string }[]
  calendar: CalendarDay[]
  moderationNote: string
}

const LAUNCH_SCHEMA = obj({
  telegramPinned: {
    type: 'string',
    description: 'The pinned message. What this is, what it is not, where to look things up.',
  },
  telegramAnnouncement: { type: 'string', description: 'The launch announcement post.' },
  discordWelcome: { type: 'string', description: 'Welcome channel copy.' },
  faq: {
    type: 'array',
    description:
      'Exactly 6 questions the community will actually ask, including the hostile ones. Answer them straight — a dodged question in a Telegram is worse than a hard answer.',
    items: obj({ question: str, answer: str }),
  },
  calendar: {
    type: 'array',
    description: 'Exactly 7 days. Day 1 is launch day.',
    items: obj({
      day: { type: 'integer' },
      theme: { type: 'string', description: 'What this day is for.' },
      slots: {
        type: 'array',
        description: '2 to 4 slots per day.',
        items: obj({
          slot: { type: 'string', description: 'Rough time of day, e.g. "morning UTC".' },
          asset: { type: 'string', description: 'What goes out. Reference the video and post assets by angle.' },
          reason: { type: 'string', description: 'Why this slot, in one clause.' },
        }),
      },
    }),
  },
  moderationNote: {
    type: 'string',
    description:
      'Short, practical guidance on handling the community when price goes down, including what not to promise.',
  },
})

/* ------------------------------ dispatcher ------------------------------ */

export async function generateArsenalPart(
  part: ArsenalPart,
  input: TokenInput,
  context?: string
): Promise<VideoPack | PostPack | LaunchPack> {
  const base = contextBlock(input, context)

  if (part === 'videos') {
    return generateStructured<VideoPack>({
      system: ARSENAL_SYSTEM,
      prompt: `${base}\n\nWrite the six faceless video scripts.`,
      schema: VIDEO_SCHEMA,
      maxTokens: 12000,
      effort: EFFORT.deep,
    })
  }

  if (part === 'posts') {
    return generateStructured<PostPack>({
      system: ARSENAL_SYSTEM,
      prompt: `${base}\n\nWrite the fifteen posts and the six meme concepts.`,
      schema: POST_SCHEMA,
      maxTokens: 10000,
      effort: EFFORT.deep,
    })
  }

  return generateStructured<LaunchPack>({
    system: ARSENAL_SYSTEM,
    prompt: `${base}\n\nWrite the Telegram and Discord copy, the FAQ, and the seven-day calendar.`,
    schema: LAUNCH_SCHEMA,
    maxTokens: 10000,
    effort: EFFORT.deep,
  })
}
