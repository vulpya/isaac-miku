import type { EIDExtended } from "../compat/EID";
import { Feature } from "../Feature";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
export interface PlayerData {}

/** Abstract base class representing a custom character. */
export abstract class Character extends Feature {
  override postPlayerInit(player: EntityPlayer): void {
    const ExEID = EID as EIDExtended | undefined;
    if (this.setupEID && ExEID) {
      this.setupEID(ExEID, player);
    }
  }
}
