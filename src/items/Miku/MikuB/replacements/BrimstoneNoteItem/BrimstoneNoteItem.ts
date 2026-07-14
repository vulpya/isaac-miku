import type { EIDExtended } from "../../../../../compat/EID";
import { Debugger } from "../../../../../util/debug";
import { CollectibleTypeCustom } from "../../../../enum";
import { Item } from "../../../../Item";

const NAME = "Brimstone Note";
const DESCRIPTION = `Replaces {{Collectible118}} Brimstone#{{Collectible${CollectibleTypeCustom.BRIMSTONE_NOTE}}} Brimstone Notes can now drop from enemies`;

export class BrimstoneNoteItem extends Item {
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.BRIMSTONE_NOTE, DESCRIPTION);
    Debugger.eid(NAME, "Add description.");
  }
}
