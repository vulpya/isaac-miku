import { getRandom } from "isaacscript-common";
import type { TearData } from "../entities/tears/Tear";
import { rollChance } from "./rng";

/**
 * Sets the color of a tear based on the provided data or a random number generator (RNG).
 *
 * @param tear The tear entity to apply the color to.
 * @param tearData The data associated with the tear. It may contain a custom `color` property that
 *                 overrides the random color calculation. If `color` is `undefined`, the color will
 *                 be generated randomly.
 * @param rng A random number generator instance used for generating randomness in the color
 *            properties.
 */
export const setTearColor = (
  tear: EntityTear,
  tearData: TearData,
  rng: RNG,
): void => {
  const brightness = getRandom(rng) * 0.45;
  const alpha = 0.6 + getRandom(rng) * 0.3;
  const color =
    tearData.color ?? Color(brightness, brightness, brightness, alpha, 0, 0, 0);
  tear.SetColor(color, -1, 1);
};

/**
 * Applies a subtle "floaty" jitter effect to the tear's position.
 *
 * - This function randomly offsets the tear's position slightly, creating an organic and jittery
 *   effect in the tear's movement. The intensity of the jitter is determined by a random chance and
 *   the RNG value.
 *
 * @param tear The tear entity whose position will be modified by the jitter effect.
 * @param rng A random number generator instance used to determine the jitter amount.
 */
export const applyPositionJitter = (tear: EntityTear, rng: RNG): void => {
  if (rollChance(15, rng, 0)) {
    const jitterX = (getRandom(rng) - 0.5) * 0.3;
    const jitterY = (getRandom(rng) - 0.5) * 0.3;
    tear.Position = tear.Position.add(Vector(jitterX, jitterY));
  }
};

/**
 * Applies random rotation shifts to the tear, creating a less rigid, more dynamic motion.
 *
 * - This function adds a small random shift to the tear's rotation. The shift amount is determined
 *   by the RNG.
 *
 * @param tear The tear entity whose rotation will be modified by the rotation shift.
 * @param rng A random number generator instance used to determine the rotation shift amount.
 */
export const applyRotationShift = (tear: EntityTear, rng: RNG): void => {
  if (rollChance(20, rng, 0)) {
    const rotationShift = (getRandom(rng) - 0.5) * 4;
    tear.SpriteRotation += rotationShift;
  }
};
