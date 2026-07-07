import type { ActiveSlot, UseFlag } from "isaac-typescript-definitions";
import {
  CollectibleType,
  EntityType,
  ModCallback,
  RoomType,
} from "isaac-typescript-definitions";
import { Callback, spawnCollectible } from "isaacscript-common";
import type { EIDExtended } from "../../compat/EID";
import { Debugger } from "../../util/debug";
import { charmEnemy, getEnemies, isCharmable } from "../../util/enemies";
import type { UseItemResult } from "../ActiveItem";
import { ActiveItem } from "../ActiveItem";
import { CollectibleTypeCustom } from "../enum";

const NAME = "Microphone";
const DESCRIPTION =
  "Charms all enemies in the room, making them permanent fans";

export class MicrophoneItem extends ActiveItem {
  /**
   * Handles the use of the Microphone active item.
   *
   * When used, charms all vulnerable, non-boss enemies in the current room, turning them into fans.
   *
   * @returns A {@link UseItemResult} object that:
   * - Discharges the item (consumes its charge)
   * - Keeps the item
   * - Plays the use animation
   */
  @Callback(ModCallback.POST_USE_ITEM, CollectibleTypeCustom.MICROPHONE)
  override onPostUseItem(
    _collectibleType: CollectibleType,
    _rng: RNG,
    player: EntityPlayer,
    _flags: BitFlags<UseFlag>,
    _slot: ActiveSlot,
    _data: int,
  ): UseItemResult {
    const enemies = getEnemies();

    const room = Game().GetRoom();
    const inAngelRoom = room.GetType() === RoomType.ANGEL;

    for (const enemy of enemies) {
      if (inAngelRoom) {
        if (enemy.Type === EntityType.URIEL) {
          if (!player.HasCollectible(CollectibleType.KEY_PIECE_1)) {
            spawnCollectible(
              CollectibleType.KEY_PIECE_1,
              room.FindFreePickupSpawnPosition(enemy.Position),
              player.GetDropRNG(),
            );
          }
          charmEnemy(enemy, 0, true, true);
          continue;
        }

        if (enemy.Type === EntityType.GABRIEL) {
          if (!player.HasCollectible(CollectibleType.KEY_PIECE_2)) {
            spawnCollectible(
              CollectibleType.KEY_PIECE_2,
              room.FindFreePickupSpawnPosition(enemy.Position),
              player.GetDropRNG(),
            );
          }
          charmEnemy(enemy, 0, true, true);
          continue;
        }
      }

      if (isCharmable(enemy)) {
        charmEnemy(enemy, 0, true);
      }
    }

    return {
      Discharge: true,
      Remove: false,
      ShowAnim: true,
    };
  }

  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.MICROPHONE, DESCRIPTION);
    Debugger.eid(NAME, "Add description.");
  }
}
