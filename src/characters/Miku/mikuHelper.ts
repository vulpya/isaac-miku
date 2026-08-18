import { CollectibleType } from "isaac-typescript-definitions";
import type { NoteInstance } from "../../entities/pickups/NotePickup/NotePickup";
import { getData } from "../../util/data";
import type { TaintedMikuData } from "./MikuTaintedCharacter";

export enum MikuAttackMode {
  EMPTY,
  VOICES,
}

// eslint-disable-next-line complete/require-capital-read-only
const NOTE_DISABLED_ITEMS: CollectibleType[] = [
  CollectibleType.MOMS_KNIFE,
  CollectibleType.SPIRIT_SWORD,
  CollectibleType.LUDOVICO_TECHNIQUE,
] as const;

/**
 * Gets Tainted Miku's current note inventory.
 *
 * @param player The Tainted Miku player entity.
 * @returns Tainted Miku's note inventory.
 */
export const getMikuNotes = (player: EntityPlayer): NoteInstance[] => {
  const playerData = getData<TaintedMikuData>(player);

  playerData.notes ??= [];

  return playerData.notes;
};

/**
 * Checks whether Tainted Miku has at least one note.
 *
 * @param player The Tainted Miku player entity.
 * @returns `true` if Tainted Miku has one or more notes.
 */
export const hasMikuNotes = (player: EntityPlayer): boolean =>
  getMikuNotes(player).length > 0;

/**
 * Checks whether Tainted Miku is currently in Empty mode.
 *
 * @param player The Tainted Miku player entity.
 * @returns `true` if Tainted Miku is in Empty mode.
 */
export const isMikuEmptyMode = (player: EntityPlayer): boolean => {
  const playerData = getData<TaintedMikuData>(player);

  return playerData.attackMode === MikuAttackMode.EMPTY;
};

/**
 * Checks whether Tainted Miku is currently in Voices mode.
 *
 * @param player The Tainted Miku player entity.
 * @returns `true` if Tainted Miku is in Voices mode.
 */
export const isMikuVoicesMode = (player: EntityPlayer): boolean => {
  const playerData = getData<TaintedMikuData>(player);

  return playerData.attackMode === MikuAttackMode.VOICES;
};

/**
 * Changes Tainted Miku's attack mode.
 *
 * When entering Voices mode, collectibles that are incompatible with notes are temporarily removed
 * and stored. When returning to Empty mode, those collectibles are restored.
 *
 * @param player The Tainted Miku player entity.
 * @param mode The attack mode to switch to.
 */
export const setMikuAttackMode = (
  player: EntityPlayer,
  mode: MikuAttackMode,
): void => {
  const playerData = getData<TaintedMikuData>(player);

  if (playerData.attackMode === mode) {
    return;
  }

  playerData.storedCollectibles ??= new Set();

  if (mode === MikuAttackMode.VOICES) {
    for (const item of NOTE_DISABLED_ITEMS) {
      if (player.HasCollectible(item)) {
        playerData.storedCollectibles.add(item);
        player.RemoveCollectible(item);
      }
    }
  } else {
    for (const item of playerData.storedCollectibles) {
      player.AddCollectible(item);
    }

    playerData.storedCollectibles = new Set();
  }

  playerData.attackMode = mode;
};

/**
 * Checks whether a collectible is disabled while Tainted Miku is using her Voices mode.
 *
 * @param collectible The collectible being checked.
 * @returns `true` if the collectible is incompatible with Voices mode.
 */
export const isNoteItemDisabled = (collectible: CollectibleType): boolean =>
  NOTE_DISABLED_ITEMS.includes(collectible);
