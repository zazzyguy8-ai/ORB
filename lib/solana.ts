import type { Tier } from './products'

/**
 * The crypto payment rail: pay in USDC on Solana, paste the transaction
 * signature, get unlocked.
 *
 * A large share of this audience will not put a card into a website but will
 * send USDC without thinking about it. This rail exists for them.
 *
 * We only ever *read* the chain. There is no wallet, no private key and no
 * signing anywhere in this codebase — the buyer sends from their own wallet
 * to an address you own, and we ask an RPC node whether that happened.
 *
 * Config:
 *   SOLANA_RECEIVE_ADDRESS=<your wallet's base58 address>
 *   SOLANA_RPC_URL=<optional; defaults to the public mainnet endpoint>
 *
 * The public endpoint is rate-limited and will fall over under real traffic.
 * Point SOLANA_RPC_URL at Helius/QuickNode/Triton before you drive volume.
 */

/** Circle's USDC mint on Solana mainnet. */
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

/** Reject receipts older than this, so a stale signature cannot be shopped around. */
const MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

/** Base58 alphabet — no 0, O, I or l. Signatures and addresses both use it. */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/

export function solanaConfigured(): boolean {
  return Boolean(process.env.SOLANA_RECEIVE_ADDRESS)
}

export function receiveAddress(): string | null {
  return process.env.SOLANA_RECEIVE_ADDRESS ?? null
}

export function isPlausibleSignature(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 64 &&
    value.length <= 100 &&
    BASE58.test(value)
  )
}

function rpcUrl(): string {
  return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
}

interface TokenBalance {
  accountIndex: number
  mint: string
  owner?: string
  uiTokenAmount: { amount: string }
}

export type VerifyResult =
  | { ok: true; paid: number }
  | { ok: false; reason: string }

/**
 * Confirm that `signature` moved at least the tier's USDC price into our
 * receiving address.
 *
 * Reading the token-balance deltas rather than decoding instructions means
 * this works no matter how the transfer was constructed — a plain transfer, a
 * transfer-checked, a wallet's batched instruction, or a swap that happens to
 * settle USDC into the address.
 */
export async function verifyUsdcPayment(
  signature: string,
  tier: Tier
): Promise<VerifyResult> {
  const destination = receiveAddress()
  if (!destination) return { ok: false, reason: 'Crypto payments are not enabled.' }
  if (!isPlausibleSignature(signature)) {
    return { ok: false, reason: 'That does not look like a Solana transaction signature.' }
  }

  let payload: unknown
  try {
    const response = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
        ],
      }),
      cache: 'no-store',
    })
    if (!response.ok) {
      return { ok: false, reason: 'Could not reach a Solana node. Try again in a moment.' }
    }
    payload = await response.json()
  } catch {
    return { ok: false, reason: 'Could not reach a Solana node. Try again in a moment.' }
  }

  const result = (payload as { result?: unknown }).result as
    | {
        meta?: {
          err?: unknown
          preTokenBalances?: TokenBalance[]
          postTokenBalances?: TokenBalance[]
        }
        blockTime?: number | null
      }
    | null
    | undefined

  if (!result) {
    return {
      ok: false,
      reason: 'That transaction is not confirmed yet, or the node has not seen it. Wait a few seconds and retry.',
    }
  }
  if (result.meta?.err) {
    return { ok: false, reason: 'That transaction failed on-chain.' }
  }

  if (typeof result.blockTime === 'number') {
    const ageSeconds = Math.floor(Date.now() / 1000) - result.blockTime
    if (ageSeconds > MAX_AGE_SECONDS) {
      return { ok: false, reason: 'That transaction is more than 24 hours old.' }
    }
  }

  const post = result.meta?.postTokenBalances ?? []
  const pre = result.meta?.preTokenBalances ?? []

  // Sum the increase across every USDC account owned by our address. A wallet
  // may route through more than one, and summing is the honest reading.
  let delta = 0n
  for (const entry of post) {
    if (entry.mint !== USDC_MINT || entry.owner !== destination) continue
    const before = pre.find((p) => p.accountIndex === entry.accountIndex)
    const beforeAmount = BigInt(before?.uiTokenAmount.amount ?? '0')
    const afterAmount = BigInt(entry.uiTokenAmount.amount ?? '0')
    if (afterAmount > beforeAmount) delta += afterAmount - beforeAmount
  }

  if (delta === 0n) {
    return {
      ok: false,
      reason: `That transaction did not send USDC to ${destination}.`,
    }
  }

  if (delta < BigInt(tier.usdcAmount)) {
    const sent = Number(delta) / 1_000_000
    return {
      ok: false,
      reason: `That transaction sent ${sent} USDC, but ${tier.name} costs ${tier.usdcDisplay}.`,
    }
  }

  return { ok: true, paid: Number(delta) / 1_000_000 }
}
