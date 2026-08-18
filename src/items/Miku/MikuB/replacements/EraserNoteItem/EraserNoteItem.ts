import type { EIDExtended } from "../../../../../compat/EID";
import { Debugger } from "../../../../../util/debug";
import { CollectibleTypeCustom } from "../../../../enum";
import { Item } from "../../../../Item";

const NAME = "Eraser Note";
const DESCRIPTION =
  "{{Collectible638}} Eraser Notes can now drop from enemies.";

export class EraserNoteItem extends Item {
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.ERASER_NOTE, DESCRIPTION);

    Debugger.eid(NAME, "Add description.");
  }
}
