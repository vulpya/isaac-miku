import { CollectibleType } from "isaac-typescript-definitions";
import { getData } from "../../util/data";
import type { TaintedMikuData } from "./MikuTaintedCharacter";

export enum MikuAttackMode {
  GLITCH,
  VOICES,
}

// eslint-disable-next-line complete/require-capital-read-only
const NOTE_DISABLED_ITEMS: CollectibleType[] = [
  CollectibleType.MOMS_KNIFE,
  CollectibleType.SPIRIT_SWORD,
  CollectibleType.LUDOVICO_TECHNIQUE,
] as const;

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

export const isNoteItemDisabled = (collectible: CollectibleType): boolean =>
  NOTE_DISABLED_ITEMS.includes(collectible);
