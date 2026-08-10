import { describe, expect, it } from 'vitest';
import { errorKindFromStatus } from '@/components/analysis/ErrorPanel';

/**
 * The status codes the analyze route actually returns. These map to different
 * offers on screen, so mapping one onto the wrong kind sends the user to a
 * dead end — a sign-in prompt for a token that does not exist, or a retry
 * button for a limit that will not lift for hours.
 */
describe('errorKindFromStatus', () => {
  it('treats a quota response as the moment to offer signing in', () => {
    expect(errorKindFromStatus(429)).toBe('limit');
  });

  it('separates "no such pair" from "provider is down"', () => {
    // 404 means the provider answered and had nothing; 503 means we never
    // reached it. Retrying helps with exactly one of them.
    expect(errorKindFromStatus(404)).toBe('notfound');
    expect(errorKindFromStatus(503)).toBe('provider');
  });

  it('calls a rejected address invalid rather than a failure', () => {
    expect(errorKindFromStatus(400)).toBe('invalid');
  });

  it('falls back to a retryable unknown for anything else', () => {
    expect(errorKindFromStatus(500)).toBe('unknown');
    expect(errorKindFromStatus(418)).toBe('unknown');
  });
});
