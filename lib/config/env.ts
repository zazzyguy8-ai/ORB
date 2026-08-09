/**
 * Single server-side entry point for configuration.
 *
 * Nothing here may be imported from a client component. Only values explicitly
 * prefixed NEXT_PUBLIC_ are safe in the browser, and those are re-exported from
 * lib/config/public.ts instead.
 */

function str(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : null;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  anthropicApiKey: str('ANTHROPIC_API_KEY'),
  anthropicModel: str('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5',

  supabaseUrl: str('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: str('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: str('SUPABASE_SERVICE_ROLE_KEY'),

  solanaRpcUrl: str('SOLANA_RPC_URL') ?? 'https://api.mainnet-beta.solana.com',
  heliusApiKey: str('HELIUS_API_KEY'),
  goplusAppKey: str('GOPLUS_APP_KEY'),
  goplusAppSecret: str('GOPLUS_APP_SECRET'),

  cronSecret: str('CRON_SECRET'),
  telegramBotToken: str('TELEGRAM_BOT_TOKEN'),

  /** Per-provider network deadline. Nothing in the hot path may exceed it. */
  providerTimeoutMs: num('PROVIDER_TIMEOUT_MS', 2500),
  /** Soft deadline for the LLM call; on expiry we render the deterministic text. */
  aiTimeoutMs: num('AI_TIMEOUT_MS', 3500),

  anonAnalysesPerDay: num('ANON_ANALYSES_PER_DAY', 3),
  ipRequestsPerMinute: num('IP_REQUESTS_PER_MINUTE', 10),
} as const;

export type ProviderKey = 'market' | 'security' | 'holders' | 'wallets' | 'social';

export interface ProviderAvailability {
  key: ProviderKey;
  implementation: string;
  available: boolean;
  requires: string | null;
}

/** Reported by /api/health and shown in the UI's diagnostics block. */
export function providerAvailability(): ProviderAvailability[] {
  return [
    { key: 'market', implementation: 'dexscreener', available: true, requires: null },
    { key: 'security', implementation: 'goplus', available: true, requires: null },
    { key: 'holders', implementation: 'solana-rpc+goplus', available: true, requires: null },
    {
      key: 'wallets',
      implementation: env.heliusApiKey ? 'helius-large-flow' : 'none',
      available: Boolean(env.heliusApiKey),
      requires: env.heliusApiKey ? null : 'HELIUS_API_KEY',
    },
    {
      key: 'social',
      implementation: 'none',
      available: false,
      requires: 'no reputable social provider wired up yet — see docs/ARCHITECTURE.md §0',
    },
  ];
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isAiConfigured(): boolean {
  return Boolean(env.anthropicApiKey);
}
