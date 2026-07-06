import type { CollectibleType } from "isaac-typescript-definitions";
import {
  addCollectibleCostume,
  removeCollectibleCostume,
} from "isaacscript-common";

/**
 * Updates collectible costumes based on a mapping of owned collectibles.
 * - Adds the corresponding costume when the player owns the mapped collectible.
 * - Removes the costume when the collectible is no longer owned.
 *
 * @param player The player whose collectible costumes should be updated.
 * @param costumes A mapping of collectible IDs to the costume collectible they should apply.
 */
export const updateCollectibleCostumes = (
  player: EntityPlayer,
  costumes: Partial<Record<CollectibleType, CollectibleType>>,
): void => {
  for (const [item, costume] of Object.entries(costumes)) {
    const collectible = Number(item) as CollectibleType;
    const costumeCollectible = costume;

    if (player.HasCollectible(collectible)) {
      addCollectibleCostume(player, costumeCollectible);
    } else {
      removeCollectibleCostume(player, costumeCollectible);
    }
  }
};
