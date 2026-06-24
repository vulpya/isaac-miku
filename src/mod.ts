import { ISCFeature, upgradeMod } from "isaacscript-common";

export const MOD_NAME = "Hatsune Miku (+Tainted)";

const ISC_FEATURES = [
  ISCFeature.SAVE_DATA_MANAGER,
  ISCFeature.CUSTOM_PICKUPS,
  ISCFeature.CHARACTER_STATS,
] as const;

const modVanilla = RegisterMod(MOD_NAME, 1);
export const mod = upgradeMod(modVanilla, ISC_FEATURES);
