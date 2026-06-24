import { EffectVariant, SoundEffect } from "isaac-typescript-definitions";
import { spawnEffect } from "isaacscript-common";

/**
 * Spawns a visual effect and plays a sound when a tear is destroyed.
 *
 * @param tear The tear entity that has been destroyed.
 * @param effect The type of effect to spawn. Defaults to `EffectVariant.TEAR_POOF_A`.
 * @returns The spawned effect entity.
 */
export const spawnPoof = (
  tear: EntityTear,
  effect = EffectVariant.TEAR_POOF_A,
): EntityEffect => {
  const poof = spawnEffect(effect, 0, tear.Position, Vector(0, 0), tear);
  poof.PositionOffset = tear.PositionOffset;
  poof.SpriteScale = Vector(tear.Scale, tear.Scale).mul(0.8);
  poof.SetColor(tear.GetColor(), 0, 1);
  SFXManager().Play(SoundEffect.TEAR_IMPACTS);
  return poof;
};

/**
 * Calculates a vertical offset for a wobbling effect, based on the current frame.
 *
 * @param index The index of the object, used to offset the phase so multiple objects wobble out of
 *              sync.
 * @param amplitude The maximum displacement of the wobble (in pixels).
 * @param speed The speed of the wobble, where higher values make the motion faster.
 * @returns The vertical offset value to add to the object's Y position.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getWobbleOffset = (index: int, amplitude: float, speed: float): float =>
  Math.sin(Game().GetFrameCount() * speed + index) * amplitude;
