import type { EIDExtended } from "../compat/EID";
import { Feature } from "../Feature";

export interface PlayerData {
  fireDelayInit?: boolean;
}

/** Abstract base class representing a custom character. */
export abstract class Character extends Feature {
  override postPlayerInit(player: EntityPlayer): void {
    const ExEID = EID as EIDExtended | undefined;
    if (this.setupEID && ExEID) {
      this.setupEID(ExEID, player);
    }
  }
}
