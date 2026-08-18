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
