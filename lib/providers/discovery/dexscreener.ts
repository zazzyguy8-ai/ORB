import { fetchJson } from '@/lib/providers/http';
import { validateSolanaAddress, QUOTE_MINTS } from '@/lib/chains/solana';

/**
 * Where candidate tokens come from.
 *
 * DexScreener publishes two free, documented listing endpoints: tokens whose
 * teams have just filled in a profile, and tokens with active paid boosts.
 * Neither is a random sample of the chain, and that matters enough to say out
 * loud: **these are tokens someone spent effort or money to make visible.** The
 * scanner is looking through a window that the projects themselves opened.
 *
 * That bias is acceptable here because the scanner's job is not to find hidden
 * gems — it is to apply the same unflinching checks to the tokens that are
 * being pushed at everyone anyway, and throw out the ones that fail. Most of
 * what comes through this door does fail, which is the useful part.
 */

const PROFILES_URL = 'https://api.dexscreener.com/token-profiles/latest/v1';
const BOOSTS_URL = 'https://api.dexscreener.com/token-boosts/top/v1';

export type CandidateSource = 'profiles' | 'boosts';

export interface DiscoveryCandidate {
  address: string;
  source: CandidateSource;
}

interface DsListing {
  chainId?: string;
  tokenAddress?: string;
}

/**
 * Normalises a listing response into candidates.
 *
 * Pure, and exported, because every rule here is a judgement worth testing:
 * Solana only, valid mints only, and never a quote asset — SOL and USDC appear
 * in these feeds and analysing them is meaningless.
 */
export function toCandidates(payload: unknown, source: CandidateSource): DiscoveryCandidate[] {
  if (!Array.isArray(payload)) return [];

  const seen = new Set<string>();
  const candidates: DiscoveryCandidate[] = [];

  for (const entry of payload as DsListing[]) {
    if (entry?.chainId !== 'solana') continue;

    const validation = validateSolanaAddress(entry.tokenAddress);
    if (!validation.valid) continue;
    if (QUOTE_MINTS.has(validation.address)) continue;
    if (seen.has(validation.address)) continue;

    seen.add(validation.address);
    candidates.push({ address: validation.address, source });
  }

  return candidates;
}

/**
 * Fetches both listings. A source that fails is skipped rather than failing the
 * scan — one feed being down should cost coverage, not the whole run.
 */
export async function fetchCandidates(timeoutMs: number): Promise<DiscoveryCandidate[]> {
  const sources: [CandidateSource, string][] = [
    ['profiles', PROFILES_URL],
    ['boosts', BOOSTS_URL],
  ];

  const results = await Promise.all(
    sources.map(async ([source, url]) => {
      try {
        return toCandidates(await fetchJson<unknown>(url, { timeoutMs }), source);
      } catch {
        return [];
      }
    }),
  );

  // Deduplicate across feeds, keeping the first source that offered the token.
  const seen = new Set<string>();
  const merged: DiscoveryCandidate[] = [];
  for (const candidate of results.flat()) {
    if (seen.has(candidate.address)) continue;
    seen.add(candidate.address);
    merged.push(candidate);
  }

  return merged;
}
