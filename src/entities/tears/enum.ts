import type { TearVariant } from "isaac-typescript-definitions";

export const TearVariantCustom = {
  MUSICAL_NOTE: Isaac.GetEntityVariantByName("Musical Note") as TearVariant,
  BLOOD_NOTE: Isaac.GetEntityVariantByName("Blood Note") as TearVariant,
  LOST_NOTE: Isaac.GetEntityVariantByName("Lost Note") as TearVariant,
} as const;
