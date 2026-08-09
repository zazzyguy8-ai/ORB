import { getLlmProvider } from '@/lib/ai/anthropic';
import { topReasons } from '@/lib/ai/evidence';
import { env } from '@/lib/config/env';
import type { Decision, EvidenceItem, Explanation, RiskFlag } from '@/lib/types/domain';

/**
 * The AI layer. It phrases; it does not decide and it does not compute.
 *
 * The decision, the confidence and the flags all arrive pre-computed. The model
 * receives a numbered list of already-true sentences and must answer with the
 * ids it used. Anything it returns is then re-checked against that list before
 * a user ever sees it — including every numeral, so a rephrased "29%" cannot
 * quietly become "2.9%".
 */

export const SYSTEM_PROMPT = `You write one-glance summaries for memecoin traders.

You are given a decision that has ALREADY been made by a deterministic scoring
engine, plus a numbered list of FACTS computed by that engine.

Absolute rules:
- Use ONLY the numbered facts. Never introduce a number, percentage, wallet
  count, price, age or any other figure that is not already in a fact you cite.
- Never invent data. If something is not in the list, it does not exist for you.
- Never predict prices and never imply certainty. Banned phrasings include
  "guaranteed", "risk-free", "100x", "guaranteed pump", "will pump", "can't lose".
- Do not restate the decision or the confidence number; the interface shows them.
- Each line is one short sentence, maximum 120 characters, plain and factual.
- No hype, no emoji, no marketing language.

Answer with STRICT JSON and nothing else:
{"reasons":[{"id":"<fact id>","text":"<sentence>"}],"risk":[{"id":"<fact id>","text":"<sentence>"}]}

Give 2-3 reasons that best explain the decision, and 0-3 risk lines drawn from
facts marked RISK. Every object must carry the id of the fact it came from.`;

export function buildUserPrompt(input: {
  symbol: string | null;
  decision: Decision;
  confidence: number;
  score: number;
  coverage: number;
  evidence: EvidenceItem[];
  unavailable: string[];
}): string {
  const facts = input.evidence
    .map(
      (item) =>
        `${item.id} [${item.id.startsWith('risk:') ? 'RISK' : item.polarity.toUpperCase()}] ${item.text}`,
    )
    .join('\n');

  const gaps =
    input.unavailable.length > 0
      ? `\nUNAVAILABLE (do not speculate about these):\n${input.unavailable.map((g) => `- ${g}`).join('\n')}`
      : '';

  return `TOKEN: ${input.symbol ?? 'unknown'}
DECISION: ${input.decision}
CONFIDENCE: ${input.confidence}/100
SCORE: ${input.score.toFixed(1)}/100 (data coverage ${(input.coverage * 100).toFixed(0)}%)

FACTS:
${facts}${gaps}`;
}

const BANNED = [
  'guarantee',
  'guaranteed',
  'risk-free',
  'riskfree',
  'risk free',
  '100x',
  'to the moon',
  'cant lose',
  "can't lose",
  'sure thing',
  'will pump',
  'guaranteed pump',
];

const MAX_LINE_LENGTH = 160;

/** Numerals a sentence asserts, normalised so 29.0 and 29 compare equal. */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,]*\.?\d*/g) ?? [];
  return matches.map((m) => String(Number(m.replace(/,/g, '')))).filter((m) => m !== 'NaN');
}

export interface ValidationFailure {
  ok: false;
  reason: string;
}

export interface ValidationSuccess {
  ok: true;
  reasons: string[];
  riskNotes: string[];
}

interface RawLine {
  id?: unknown;
  text?: unknown;
}

/**
 * Rejects any output that cites a fact we did not supply, states a number that
 * is not in the evidence corpus, or uses banned language. Rejection is cheap —
 * the deterministic explanation is already computed.
 */
export function validateLlmOutput(
  raw: string,
  evidence: EvidenceItem[],
): ValidationSuccess | ValidationFailure {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: { reasons?: RawLine[]; risk?: RawLine[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: 'Model output was not valid JSON.' };
  }

  const byId = new Map(evidence.map((e) => [e.id, e]));
  // Numbers are checked against the whole corpus, not just the cited fact: the
  // model legitimately merges two facts into one sentence, but it may never
  // introduce a figure from nowhere.
  const corpusNumbers = new Set(evidence.flatMap((e) => extractNumbers(e.text)));

  const check = (lines: RawLine[] | undefined, label: string) => {
    const out: string[] = [];
    for (const line of lines ?? []) {
      if (typeof line?.id !== 'string' || typeof line?.text !== 'string') {
        return { error: `${label} entry is malformed.` };
      }
      if (!byId.has(line.id)) {
        return { error: `${label} cites unknown fact "${line.id}".` };
      }

      const text = line.text.trim();
      if (text.length === 0) return { error: `${label} entry is empty.` };
      if (text.length > MAX_LINE_LENGTH) return { error: `${label} entry is too long.` };

      const lower = text.toLowerCase();
      const banned = BANNED.find((phrase) => lower.includes(phrase));
      if (banned) return { error: `${label} used banned phrasing "${banned}".` };

      for (const num of extractNumbers(text)) {
        if (!corpusNumbers.has(num)) {
          return { error: `${label} introduced the number ${num}, which is not in the data.` };
        }
      }

      out.push(text);
    }
    return { out };
  };

  const reasons = check(parsed.reasons, 'Reason');
  if ('error' in reasons) return { ok: false, reason: reasons.error! };

  const risk = check(parsed.risk, 'Risk note');
  if ('error' in risk) return { ok: false, reason: risk.error! };

  if (!reasons.out || reasons.out.length < 1) {
    return { ok: false, reason: 'Model returned no reasons.' };
  }

  return { ok: true, reasons: reasons.out.slice(0, 3), riskNotes: (risk.out ?? []).slice(0, 3) };
}

/** Evidence rendered verbatim. Always correct, just less fluent. */
export function deterministicExplanation(
  evidence: EvidenceItem[],
  flags: RiskFlag[],
  fallbackReason?: string,
): Explanation {
  return {
    reasons: topReasons(evidence, 3).map((item) => item.text),
    riskNotes: flags.slice(0, 3).map((flag) => flag.detail),
    source: 'deterministic',
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

export async function explain(input: {
  symbol: string | null;
  decision: Decision;
  confidence: number;
  score: number;
  coverage: number;
  evidence: EvidenceItem[];
  flags: RiskFlag[];
  unavailable: string[];
}): Promise<Explanation> {
  const llm = getLlmProvider();
  if (!llm.available) {
    return deterministicExplanation(input.evidence, input.flags, 'No LLM provider configured.');
  }

  if (input.evidence.length === 0) {
    return deterministicExplanation(input.evidence, input.flags, 'No evidence available to explain.');
  }

  try {
    const raw = await llm.complete({
      system: SYSTEM_PROMPT,
      // Cap the fact list: beyond ~24 items we are paying latency for facts that
      // will never make the top three anyway.
      user: buildUserPrompt({ ...input, evidence: input.evidence.slice(0, 24) }),
      maxTokens: 400,
      timeoutMs: env.aiTimeoutMs,
    });

    const validated = validateLlmOutput(raw, input.evidence);
    if (!validated.ok) {
      return deterministicExplanation(input.evidence, input.flags, validated.reason);
    }

    return {
      reasons: validated.reasons,
      riskNotes:
        validated.riskNotes.length > 0
          ? validated.riskNotes
          : input.flags.slice(0, 2).map((f) => f.detail),
      source: 'llm',
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'LLM call failed.';
    return deterministicExplanation(input.evidence, input.flags, reason);
  }
}
