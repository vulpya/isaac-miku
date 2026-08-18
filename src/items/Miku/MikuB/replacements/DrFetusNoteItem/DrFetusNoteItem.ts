import { CollectibleType } from "isaac-typescript-definitions";
import type { EIDExtended } from "../../../../../compat/EID";
import { Debugger } from "../../../../../util/debug";
import { CollectibleTypeCustom } from "../../../../enum";
import { Item } from "../../../../Item";

const NAME = "Dr. Fetus Note";
const DESCRIPTION = `{{Collectible${CollectibleType.DR_FETUS}}} Dr. Fetus Notes can now drop from enemies.`;

export class DrFetusNoteItem extends Item {
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.DR_FETUS_NOTE, DESCRIPTION);
    Debugger.eid(NAME, "Add description.");
  }
}
