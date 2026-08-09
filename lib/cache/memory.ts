/**
 * Process-local TTL cache.
 *
 * Deliberately not Redis: at MVP volume the win we need is "don't re-hit GoPlus
 * for a token two people looked at ten seconds apart", and an in-process map
 * delivers that with zero added latency. Swap for a shared store when we run
 * more than one instance and cache hit rate starts to matter.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** Bounded so a long-running instance cannot grow without limit. */
const MAX_ENTRIES = 2000;

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict the oldest insertion; Map preserves insertion order.
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Collapses concurrent identical lookups onto one upstream call. */
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = load()
    .then((value) => {
      cacheSet(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function cacheClear(): void {
  store.clear();
  inflight.clear();
}
