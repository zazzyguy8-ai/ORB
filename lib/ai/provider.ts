/**
 * LLM abstraction. The pipeline depends on this interface, never on a vendor
 * SDK, so the model can be replaced without touching the analysis code.
 */
export interface LlmRequest {
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly available: boolean;
  complete(req: LlmRequest): Promise<string>;
}

export class UnavailableLlmProvider implements LlmProvider {
  readonly name = 'none';
  readonly available = false;

  async complete(): Promise<string> {
    throw new Error('No LLM provider configured.');
  }
}
