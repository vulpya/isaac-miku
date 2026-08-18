import { ModConfigMenuOptionType } from "isaac-typescript-definitions";
import { author, version } from "../../package.json";
import { MOD_NAME } from "../mod";
import { Debugger } from "../util/debug";

const DEFAULT_NOTE_DROP_CHANCE = 30;

let showNoteCounter = true;
let noteDropChance = DEFAULT_NOTE_DROP_CHANCE;

export const getShowNoteCounter = (): boolean => showNoteCounter;

export const getNoteDropChance = (): number => noteDropChance;

/** Sets up Mod Config Menu options for Hatsune Miku. */
export const setupMCM = (): void => {
  if (ModConfigMenu === undefined) {
    Debugger.mcm("Hatsune Miku", "MCM not found.");
    return;
  }

  // --------------------------------------------------------------------------
  // Info
  // --------------------------------------------------------------------------
  ModConfigMenu.AddText("Hatsune Miku", "Info", () => MOD_NAME);

  // Blank line.
  ModConfigMenu.AddSpace("Hatsune Miku", "Info");

  ModConfigMenu.AddText("Hatsune Miku", "Info", () => `Version: ${version}`);

  // Blank line.
  ModConfigMenu.AddSpace("Hatsune Miku", "Info");

  ModConfigMenu.AddText("Hatsune Miku", "Info", () => `Author: ${author}`);

  // --------------------------------------------------------------------------
  // Tainted Miku
  // --------------------------------------------------------------------------
  ModConfigMenu.AddSetting("Hatsune Miku", "Tainted Miku", {
    Type: ModConfigMenuOptionType.BOOLEAN,

    CurrentSetting: () => showNoteCounter,

    Display: () => `Show Note Counter: ${showNoteCounter ? "ON" : "OFF"}`,

    OnChange: (value: number | boolean | undefined) => {
      showNoteCounter = value === true;

      Debugger.mcm(
        "Miku (Tainted)",
        `Show Note Counter changed to ${showNoteCounter ? "ON" : "OFF"}.`,
      );
    },

    Info: ["Show the remaining uses of the", "current Note above Miku."],
  });

  // Blank line between settings.
  ModConfigMenu.AddText("Hatsune Miku", "Tainted Miku", () => "");

  ModConfigMenu.AddSetting("Hatsune Miku", "Tainted Miku", {
    Type: ModConfigMenuOptionType.NUMBER,

    CurrentSetting: () => noteDropChance,

    Display: () => `Lost Note Drop Chance: ${noteDropChance}%`,

    Minimum: 0,

    Maximum: 100,

    ModifyBy: 1,

    OnChange: (value: number | boolean | undefined) => {
      if (typeof value !== "number") {
        return;
      }

      noteDropChance = Math.max(0, Math.min(100, Math.floor(value)));

      Debugger.mcm(
        "Miku (Tainted)",
        `Lost Note Drop Chance changed to ${noteDropChance}%.`,
      );
    },

    Info: ["Chance for enemies to drop a Lost Note."],
  });

  Debugger.mcm("Miku (Tainted)", "Add MCM compat.");
};

/**
 * Returns whether Mod Config Menu is currently open.
 *
 * The visibility value is provided by Mod Config Menu itself.
 */
export const isMCMOpen = (): boolean => {
  if (ModConfigMenu === undefined) {
    return false;
  }

  return ModConfigMenu.IsVisible;
};
