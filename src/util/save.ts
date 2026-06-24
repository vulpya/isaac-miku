import type { TaintedMikuData } from "../characters/Miku/MikuTaintedCharacter";

interface ModSaveData {
  players: Record<string, TaintedMikuData>;
}

export const SAVE_DATA: ModSaveData = {
  players: {},
  // eslint-disable-next-line complete/require-unannotated-const-assertions
} as const;
