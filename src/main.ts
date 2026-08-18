import { initModFeatures, isRepentogon } from "isaacscript-common";
import { version } from "../package.json";
import { PlayerTypeCustom } from "./characters/enum";
import { MIKU_STATS, MikuCharacter } from "./characters/Miku/MikuCharacter";
import {
  MIKU_B_STATS,
  MikuTaintedCharacter,
} from "./characters/Miku/MikuTaintedCharacter";
import { setupMCM } from "./compat/MCM";
import { NotePickup } from "./entities/pickups/NotePickup/NotePickup";
import { BloodNoteTear } from "./entities/tears/BloodNoteTear/BloodNoteTear";
import { MusicalNoteTear } from "./entities/tears/MusicalNoteTear/MusicalNoteTear";
import { EncoreItem } from "./items/EncoreItem/EncoreItem";
import { MicrophoneItem } from "./items/Miku/MicrophoneItem/MicrophoneItem";
import { BrokenVoiceItem } from "./items/Miku/MikuB/BrokenVoiceItem/BrokenVoiceItem";
import { BrimstoneNoteItem } from "./items/Miku/MikuB/replacements/BrimstoneNoteItem/BrimstoneNoteItem";
import { DrFetusNoteItem } from "./items/Miku/MikuB/replacements/DrFetusNoteItem/DrFetusNoteItem";
import { EraserNoteItem } from "./items/Miku/MikuB/replacements/EraserNoteItem/EraserNoteItem";
import { VirtualIdolItem } from "./items/Miku/VirtualIdolItem/VirtualIdolItem";
import { mod, MOD_NAME } from "./mod";

const PASSIVE_ITEMS = [
  VirtualIdolItem,
  EncoreItem,
  BrimstoneNoteItem,
  DrFetusNoteItem,
  EraserNoteItem,
] as const;

const ACTIVE_ITEMS = [MicrophoneItem, BrokenVoiceItem] as const;

const TEARS = [MusicalNoteTear, BloodNoteTear] as const;

const PICKUPS = [NotePickup] as const;

const CHARACTERS = [MikuCharacter, MikuTaintedCharacter] as const;

const FEATURES = [
  ...PASSIVE_ITEMS,
  ...ACTIVE_ITEMS,
  ...TEARS,
  ...PICKUPS,
  ...CHARACTERS,
] as const;

export const main = (): void => {
  initModFeatures(mod, FEATURES);

  if (isRepentogon()) {
    print(`\n${MOD_NAME} v${version} loaded. [REPENTOGON]`);
  } else {
    print(`\n${MOD_NAME} v${version} loaded.`);
  }

  NotePickup.register();
  setupMCM();

  mod.registerCharacterStats(PlayerTypeCustom.MIKU, MIKU_STATS);
  mod.registerCharacterStats(PlayerTypeCustom.MIKU_B, MIKU_B_STATS);
};
