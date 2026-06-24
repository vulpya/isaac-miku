import type {
  ActiveSlot,
  CollectibleType,
  UseFlag,
} from "isaac-typescript-definitions";
import { Item } from "./Item";

/** Result of the `ModCallback.POST_USE_ITEM` callback. */
export interface UseItemResult {
  Discharge: boolean;
  Remove: boolean;
  ShowAnim: boolean;
}

/** Abstract base class representing a custom active item. */
export abstract class ActiveItem extends Item {
  protected readonly active = true;

  /**
   * Called after an active item is used (`ModCallback.POST_USE_ITEM`).
   *
   * @param collectibleType The ID of the item that was used.
   * @param rng The RNG instance associated with the item use.
   * @param player The player who used the item.
   * @param useFlags Flags describing how the item was used (e.g. via card, pill, etc.).
   * @param activeSlot The active item slot the item was used from.
   * @param customVarData Custom variable data passed from the item (if any).
   * @returns A {@link UseItemResult} object
   */
  onPostUseItem?(
    collectibleType: CollectibleType,
    rng: RNG,
    player: EntityPlayer,
    useFlags: BitFlags<UseFlag>,
    activeSlot: ActiveSlot,
    customVarData: int,
  ): UseItemResult;
}
