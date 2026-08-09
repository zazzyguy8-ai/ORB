import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/config/env';
import { UnavailableLlmProvider, type LlmProvider, type LlmRequest } from '@/lib/ai/provider';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly available = true;

  private readonly client: Anthropic;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 0 });
  }

  async complete(req: LlmRequest): Promise<string> {
    // maxRetries is 0 and the timeout is short by design: this call sits in the
    // user's latency path, and a slow retry is worse than the deterministic
    // fallback that is already computed and waiting.
    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: req.maxTokens,
        temperature: 0.2,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      },
      { timeout: req.timeoutMs },
    );

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  }
}

let provider: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (provider) return provider;
  provider = env.anthropicApiKey
    ? new AnthropicProvider(env.anthropicApiKey, env.anthropicModel)
    : new UnavailableLlmProvider();
  return provider;
}

/** Test seam. */
export function setLlmProvider(next: LlmProvider | null): void {
  provider = next;
}
