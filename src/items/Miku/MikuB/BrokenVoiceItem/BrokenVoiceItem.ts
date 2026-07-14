import type {
  ActiveSlot,
  CollectibleType,
  UseFlag,
} from "isaac-typescript-definitions";
import { ModCallback } from "isaac-typescript-definitions";
import { Callback } from "isaacscript-common";
import { isMiku } from "../../../../characters/enum";
import {
  MikuAttackMode,
  setMikuAttackMode,
} from "../../../../characters/Miku/mikuHelper";
import type { TaintedMikuData } from "../../../../characters/Miku/MikuTaintedCharacter";
import type { EIDExtended } from "../../../../compat/EID";
import { getData } from "../../../../util/data";
import { Debugger } from "../../../../util/debug";
import type { UseItemResult } from "../../../ActiveItem";
import { ActiveItem } from "../../../ActiveItem";
import { CollectibleTypeCustom } from "../../../enum";

const NAME = "Broken Voice";
const DESCRIPTION =
  'Toggle between silence and voices.#{{ColorGray}}"it\'s not your voice anymore"';

export class BrokenVoiceItem extends ActiveItem {
  /**
   * Handles the use of the Broken Voice pocket active item.
   *
   * When used, toggles the Notes mode for Tainted Miku.
   *
   * @returns A {@link UseItemResult} object that:
   * - Discharges the item (consumes its charge)
   * - Keeps the item
   * - Plays the use animation
   */
  @Callback(ModCallback.POST_USE_ITEM, CollectibleTypeCustom.BROKEN_VOICE)
  override onPostUseItem(
    _collectibleType: CollectibleType,
    _rng: RNG,
    player: EntityPlayer,
    _flags: BitFlags<UseFlag>,
    _slot: ActiveSlot,
    _data: int,
  ): UseItemResult {
    if (isMiku(player, true)) {
      const playerData = getData<TaintedMikuData>(player);

      setMikuAttackMode(
        player,
        playerData.attackMode === MikuAttackMode.GLITCH
          ? MikuAttackMode.VOICES
          : MikuAttackMode.GLITCH,
      );
    }

    return {
      Discharge: true,
      Remove: false,
      ShowAnim: true,
    };
  }

  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.BROKEN_VOICE, DESCRIPTION);
    Debugger.eid(NAME, "Add description.");
  }
}
