import { describe, expect, it } from 'vitest';
import { extractAddress } from '@/lib/alerts/parse';
import { formatScanHit } from '@/lib/alerts/telegram';
import type { ScanHit } from '@/lib/discovery/scan';

const MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';

describe('extractAddress', () => {
  it('finds an address on its own', () => {
    expect(extractAddress(MINT)).toBe(MINT);
  });

  it('finds one surrounded by the prose people actually send', () => {
    expect(extractAddress(`yo check this ${MINT} looks good ser 🚀`)).toBe(MINT);
    expect(extractAddress(`ca: ${MINT}\nis this a rug?`)).toBe(MINT);
  });

  it('skips a quote asset and takes the real subject of the message', () => {
    // People paste SOL pair links constantly; the token being asked about is
    // never the quote side.
    expect(extractAddress(`${WRAPPED_SOL} / ${MINT}`)).toBe(MINT);
  });

  it('returns null when there is nothing address-shaped', () => {
    expect(extractAddress('gm')).toBeNull();
    expect(extractAddress('what do you think about bonk')).toBeNull();
    expect(extractAddress('')).toBeNull();
  });

  it('ignores strings that are the right shape but not valid base58 mints', () => {
    expect(extractAddress('0OIl'.repeat(11))).toBeNull();
  });
});

describe('formatScanHit', () => {
  const hit = (over: Partial<ScanHit> = {}): ScanHit => ({
    address: MINT,
    symbol: 'FIX',
    name: 'Fixture Coin',
    decision: 'BUY',
    score: 74.2,
    confidence: 69,
    liquidityUsd: 62_000,
    marketCapUsd: 415_000,
    ageMinutes: 60 * 26,
    reasons: ['LP is fully locked or burned, so the pool cannot simply be pulled.'],
    source: 'profiles',
    analysisId: '00000000-0000-4000-8000-000000000000',
    ...over,
  });

  it('leads with the verdict, the token and the score', () => {
    expect(formatScanHit(hit())).toMatch(/^BUY · \$FIX · 74\/100/);
  });

  it('always carries the disclaimer, because it arrives uninvited', () => {
    // This lands in a channel where people act on messages. It is the one line
    // that must never be dropped for brevity.
    expect(formatScanHit(hit())).toContain('not advice');
  });

  it('links the analysis so the claim can be checked', () => {
    expect(formatScanHit(hit())).toContain('/a/00000000-0000-4000-8000-000000000000');
  });

  it('says "unknown" rather than inventing a figure', () => {
    const text = formatScanHit(hit({ liquidityUsd: null, marketCapUsd: null, ageMinutes: null }));
    expect(text).toContain('unknown mcap');
    expect(text).toContain('unknown liquidity');
    expect(text).toContain('unknown age');
  });

  it('falls back to a truncated address when the token has no symbol', () => {
    expect(formatScanHit(hit({ symbol: null }))).toContain(MINT.slice(0, 6));
  });
});
