import { afterEach, describe, expect, it } from 'vitest';
import { setLlmProvider } from '@/lib/ai/anthropic';
import { buildEvidence, topReasons } from '@/lib/ai/evidence';
import {
  buildUserPrompt,
  deterministicExplanation,
  explain,
  extractNumbers,
  validateLlmOutput,
} from '@/lib/ai/explain';
import type { LlmProvider } from '@/lib/ai/provider';
import { deriveMetrics } from '@/lib/metrics/derive';
import { evaluateRisk } from '@/lib/risk/rules';
import { scoreToken } from '@/lib/scoring/score';
import type { EvidenceItem } from '@/lib/types/domain';
import { collected, holderData, ok, NOW } from './helpers';

function stubLlm(reply: string | (() => Promise<string>)): LlmProvider {
  return {
    name: 'stub',
    available: true,
    complete: typeof reply === 'string' ? async () => reply : reply,
  };
}

const data = collected({ holders: ok(holderData({ top10Pct: 0.29 })) });
const metrics = deriveMetrics(data, NOW);
const score = scoreToken(metrics);
const flags = evaluateRisk({ metrics, data });
const evidence = buildEvidence(score, flags, metrics);

afterEach(() => setLlmProvider(null));

describe('evidence', () => {
  it('renders only facts that have a value behind them', () => {
    expect(evidence.length).toBeGreaterThan(4);
    for (const item of evidence) {
      expect(item.text.length).toBeGreaterThan(0);
      expect(item.magnitude).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every fact a stable id the model can cite', () => {
    const ids = evidence.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('sig:'))).toBe(true);
  });

  it('ranks stronger evidence first', () => {
    const magnitudes = evidence.map((e) => e.magnitude);
    expect(magnitudes).toEqual([...magnitudes].sort((a, b) => b - a));
  });

  it('picks a small deterministic set of reasons', () => {
    const reasons = topReasons(evidence, 3);
    expect(reasons).toHaveLength(3);
    expect(topReasons(evidence, 3).map((r) => r.text)).toEqual(reasons.map((r) => r.text));
  });
});

describe('extractNumbers', () => {
  it('normalises formatting so 1,840 and 1840 compare equal', () => {
    expect(extractNumbers('1,840 holders')).toEqual(['1840']);
    expect(extractNumbers('29.0% and 29%')).toEqual(['29', '29']);
  });

  it('returns nothing for text with no figures', () => {
    expect(extractNumbers('Volume is accelerating.')).toEqual([]);
  });
});

describe('validateLlmOutput', () => {
  const corpus: EvidenceItem[] = [
    { id: 'sig:a', text: 'Top 10 holders control 29.0% of supply.', polarity: 'negative', magnitude: 1 },
    { id: 'sig:b', text: '1,840 holders.', polarity: 'positive', magnitude: 0.5 },
  ];

  it('accepts compliant output', () => {
    const result = validateLlmOutput(
      JSON.stringify({
        reasons: [{ id: 'sig:b', text: '1840 holders and growing.' }],
        risk: [{ id: 'sig:a', text: 'Top 10 hold 29% of supply.' }],
      }),
      corpus,
    );
    expect(result.ok).toBe(true);
  });

  it('strips code fences before parsing', () => {
    const result = validateLlmOutput(
      '```json\n{"reasons":[{"id":"sig:b","text":"1840 holders."}]}\n```',
      corpus,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a number that was never in the data', () => {
    const result = validateLlmOutput(
      JSON.stringify({ reasons: [{ id: 'sig:b', text: '9,999 holders.' }] }),
      corpus,
    );
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toContain('9999');
  });

  it('rejects a citation of a fact we never supplied', () => {
    const result = validateLlmOutput(
      JSON.stringify({ reasons: [{ id: 'sig:invented', text: 'Whales are buying.' }] }),
      corpus,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects banned certainty language', () => {
    const result = validateLlmOutput(
      JSON.stringify({ reasons: [{ id: 'sig:b', text: 'This is a risk-free entry.' }] }),
      corpus,
    );
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toContain('banned');
  });

  it('rejects non-JSON output', () => {
    expect(validateLlmOutput('Sure! Here is my analysis:', corpus).ok).toBe(false);
  });

  it('rejects an empty reason list', () => {
    expect(validateLlmOutput(JSON.stringify({ reasons: [] }), corpus).ok).toBe(false);
  });

  it('rejects rambling output', () => {
    const result = validateLlmOutput(
      JSON.stringify({ reasons: [{ id: 'sig:b', text: 'x'.repeat(400) }] }),
      corpus,
    );
    expect(result.ok).toBe(false);
  });
});

describe('prompt', () => {
  it('lists every fact with its id and marks risk facts', () => {
    const prompt = buildUserPrompt({
      symbol: 'FIX',
      decision: 'WATCH',
      confidence: 61,
      score: 58,
      coverage: 0.8,
      evidence,
      unavailable: ['Social momentum unavailable.'],
    });

    for (const item of evidence) expect(prompt).toContain(item.id);
    expect(prompt).toContain('DECISION: WATCH');
    expect(prompt).toContain('Social momentum unavailable.');
  });
});

describe('explain', () => {
  it('uses the model when it complies', async () => {
    const first = evidence[0];
    setLlmProvider(
      stubLlm(JSON.stringify({ reasons: [{ id: first.id, text: first.text }], risk: [] })),
    );

    const result = await explain({
      symbol: 'FIX',
      decision: 'WATCH',
      confidence: 60,
      score: 58,
      coverage: 0.8,
      evidence,
      flags,
      unavailable: [],
    });

    expect(result.source).toBe('llm');
    expect(result.reasons[0]).toBe(first.text);
  });

  it('falls back deterministically when the model hallucinates', async () => {
    setLlmProvider(
      stubLlm(JSON.stringify({ reasons: [{ id: 'sig:a', text: '42 smart wallets bought.' }] })),
    );

    const result = await explain({
      symbol: 'FIX',
      decision: 'WATCH',
      confidence: 60,
      score: 58,
      coverage: 0.8,
      evidence,
      flags,
      unavailable: [],
    });

    expect(result.source).toBe('deterministic');
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.join(' ')).not.toContain('smart wallets');
  });

  it('falls back when the model throws or times out', async () => {
    setLlmProvider(
      stubLlm(async () => {
        throw new Error('Provider timed out.');
      }),
    );

    const result = await explain({
      symbol: 'FIX',
      decision: 'AVOID',
      confidence: 70,
      score: 30,
      coverage: 0.7,
      evidence,
      flags,
      unavailable: [],
    });

    expect(result.source).toBe('deterministic');
    expect(result.fallbackReason).toContain('timed out');
  });

  it('falls back when no provider is configured', async () => {
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });
    const result = await explain({
      symbol: 'FIX',
      decision: 'WATCH',
      confidence: 50,
      score: 50,
      coverage: 0.5,
      evidence,
      flags,
      unavailable: [],
    });
    expect(result.source).toBe('deterministic');
  });

  it('produces reasons drawn verbatim from the evidence in fallback mode', () => {
    const fallback = deterministicExplanation(evidence, flags);
    const texts = new Set(evidence.map((e) => e.text));
    for (const reason of fallback.reasons) expect(texts.has(reason)).toBe(true);
  });
});
