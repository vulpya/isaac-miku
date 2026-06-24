export const CollectibleTypeCustom = {
  VIRTUAL_IDOL: Isaac.GetItemIdByName("Virtual Idol"),
  ENCORE: Isaac.GetItemIdByName("Encore!"),
  MICROPHONE: Isaac.GetItemIdByName("Microphone"),
  BROKEN_VOICE: Isaac.GetItemIdByName("Broken Voice"),

  // REPLACEMENT ITEMS FOR TAINTED MIKU.
  BRIMSTONE_NOTE: Isaac.GetItemIdByName("Brimstone Note"),
  DR_FETUS_NOTE: Isaac.GetItemIdByName("Dr. Fetus Note"),

  // NULL items
  MIKU_IDOL: Isaac.GetItemIdByName("Miku Idol"),
} as const;
