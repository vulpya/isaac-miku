import type { TearVariant } from "isaac-typescript-definitions";

export const TearVariantCustom = {
  MUSICAL_NOTE: Isaac.GetEntityVariantByName("Musical Note") as TearVariant,
  GLITCH_NOTE: Isaac.GetEntityVariantByName("Glitch Note") as TearVariant,
} as const;
