import type { PlayerData } from "../characters/Character";
import { getData } from "./data";

const tearsToMaxFireDelay = (tears: number): number => 30 / tears - 1;

/**
 * Sets base stat the MaxFireDelay for the player. It calculates the tears value to the fire delay.
 *
 * @param player The player the fire rate should be applied too.
 * @param tears Tear Rate that should be applied.
 */
export const setFireRate = <T extends PlayerData>(
  player: EntityPlayer,
  tears: number,
): void => {
  const data = getData<T>(player);
  if (!(data.fireDelayInit ?? false)) {
    const currentTears = 30 / (player.MaxFireDelay + 1);

    const newTears = currentTears + tears;

    const clampedTears = Math.max(0.1, newTears);

    player.MaxFireDelay = tearsToMaxFireDelay(clampedTears);
  }
};
