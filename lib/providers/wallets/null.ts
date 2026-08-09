import type { ProviderContext, WalletDataProvider } from '@/lib/providers/types';
import { unavailable } from '@/lib/providers/types';
import type { ProviderResult, WalletData } from '@/lib/types/domain';

/**
 * Default wallet provider: reports unavailable.
 *
 * This exists so the pipeline has a real object to talk to when HELIUS_API_KEY
 * is absent. It never fabricates activity — the wallet scoring category simply
 * drops out of the model and its weight is redistributed.
 */
export class NullWalletDataProvider implements WalletDataProvider {
  readonly name = 'none';
  readonly available = false;
  readonly unavailableReason = 'Wallet activity requires HELIUS_API_KEY.';

  async getWalletData(_ctx: ProviderContext): Promise<ProviderResult<WalletData>> {
    return unavailable<WalletData>(this.name, this.unavailableReason);
  }
}
