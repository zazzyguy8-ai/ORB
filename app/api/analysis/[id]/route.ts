import { NextResponse } from 'next/server';
import { getDb, getUserIdFromToken } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A stored analysis with its recorded outcome checkpoints. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Persistence is not configured.' }, { status: 503 });

  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: 'Invalid analysis id.' }, { status: 400 });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const userId = await getUserIdFromToken(token);

  const { data, error } = await db
    .from('analyses')
    .select(
      'id,address,decision,confidence,score,coverage,reasons,risk_notes,metrics,category_scores,availability,created_at,user_id,tokens(symbol,name),risk_flags(code,severity,title,detail,veto),analysis_outcomes(checkpoint,status,return_pct,price_usd,recorded_at)',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Anonymous analyses are shareable; a signed-in user's analyses are theirs.
  if (data.user_id && data.user_id !== userId) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { user_id: _omit, ...analysis } = data as Record<string, unknown>;
  return NextResponse.json({ analysis });
}
