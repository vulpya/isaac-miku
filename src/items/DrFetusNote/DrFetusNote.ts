import type { EIDExtended } from "../../compat/EID";
import { Debugger } from "../../util/debug";
import { Item } from "../Item";
import { CollectibleTypeCustom } from "../enum";

const NAME = "Dr. Fetus Note";
const DESCRIPTION = `Replaces {{Collectible52}} Dr. Fetus#{{Collectible${CollectibleTypeCustom.DR_FETUS_NOTE}}} Dr. Fetus Explosive Notes can now drop from enemies`;

export class DrFetusNote extends Item {
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.DR_FETUS_NOTE, DESCRIPTION);
    Debugger.eid(NAME, "Add description.");
  }
}
