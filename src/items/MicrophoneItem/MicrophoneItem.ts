import type {
  ActiveSlot,
  CollectibleType,
  UseFlag,
} from "isaac-typescript-definitions";
import { ModCallback } from "isaac-typescript-definitions";
import { Callback } from "isaacscript-common";
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
    _player: EntityPlayer,
    _flags: BitFlags<UseFlag>,
    _slot: ActiveSlot,
    _data: int,
  ): UseItemResult {
    const enemies = getEnemies().filter(isCharmable);

    let count = 0;
    for (const enemy of enemies) {
      charmEnemy(enemy, 0, true);
      count++;
    }

    Debugger.item(NAME, `Turned ${count} enemies into fans.`);

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
