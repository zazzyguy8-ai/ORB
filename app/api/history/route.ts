import { NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/lib/db/client';
import { isSupabaseConfigured } from '@/lib/config/env';
import { listRecentAnalyses } from '@/lib/db/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ analyses: [], persistence: 'disabled' });
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const userId = await getUserIdFromToken(token);
  const analyses = await listRecentAnalyses(userId);

  return NextResponse.json({ analyses, persistence: 'enabled', scope: userId ? 'user' : 'anonymous' });
}
