import { env } from '@/lib/config/env';
import { cacheClear } from '@/lib/cache/memory';
import { describeError } from '@/lib/providers/http';
import { getProviders } from '@/lib/providers/registry';
import type { ProviderResult } from '@/lib/types/domain';

/**
 * First-deploy diagnostics.
 *
 * The providers in this app are written against documented response contracts
 * but were never exercised against the live APIs during development (the build
 * environment's egress policy blocks those hosts — see docs/ARCHITECTURE.md §11).
 * The failure that matters is therefore not "the request failed" — that is loud
 * and obvious — but "the request succeeded and every field came back null
 * because upstream renamed something". That failure is silent: the analysis
 * still returns a decision, just one built on nothing.
 *
 * So this probes two layers separately:
 *   1. Reachability — can we open a connection and what does the host answer?
 *   2. Parse coverage — of the fields our mapper expects, how many arrived?
 *
 * A provider that is reachable but parses to all-nulls is the exact signature
 * of a changed response shape, and the verdict line says so in words.
 */

/** BONK — long-lived, deeply liquid, present in every provider we use. */
export const DEFAULT_PROBE_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

export interface HostProbe {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  bytes: number | null;
  error: string | null;
}

export interface ParseProbe {
  provider: string;
  source: string;
  status: ProviderResult<unknown>['status'];
  latencyMs: number;
  reason: string | null;
  /** Leaf fields that arrived with a value. */
  populated: number;
  /** Leaf fields the mapper defines. */
  total: number;
  /** Field paths that came back null — the actionable part. */
  missing: string[];
}

export interface ProbeReport {
  address: string;
  checkedAt: string;
  totalMs: number;
  reachability: HostProbe[];
  providers: ParseProbe[];
  /** Plain-language findings, worst first. Empty means everything looks right. */
  verdict: string[];
}

/**
 * Flattens a mapped provider object into leaf-path → has-a-value.
 * Arrays count as populated when non-empty; nested objects recurse.
 */
export function fieldCoverage(value: unknown, prefix = ''): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (value === null || typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(child)) {
      out[path] = child.length > 0;
    } else if (child !== null && typeof child === 'object') {
      Object.assign(out, fieldCoverage(child, path));
    } else {
      out[path] = child !== null && child !== undefined;
    }
  }

  return out;
}

async function probeHost(name: string, url: string, init?: RequestInit): Promise<HostProbe> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.providerTimeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const body = await res.text();
    return {
      name,
      url: redact(url),
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - started,
      bytes: body.length,
      error: res.ok ? null : body.slice(0, 200),
    };
  } catch (err) {
    return {
      name,
      url: redact(url),
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      bytes: null,
      error: describeError(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Keeps API keys out of a report that will be pasted into a chat or an issue. */
function redact(url: string): string {
  return url.replace(/([?&](api-key|apikey|key)=)[^&]+/gi, '$1***');
}

function summarise(
  provider: string,
  result: ProviderResult<unknown>,
  maxMissing = 12,
): ParseProbe {
  const coverage = result.status === 'ok' ? fieldCoverage(result.data) : {};
  const entries = Object.entries(coverage);
  const missing = entries.filter(([, present]) => !present).map(([path]) => path);

  return {
    provider,
    source: result.source,
    status: result.status,
    latencyMs: result.latencyMs,
    reason: result.status === 'ok' ? null : result.reason,
    populated: entries.length - missing.length,
    total: entries.length,
    missing: missing.slice(0, maxMissing),
  };
}

/** Turns the raw numbers into the sentences someone reads at 2am after a deploy. */
export function buildVerdict(reachability: HostProbe[], providers: ParseProbe[]): string[] {
  const verdict: string[] = [];

  for (const host of reachability) {
    if (host.ok) continue;

    if (host.status === null) {
      verdict.push(
        `${host.name}: unreachable (${host.error}). Check egress rules and DNS from the deployment.`,
      );
      continue;
    }

    // The upstream body is usually the actual answer — a proxy saying the host
    // is not allowlisted, a provider naming the missing header. Quote it rather
    // than replacing it with a generic "check your configuration".
    const hint =
      host.status === 429
        ? 'Rate limited — add provider credentials or slow the request rate.'
        : host.status === 403
          ? 'Forbidden — usually an egress allowlist on the host platform, or a missing credential.'
          : 'Check the URL and any required credentials.';
    const body = host.error ? ` Upstream said: ${host.error.replace(/\s+/g, ' ').slice(0, 160)}` : '';

    verdict.push(`${host.name}: answered HTTP ${host.status}. ${hint}${body}`);
  }

  for (const probe of providers) {
    if (probe.status === 'error') {
      verdict.push(`${probe.provider}: request failed (${probe.reason}).`);
      continue;
    }
    if (probe.status === 'unavailable') {
      // Expected for wallets/social without credentials — not a defect.
      continue;
    }
    if (probe.total === 0) {
      verdict.push(`${probe.provider}: mapped to an empty object — the mapper returned no fields.`);
      continue;
    }

    const ratio = probe.populated / probe.total;
    if (ratio === 0) {
      verdict.push(
        `${probe.provider}: reachable but EVERY field is null. The upstream response shape has almost certainly changed — compare a raw response against lib/providers/${probe.provider}.`,
      );
    } else if (ratio < 0.5) {
      verdict.push(
        `${probe.provider}: only ${probe.populated}/${probe.total} fields populated. Likely renamed fields: ${probe.missing.slice(0, 5).join(', ')}.`,
      );
    }
  }

  return verdict;
}

export async function probeProviders(address: string): Promise<ProbeReport> {
  const started = Date.now();

  // A cold read is the point — a cached hit would prove nothing about upstream.
  cacheClear();

  const hostChecks: Promise<HostProbe>[] = [
    probeHost('dexscreener', `https://api.dexscreener.com/latest/dex/tokens/${address}`),
    probeHost(
      'goplus',
      `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${address}`,
    ),
    probeHost('solana-rpc', env.solanaRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
    }),
  ];

  if (env.heliusApiKey) {
    hostChecks.push(
      probeHost(
        'helius',
        `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${env.heliusApiKey}&limit=1`,
      ),
    );
  }

  const providers = getProviders();
  const ctx = { chain: 'solana' as const, address, timeoutMs: env.providerTimeoutMs };

  const [reachability, market, security, holders] = await Promise.all([
    Promise.all(hostChecks),
    providers.market.getMarketData(ctx),
    providers.security.getSecurityData(ctx),
    providers.holders.getHolderData(ctx),
  ]);

  // Wallets needs a price, so it runs after market resolves — same as the pipeline.
  const wallets = await providers.wallets.getWalletData({
    ...ctx,
    hint: { priceUsd: market.status === 'ok' ? market.data.priceUsd : null },
  });

  const parsed = [
    summarise('market', market),
    summarise('security', security),
    summarise('holders', holders),
    summarise('wallets', wallets),
  ];

  return {
    address,
    checkedAt: new Date().toISOString(),
    totalMs: Date.now() - started,
    reachability,
    providers: parsed,
    verdict: buildVerdict(reachability, parsed),
  };
}
