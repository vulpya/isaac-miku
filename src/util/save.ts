import type { SaveData } from "isaacscript-common";
import type { TaintedMikuSaveData } from "../characters/Miku/MikuTaintedCharacter";

export interface ModSaveData extends SaveData {
  mikuBs: Record<string, TaintedMikuSaveData>;
}

export const SAVE_DATA: ModSaveData = {
  mikuBs: {},
} as const;
