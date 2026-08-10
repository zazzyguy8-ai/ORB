import { Meter, scoreText } from '@/components/analysis/primitives';
import type { CategoryScore, ScoreResult } from '@/lib/types/domain';

const CATEGORY_META: Record<string, { label: string; blurb: string }> = {
  momentum: { label: 'Momentum', blurb: 'Volume and price acceleration' },
  liquidity: { label: 'Liquidity', blurb: 'Depth, turnover and LP lock' },
  holders: { label: 'Holders', blurb: 'Concentration and holder count' },
  wallets: { label: 'Wallet flow', blurb: 'Large-wallet net buying' },
  developer: { label: 'Developer', blurb: 'Creator supply held' },
  trading: { label: 'Trading', blurb: 'Buy/sell balance and activity' },
  security: { label: 'Security', blurb: 'Rug surface and token age' },
};

/**
 * The seven scoring categories, always visible.
 *
 * The headline decision answers "what"; this answers "on what basis" without
 * making the reader open anything. Categories with no data are rendered as
 * explicitly unmeasured — they are not scored as zero, and they must not look
 * like a zero.
 */
export function SignalGrid({ score }: { score: ScoreResult }) {
  const covered = score.categories.filter((c) => c.score !== null).length;

  return (
    <section className="card hover-lift animate-fade-up" style={{ animationDelay: '200ms' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Signal breakdown</p>
        <p className="tabular text-xs text-slate-500">
          overall <span className="font-medium text-slate-300">{score.total.toFixed(1)}</span>/100 ·{' '}
          {covered}/{score.categories.length} categories measured ·{' '}
          {(score.coverage * 100).toFixed(0)}% data coverage
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {score.categories.map((category) => (
          <CategoryCard key={category.category} category={category} />
        ))}
        {/* Seven categories leave a hole in a three-column grid. Rather than an
            empty cell, the last slot carries the two numbers that qualify every
            other card: how much of the model ran, and which model it was. */}
        <CoverageCard score={score} covered={covered} />
      </div>
    </section>
  );
}

function CoverageCard({ score, covered }: { score: ScoreResult; covered: number }) {
  const coveragePct = score.coverage * 100;

  return (
    <div className="rounded-xl border border-dashed border-ink-700/70 bg-ink-900/20 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-300">Data coverage</p>
        <p className="tabular font-mono text-sm font-bold text-slate-300">
          {coveragePct.toFixed(0)}%
        </p>
      </div>

      <Meter value={coveragePct} className="mt-2.5" />

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {covered} of {score.categories.length} categories had data. Missing ones are removed from
        the average, never scored zero.
      </p>
      <p className="tabular mt-1 font-mono text-[11px] text-slate-600">{score.version}</p>
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryScore }) {
  const meta = CATEGORY_META[category.category] ?? {
    label: category.category,
    blurb: '',
  };
  const measured = category.contributions.filter((c) => c.value !== null).length;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        category.score === null
          ? 'border-ink-700/60 bg-ink-900/30'
          : 'border-ink-700 bg-ink-850/60 hover:border-ink-600'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-200">{meta.label}</p>
        <p className={`tabular font-mono text-sm font-bold ${scoreText(category.score)}`}>
          {category.score === null ? 'n/a' : category.score.toFixed(0)}
        </p>
      </div>

      <Meter value={category.score} className="mt-2.5" />

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {category.score === null ? 'Not measured — no data for this category.' : meta.blurb}
      </p>

      {category.score !== null && (
        <p className="tabular mt-1 text-[11px] text-slate-600">
          {measured}/{category.contributions.length} signals ·{' '}
          {(category.weight * 100).toFixed(0)}% of model
        </p>
      )}
    </div>
  );
}
