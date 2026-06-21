// TODO: Setup tests.

import { getRandomSeed, setSeed } from "isaacscript-common";
import { Debugger } from "../util/debug";
import { rollWeighted } from "../util/rng";

const makeRng = (seed: Seed): RNG => {
  const rng = RNG();
  setSeed(rng, seed);
  return rng;
};

export const testRollWeightedAccuracy = (): void => {
  const items = ["A", "B"] as const;
  const weights = [1, 3] as const;

  const rng = makeRng(getRandomSeed());

  let a = 0;
  let b = 0;

  for (let i = 0; i < 10_000; i++) {
    const r = rollWeighted(items, weights, rng, 100);
    if (r === "A") {
      a++;
    }
    if (r === "B") {
      b++;
    }
  }

  Debugger.rng(
    "testRollWeightedAccuracy",
    `A=${a}, B=${b}, ratio=${(b / (a + b)).toFixed(2)} (expected ~0.75)`,
  );
};
