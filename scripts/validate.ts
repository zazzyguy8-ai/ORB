/**
 * Validation harness (spec §26).
 *
 * Runs the real pipeline over a list of token addresses and reports latency,
 * data availability, decision distribution and run-to-run consistency.
 *
 *   npx tsx scripts/validate.ts tokens.txt            # one address per line
 *   npx tsx scripts/validate.ts --repeat 2 tokens.txt # consistency check
 *
 * Requires network access to the data providers. It deliberately does NOT tune
 * anything: every address is assigned to a `tune` or `holdout` split by a stable
 * hash of the address, so a model re-fit can only ever see the tune split and
 * the holdout numbers stay honest. Splitting on the address (not the run) means
 * the same token always lands in the same split, however many times it is
 * analysed.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateSolanaAddress } from '../lib/chains/solana';
import { analyzeToken } from '../lib/pipeline/analyze';
import type { AnalysisResult } from '../lib/types/domain';

type Split = 'tune' | 'holdout';

/** 30% holdout, deterministic in the address alone. */
function splitFor(address: string): Split {
  const digest = createHash('sha256').update(address).digest();
  return digest[0] % 10 < 3 ? 'holdout' : 'tune';
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  const args = process.argv.slice(2);
  const repeatIndex = args.indexOf('--repeat');
  const repeat = repeatIndex >= 0 ? Number(args[repeatIndex + 1]) : 1;
  const file = args.filter((a, i) => !a.startsWith('--') && i !== repeatIndex + 1).pop();

  if (!file) {
    console.error('usage: tsx scripts/validate.ts [--repeat N] <file-of-addresses>');
    process.exit(1);
  }

  const addresses = readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const runs: { address: string; split: Split; result: AnalysisResult }[] = [];
  const failures: { address: string; error: string }[] = [];

  for (const raw of addresses) {
    const validation = validateSolanaAddress(raw);
    if (!validation.valid) {
      failures.push({ address: raw, error: validation.error ?? 'invalid' });
      continue;
    }

    for (let i = 0; i < repeat; i++) {
      try {
        // skipAi: the LLM only phrases. Excluding it keeps the latency numbers
        // about the data pipeline and avoids burning tokens on a sweep.
        const result = await analyzeToken(validation.address, { skipAi: true });
        runs.push({ address: validation.address, split: splitFor(validation.address), result });
      } catch (err) {
        failures.push({ address: raw, error: err instanceof Error ? err.message : 'failed' });
      }
    }
  }

  const latencies = runs.map((r) => r.result.timings.totalMs);
  const decisions = runs.reduce<Record<string, number>>((acc, r) => {
    acc[r.result.decision] = (acc[r.result.decision] ?? 0) + 1;
    return acc;
  }, {});

  const availability = runs.reduce<Record<string, number>>((acc, r) => {
    for (const [key, status] of Object.entries(r.result.availability)) {
      if (status === 'ok') acc[key] = (acc[key] ?? 0) + 1;
    }
    return acc;
  }, {});

  // Consistency: the same address analysed twice in quick succession should
  // land on the same label. Disagreement is a signal that a threshold sits on
  // top of a noisy metric.
  const byAddress = new Map<string, Set<string>>();
  for (const run of runs) {
    const set = byAddress.get(run.address) ?? new Set<string>();
    set.add(run.result.decision);
    byAddress.set(run.address, set);
  }
  const inconsistent = [...byAddress.entries()].filter(([, labels]) => labels.size > 1);

  console.log(
    JSON.stringify(
      {
        analysed: runs.length,
        uniqueTokens: byAddress.size,
        failures,
        latencyMs: {
          p50: percentile(latencies, 50),
          p90: percentile(latencies, 90),
          max: Math.max(0, ...latencies),
        },
        decisions,
        splits: {
          tune: runs.filter((r) => r.split === 'tune').length,
          holdout: runs.filter((r) => r.split === 'holdout').length,
        },
        providerCoverage: Object.fromEntries(
          Object.entries(availability).map(([k, v]) => [k, `${((v / runs.length) * 100).toFixed(0)}%`]),
        ),
        avgScore:
          runs.length > 0
            ? runs.reduce((sum, r) => sum + r.result.score.total, 0) / runs.length
            : 0,
        avgCoverage:
          runs.length > 0
            ? runs.reduce((sum, r) => sum + r.result.score.coverage, 0) / runs.length
            : 0,
        inconsistentTokens: inconsistent.map(([address, labels]) => ({
          address,
          labels: [...labels],
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
