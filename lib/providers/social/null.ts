import type { ProviderContext, SocialDataProvider } from '@/lib/providers/types';
import { unavailable } from '@/lib/providers/types';
import type { ProviderResult, SocialData } from '@/lib/types/domain';

/**
 * Social momentum is architecturally supported and deliberately not implemented
 * (spec §9: do not fake social data). Wiring a real provider means implementing
 * SocialDataProvider and registering it in lib/providers/registry.ts — nothing
 * downstream needs to change, because the scoring layer already treats an
 * unavailable category as weight to redistribute rather than a zero.
 */
export class NullSocialDataProvider implements SocialDataProvider {
  readonly name = 'none';
  readonly available = false;
  readonly unavailableReason = 'Social signals are not wired up in this MVP.';

  async getSocialData(_ctx: ProviderContext): Promise<ProviderResult<SocialData>> {
    return unavailable<SocialData>(this.name, this.unavailableReason);
  }
}
