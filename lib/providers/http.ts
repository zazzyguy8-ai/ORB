import type { ProviderResult } from '@/lib/types/domain';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface FetchJsonOptions {
  timeoutMs: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: unknown;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(opts.body ? { 'content-type': 'application/json' } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      // 429 is worth distinguishing in logs — it is the failure mode we expect
      // first on the free tiers.
      throw new HttpError(`${res.status} ${res.statusText}`, res.status);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs a provider call and converts any failure into a ProviderResult rather
 * than an exception. A dead provider must degrade the analysis, never break it.
 */
export async function runProvider<T>(
  source: string,
  load: () => Promise<T | null>,
): Promise<ProviderResult<T>> {
  const started = Date.now();
  try {
    const data = await load();
    const latencyMs = Date.now() - started;
    if (data === null) {
      return { status: 'unavailable', reason: 'No data returned for this token.', source, latencyMs };
    }
    return { status: 'ok', data, source, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - started;
    return { status: 'error', reason: describeError(err), source, latencyMs };
  }
}

export function describeError(err: unknown): string {
  if (err instanceof HttpError) {
    if (err.status === 429) return 'Rate limited by provider.';
    return `Provider responded ${err.status}.`;
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return 'Provider timed out.';
    return err.message;
  }
  return 'Unknown provider error.';
}

/** Coerces provider payloads, which are frequently numeric strings. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** GoPlus and friends encode booleans as "0" / "1" strings. */
export function toFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === '1' || value === 1) return true;
  if (value === '0' || value === 0) return false;
  return null;
}
