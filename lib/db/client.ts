import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/config/env';

/**
 * Server-side Supabase client using the service role key.
 *
 * Never import this from a client component — the service role bypasses RLS.
 * Returns null when Supabase is not configured, and every caller is written to
 * treat that as "persistence off", not as an error: the analyzer must still work
 * for someone who has only cloned the repo and added an Anthropic key.
 */
let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  client = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Verifies a browser-issued access token and returns the user id, or null. */
export async function getUserIdFromToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
