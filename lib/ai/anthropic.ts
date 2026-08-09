import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/config/env';
import { UnavailableLlmProvider, type LlmProvider, type LlmRequest } from '@/lib/ai/provider';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly available = true;

  private readonly client: Anthropic;

  /**
   * Whether this model accepts `output_config.effort`. Older and smaller models
   * reject it with a 400, and a hardcoded model list would rot on every release
   * — so we learn it from the first response instead and remember the answer.
   */
  private supportsEffort = true;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 0 });
  }

  async complete(req: LlmRequest): Promise<string> {
    // maxRetries is 0 and the timeout is short by design: this call sits in the
    // user's latency path, and a slow retry is worse than the deterministic
    // fallback that is already computed and waiting.
    //
    // Two model-specific notes, both load-bearing on current models:
    //  - No temperature/top_p. Sampling parameters are rejected outright on the
    //    current Opus and Sonnet generations.
    //  - effort "low", and thinking left at its default. Thinking is on by
    //    default and max_tokens caps thinking plus text together, so the budget
    //    below is sized for both. Selecting three sentences from a supplied list
    //    does not need deep reasoning, and this path has a 3.5s deadline.
    const send = (withEffort: boolean) =>
      this.client.messages.create(
        {
          model: this.model,
          max_tokens: req.maxTokens,
          ...(withEffort ? { output_config: { effort: 'low' as const } } : {}),
          system: req.system,
          messages: [{ role: 'user', content: req.user }],
        },
        { timeout: req.timeoutMs },
      );

    let response;
    try {
      response = await send(this.supportsEffort);
    } catch (err) {
      // A 400 while sending effort means this model does not take it. Drop it,
      // remember, and retry once — the alternative is a model that silently
      // never produces an explanation.
      if (!this.supportsEffort || !(err instanceof Anthropic.BadRequestError)) throw err;
      this.supportsEffort = false;
      response = await send(false);
    }

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
