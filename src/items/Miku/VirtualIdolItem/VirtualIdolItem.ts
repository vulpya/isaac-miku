import { ModCallback } from "isaac-typescript-definitions";
import { Callback } from "isaacscript-common";
import { isMiku } from "../../../characters/enum";
import { MikuAttackMode } from "../../../characters/Miku/mikuHelper";
import type { TaintedMikuData } from "../../../characters/Miku/MikuTaintedCharacter";
import type { EIDExtended } from "../../../compat/EID";
import { TearVariantCustom } from "../../../entities/tears/enum";
import { getData } from "../../../util/data";
import { Debugger } from "../../../util/debug";
import { CollectibleTypeCustom } from "../../enum";
import { Item } from "../../Item";

const NAME = "Virtual Idol";

const DESCRIPTION =
  "Tears are now musical notes with a chance to charm enemies#sometimes enemies will be charmed permanently!";

export class VirtualIdolItem extends Item {
  /**
   * Applies `Musical Note` tears.
   *
   * Only applies the effect if:
   * - The player is `Miku`, or
   * - The player is Tainted Miku, or
   * - The player holds this collectible item.
   *
   * Tainted Miku:
   * - No notes in inventory -> Blood Notes.
   * - EMPTY mode -> Blood Notes.
   * - VOICES mode -> Lost Notes.
   *
   * @param tear The tear entity that was just initialized.
   */
  @Callback(ModCallback.POST_FIRE_TEAR)
  override postFireTear(tear: EntityTear): void {
    const player = tear.SpawnerEntity?.ToPlayer();

    if (!player) {
      return;
    }

    const mikuType = isMiku(player);
    const mikuBType = isMiku(player, true);

    if (
      !player.HasCollectible(CollectibleTypeCustom.VIRTUAL_IDOL)
      && !(mikuType || mikuBType)
    ) {
      return;
    }

    if (mikuType) {
      tear.ChangeVariant(TearVariantCustom.MUSICAL_NOTE);

      Debugger.item(NAME, "Converted tear to Musical Note");

      return;
    }

    if (mikuBType) {
      const mikuBData = getData<TaintedMikuData>(player);

      /*
       * If Tainted Miku has no notes,
       * always use Blood Notes.
       */
      if (!mikuBData.notes || mikuBData.notes.length === 0) {
        tear.ChangeVariant(TearVariantCustom.BLOOD_NOTE);

        Debugger.item(NAME, "Converted tear to Blood Note");

        return;
      }

      /*
       * EMPTY mode uses Blood Notes.
       * VOICES mode uses Lost Notes.
       */
      if (mikuBData.attackMode === MikuAttackMode.EMPTY) {
        tear.ChangeVariant(TearVariantCustom.BLOOD_NOTE);

        Debugger.item(NAME, "Converted tear to Blood Note");
      } else {
        tear.ChangeVariant(TearVariantCustom.LOST_NOTE);

        Debugger.item(NAME, "Converted tear to Lost Note");
      }
    }
  }

  /**
   * Registers this item with the External Item Descriptions (EID) system.
   *
   * Adds the collectible's name and description for in-game display.
   *
   * @param eid Extended EID API instance.
   */
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.VIRTUAL_IDOL, DESCRIPTION, NAME);

    Debugger.eid(NAME, "Add description.");
  }
}
