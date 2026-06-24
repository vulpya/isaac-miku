export const PlayerTypeCustom = {
  MIKU: Isaac.GetPlayerTypeByName("Miku"),
  MIKU_B: Isaac.GetPlayerTypeByName("Miku", true),
} as const;

export const isMiku = (player: EntityPlayer, tainted = false): boolean => {
  const type = player.GetPlayerType();
  return tainted
    ? type === PlayerTypeCustom.MIKU_B
    : type === PlayerTypeCustom.MIKU;
};
