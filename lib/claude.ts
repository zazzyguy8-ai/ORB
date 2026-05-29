import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface OrbReading {
  archetype: string
  essence: string
  traits: string[]
  timeline: string
  danger: string
  potential: string
  orbSpeaks: string
}

export async function generateReading(
  answers: string[],
  hesitationTimes: number[],
  questionTexts: string[]
): Promise<OrbReading> {
  const answerContext = questionTexts
    .map((q, i) => `Q: ${q}\nA: ${answers[i]} (hesitation: ${hesitationTimes[i]}ms)`)
    .join('\n\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are the DIRE ORB — an ancient intelligence that reads the hidden architecture of a person's soul. You do not give quiz results. You reveal what was already there.

Analyze the pattern of choices, the questions avoided emotionally, the contradictions, and what the hesitation times suggest about resistance. Generate an archetype reading.

RULES:
- Tone: dark, cinematic, prophetic. Never clinical or cheerful.
- Never say "based on your answers"
- Speak as if you already knew this person
- Archetypes must feel earned, not generic
- Use specific language from their choices where natural
- The archetype name must be 2-3 words, evocative, slightly ominous
- Everything should feel like it was discovered, not calculated

Available archetype families (mix and create variations):
THE VEILED ONE, THE HOLLOW KING, THE ARCHITECT OF ABSENCE, THE SIGNAL BEARER, THE FRACTURED PROPHET, THE SILENT TIDE, THE BURNING ROOM, THE MIRROR WOLF, THE LAST CARTOGRAPHER, THE UNNAMED DOOR

Return ONLY valid JSON with no markdown, no code blocks, just raw JSON:
{
  "archetype": "THE VEILED ONE",
  "essence": "You hide ambition beneath silence.",
  "traits": ["magnetic presence", "emotional suppression", "creator energy", "isolation tendency"],
  "timeline": "You are approaching a divergence point.",
  "danger": "You trust people too slowly to let them save you.",
  "potential": "Your path favors influence over stability.",
  "orbSpeaks": "The silence you carry is not emptiness. It is gravity."
}`,
    messages: [
      {
        role: 'user',
        content: `Read this soul:\n\n${answerContext}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  // Strip any potential markdown code blocks
  let jsonText = content.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const reading = JSON.parse(jsonText) as OrbReading
  return reading
}

export async function generateDailyMessage(
  archetype: string,
  dayNumber: number
): Promise<{ message: string; choiceA: string; choiceB: string; outcomeA: string; outcomeB: string }> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `You are the DIRE ORB. Generate a cryptic daily message for someone whose archetype is ${archetype}. Day ${dayNumber} of their current timeline.

Return ONLY valid JSON:
{
  "message": "one sentence cryptic observation about their current state",
  "choiceA": "first option (3-5 words)",
  "choiceB": "second option (3-5 words)",
  "outcomeA": "one sentence consequence or insight for choice A",
  "outcomeB": "one sentence consequence or insight for choice B"
}`,
    messages: [
      {
        role: 'user',
        content: `Generate today's orb message for ${archetype}, day ${dayNumber}.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  let jsonText = content.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  return JSON.parse(jsonText)
}
