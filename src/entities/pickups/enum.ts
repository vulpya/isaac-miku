import type { PickupVariant } from "isaac-typescript-definitions";

export const PickupVariantCustom = {
  NOTE: Isaac.GetEntityVariantByName("Note") as PickupVariant,
} as const;
