import type { CollectibleType } from "isaac-typescript-definitions";
import type { PlayerData } from "../characters/Character";
import { getData } from "./data";

const tearsToMaxFireDelay = (tears: number): number => 30 / tears - 1;

export const getFireRateMultiplier = (
  player: EntityPlayer,
  entries: Partial<Record<CollectibleType, number>>,
): number => {
  let multiplier = 1;

  for (const [item, value] of Object.entries(entries) as Array<
    [string, number | undefined]
  >) {
    const collectible = Number(item) as CollectibleType;

    if (value !== undefined && player.HasCollectible(collectible)) {
      multiplier *= value;
    }
  }

  return multiplier;
};

/**
 * Sets base stat the MaxFireDelay for the player. It calculates the tears value to the fire delay.
 *
 * @param player The player the fire rate should be applied too.
 * @param tears Tear Rate that should be applied.
 */
export const setFireRate = <T extends PlayerData>(
  player: EntityPlayer,
  tears: number,
  multiplier = 1,
): void => {
  const data = getData<T>(player);

  if (!(data.fireDelayInit ?? false)) {
    const currentTears = 30 / (player.MaxFireDelay + 1);

    const modifiedTears = tears * multiplier;

    const newTears = currentTears + modifiedTears;

    const clampedTears = Math.max(0.1, newTears);

    player.MaxFireDelay = tearsToMaxFireDelay(clampedTears);
  }
};
