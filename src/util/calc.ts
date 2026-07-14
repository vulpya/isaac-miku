export const maxFireDelayToTears = (maxFireDelay: number): number =>
  30 / (maxFireDelay + 1);

export const tearsToMaxFireDelay = (tears: number): number => 30 / tears - 1;
