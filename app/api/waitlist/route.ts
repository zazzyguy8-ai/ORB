import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { checkIpLimit, clientIp } from '@/lib/ratelimit/limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Tell me when the paid plan exists."
 *
 * The one question this answers is whether anybody would pay, which is the
 * evidence missing before building a paywall. So it stores an address and
 * nothing else — no name, no pre-ticked consent box, no tracking columns.
 *
 * A duplicate is a success, not an error: someone who signs up twice has done
 * nothing wrong and should not be told they have.
 */

/** Deliberately loose. Strict email regexes reject valid addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_LENGTH = 254;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const raw = (body as { email?: unknown })?.email;
  const email = typeof raw === 'string' ? raw.trim() : '';

  if (email.length > MAX_LENGTH || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }

  // A signup form with no limit is a spam endpoint with extra steps.
  const limit = checkIpLimit(`waitlist:${clientIp(request.headers)}`, 5);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Not available right now.' }, { status: 503 });
  }

  try {
    const { error } = await db
      .from('waitlist')
      .upsert({ email, source: 'pricing' }, { onConflict: 'email', ignoreDuplicates: true });

    // A write failure is ours, not the visitor's, and there is nothing useful
    // they could do with the detail.
    if (error) return NextResponse.json({ error: 'Could not save that.' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'Could not save that.' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
