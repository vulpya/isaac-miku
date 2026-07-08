import { ModCallback } from "isaac-typescript-definitions";
import { Callback } from "isaacscript-common";
import { isMiku } from "../../../characters/enum";
import type { EIDExtended } from "../../../compat/EID";
import { TearVariantCustom } from "../../../entities/tears/enum";
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
   * - The player is `Miku` and has the `MikuNullItem` state enabled, OR
   * - The player holds this collectible item
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
    } else if (mikuBType) {
      tear.ChangeVariant(TearVariantCustom.GLITCH_NOTE);
      Debugger.item(NAME, "Converted tear to Glitch Note");
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
