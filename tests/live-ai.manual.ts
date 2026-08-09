/**
 * Manual smoke test for the real LLM path — not part of `npm test`, because it
 * needs a live ANTHROPIC_API_KEY and costs a fraction of a cent per run.
 *
 *   npx tsx --env-file=.env.local tests/live-ai.manual.ts
 *
 * It exercises exactly what production does: real evidence, real prompt, real
 * model, real response validation. What it proves is that a compliant model
 * response survives the validator — the offline suite already covers the
 * rejection paths.
 */
import { buildEvidence } from '@/lib/ai/evidence';
import { explain } from '@/lib/ai/explain';
import { classify } from '@/lib/decision/classify';
import { deriveMetrics } from '@/lib/metrics/derive';
import { evaluateRisk, unavailableChecks } from '@/lib/risk/rules';
import { scoreToken } from '@/lib/scoring/score';
import { collected, holderData, ok, NOW } from './helpers';

async function main() {
  const data = collected({ holders: ok(holderData({ top10Pct: 0.29 })) });
  const metrics = deriveMetrics(data, NOW);
  const score = scoreToken(metrics);
  const flags = evaluateRisk({ metrics, data });
  const { decision, confidence } = classify(score, flags);
  const evidence = buildEvidence(score, flags, metrics);

  const started = Date.now();
  const result = await explain({
    symbol: 'FIX',
    decision,
    confidence,
    score: score.total,
    coverage: score.coverage,
    evidence,
    flags,
    unavailable: unavailableChecks(data),
  });

  console.log(
    `\n${decision}  ${confidence}/100   (llm ${Date.now() - started}ms, source=${result.source})`,
  );
  if (result.fallbackReason) console.log('FALLBACK REASON:', result.fallbackReason);

  console.log('\nWhy:');
  for (const reason of result.reasons) console.log(' •', reason);
  console.log('\nRisk:');
  for (const note of result.riskNotes) console.log(' •', note);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
