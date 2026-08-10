import { AnalyzeForm } from '@/components/AnalyzeForm';

export const metadata = { title: 'Analyze — ORB Signal' };

export default function AnalyzePage({ searchParams }: { searchParams: { address?: string } }) {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tightest text-slate-50">
          Paste a token. Get the signal.
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Solana mints only. Read-only analysis — nothing is ever signed or sent.
        </p>
      </div>

      <AnalyzeForm initialAddress={searchParams.address ?? ''} />
    </div>
  );
}
