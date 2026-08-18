import type { SaveData } from "isaacscript-common";
import type { TaintedMikuSaveData } from "../characters/Miku/MikuTaintedCharacter";

export interface ModSaveData extends SaveData {
  miku_b_players: Record<string, TaintedMikuSaveData>;
}

export const SAVE_DATA: ModSaveData = {
  miku_b_players: {},
} as const;
