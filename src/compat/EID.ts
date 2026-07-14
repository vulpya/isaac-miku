import type { PlayerType } from "isaac-typescript-definitions";

export interface EIDExtended extends EIDInterface {
  addCharacterInfo: (
    characterId: int,
    description: string,
    playerName?: string,
    language?: string,
  ) => void;

  addDescriptionCallback: (
    type: string,
    callback: (descObj: EIDDescriptionObject) => void,
  ) => void;
}

/**
 * Registers an **External Item Descriptions (EID)** description modifier that appends additional
 * text to an item description for a specific condition when a runtime condition is met.
 *
 * @param eid The `EIDExtended` instance used to register the description modifier.
 * @param name The name of the player used to generate a unique modifier identifier.
 * @param type The player type associated with the modifier.
 * @param description The text to append to Brimstone's EID description.
 * @param condition A callback that determines whether the description should be appended.
 * @see {@link EIDExtended}
 */
export const appendToDescription = (
  eid: EIDExtended,
  name: string,
  type: PlayerType,
  description: string,
  condition: () => boolean,
): void => {
  eid.addDescriptionModifier(
    `${name}-${type}`,
    (descObj) => condition() && descObj.Name === name,
    (oldDescription) => {
      eid.appendToDescription(oldDescription, description);
      return oldDescription;
    },
  );
};
