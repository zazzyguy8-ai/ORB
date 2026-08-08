import Anthropic from '@anthropic-ai/sdk'
import { ORB_MODEL } from './models'

/**
 * One client, one way of asking for JSON.
 *
 * Every generation surface in the app wants the same thing: a strict JSON
 * object matching a schema. `output_config.format` makes the API guarantee
 * that shape, so there is no markdown-fence stripping and no parse-retry loop
 * anywhere downstream — if the call returns, the JSON is valid.
 */

let cached: Anthropic | null = null

export function anthropic(): Anthropic {
  if (cached) return cached
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  cached = new Anthropic()
  return cached
}

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export interface StructuredRequest {
  system: string
  prompt: string
  schema: Record<string, unknown>
  maxTokens: number
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

export async function generateStructured<T>(req: StructuredRequest): Promise<T> {
  const message = await anthropic().messages.create({
    model: ORB_MODEL,
    max_tokens: req.maxTokens,
    system: req.system,
    output_config: {
      effort: req.effort,
      format: { type: 'json_schema', schema: req.schema },
    },
    messages: [{ role: 'user', content: req.prompt }],
  })

  if (message.stop_reason === 'refusal') {
    throw new Error('The orb declined to read this. Try different wording.')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The reading was cut short. Try again.')
  }

  const text = message.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') {
    throw new Error('The orb returned nothing readable.')
  }

  return JSON.parse(text.text) as T
}

/**
 * Helper for building schemas the API accepts: every object needs an explicit
 * `required` list covering all its properties, plus `additionalProperties: false`.
 */
export function obj(properties: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

export const str = { type: 'string' } as const
