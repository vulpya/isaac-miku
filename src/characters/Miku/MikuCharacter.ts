import {
  ActiveSlot,
  CacheFlag,
  ModCallback,
  PlayerVariant,
} from "isaac-typescript-definitions";
import {
  Callback,
  CallbackCustom,
  ModCallbackCustom,
  ReadonlyMap,
} from "isaacscript-common";
import type { EIDExtended } from "../../compat/EID";
import { CollectibleTypeCustom } from "../../items/enum";
import { getData } from "../../util/data";
import { Debugger } from "../../util/debug";
import type { PlayerData } from "../Character";
import { Character } from "../Character";
import { PlayerTypeCustom } from "../enum";

export interface MikuPlayerData extends PlayerData {
  hasIdol?: boolean;
}

const NAME = "Miku";
const DESCRIPTION = "Uses music to charm enemies.";
const BIRTHRIGHT_DESC =
  "Chance to permanently charm enemies. Scales with Luck.";
const ACTIVE = CollectibleTypeCustom.MICROPHONE;
const NULL_ITEM = CollectibleTypeCustom.MIKU_IDOL;
const HAIR = Isaac.GetCostumeIdByPath("gfx/characters/Character_MikuHead.anm2");

export const MIKU_STATS = new ReadonlyMap<CacheFlag, number>([
  [CacheFlag.SPEED, 1.2],
  [CacheFlag.DAMAGE, 2.8],
  [CacheFlag.FIRE_DELAY, 3.33],
]);

export class MikuCharacter extends Character {
  /**
   * Called after Miku is initialized.
   *
   * Adds Miku's hair costume & gives Miku's starting item, the Microphone.
   *
   * @param player The player entity being initialized.
   * @see {@link EntityPlayer} The entity player class.
   */
  @CallbackCustom(
    ModCallbackCustom.POST_PLAYER_INIT_FIRST,
    PlayerVariant.PLAYER,
    PlayerTypeCustom.MIKU,
  )
  override postPlayerInitFirst(player: EntityPlayer): void {
    player.AddNullCostume(HAIR);
    Debugger.char(NAME, `applied null costume: ${HAIR}.`);

    const playerData = getData<MikuPlayerData>(player);

    if (!(playerData.hasIdol ?? false)) {
      player.AddCollectible(NULL_ITEM, 0);
      playerData.hasIdol = true;
      Debugger.char(NAME, `Applied null item: ${NULL_ITEM}.`);
    }

    if (!player.HasCollectible(ACTIVE)) {
      player.AddCollectible(ACTIVE, ActiveSlot.PRIMARY, false);
      Debugger.char(NAME, "Give microphone active item.");
    }
  }

  @Callback(ModCallback.POST_PLAYER_INIT)
  override postPlayerInit(player: EntityPlayer): void {
    super.postPlayerInit(player);
  }

  /**
   * Sets up **External Item Descriptions (EID)** compatibility for Miku.
   *
   * This method registers the player icon, character info, and birthright description with EID, so
   * that in-game tooltips display properly for Miku.
   *
   * @param eid The `EIDExtended` instance used to add compatibility.
   * @see {@link EIDExtended}
   */
  override setupEID(eid: EIDExtended): void {
    const icons = Sprite();
    icons.Load("gfx/player_icons.anm2", true);
    eid.addIcon(
      `Player${PlayerTypeCustom.MIKU}`,
      "Players",
      0,
      16,
      16,
      0,
      0,
      icons,
    );
    eid.addCharacterInfo(PlayerTypeCustom.MIKU, DESCRIPTION, NAME);
    eid.addBirthright(PlayerTypeCustom.MIKU, BIRTHRIGHT_DESC, NAME);
    Debugger.eid(NAME, "Setup description and birthright description.");
  }
}
