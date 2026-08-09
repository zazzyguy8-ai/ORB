/**
 * Solana address validation.
 *
 * A regex over the base58 alphabet is not enough — plenty of 32–44 character
 * base58 strings do not decode to a 32-byte public key. We decode properly so
 * that a malformed paste is rejected before it costs us a provider round trip.
 */

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58_MAP: Record<string, number> = Object.fromEntries(
  B58_ALPHABET.split('').map((c, i) => [c, i]),
);

/** Returns the decoded bytes, or null when the string is not valid base58. */
export function base58Decode(input: string): Uint8Array | null {
  if (input.length === 0) return null;

  const bytes: number[] = [0];
  for (const char of input) {
    const value = B58_MAP[char];
    if (value === undefined) return null;

    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Leading '1's in base58 are leading zero bytes.
  for (let i = 0; i < input.length && input[i] === '1'; i++) bytes.push(0);

  return Uint8Array.from(bytes.reverse());
}

export interface AddressValidation {
  valid: boolean;
  address: string;
  error?: string;
}

export function validateSolanaAddress(raw: unknown): AddressValidation {
  if (typeof raw !== 'string') {
    return { valid: false, address: '', error: 'Address must be a string.' };
  }

  const address = raw.trim();

  if (address.length === 0) {
    return { valid: false, address, error: 'Enter a token contract address.' };
  }
  if (address.length < 32 || address.length > 44) {
    return {
      valid: false,
      address,
      error: 'A Solana mint address is 32–44 characters. Check the address and try again.',
    };
  }
  if (address.startsWith('0x')) {
    return {
      valid: false,
      address,
      error: 'That looks like an EVM address. This MVP supports Solana only.',
    };
  }

  const decoded = base58Decode(address);
  if (!decoded) {
    return { valid: false, address, error: 'Address contains characters that are not base58.' };
  }
  if (decoded.length !== 32) {
    return { valid: false, address, error: 'Address does not decode to a 32-byte Solana public key.' };
  }

  return { valid: true, address };
}

/** Well-known mints we never want to burn an analysis on. */
export const QUOTE_MINTS = new Set([
  'So11111111111111111111111111111111111111112', // wSOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);
