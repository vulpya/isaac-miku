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
