import { EffectVariant, ModCallback } from "isaac-typescript-definitions";
import {
  Callback,
  CallbackCustom,
  getPlayerFromEntity,
  ModCallbackCustom,
} from "isaacscript-common";
import { isMiku } from "../../../characters/enum";
import { getData } from "../../../util/data";
import {
  applyPositionJitter,
  applyRotationShift,
  setTearColor,
} from "../../../util/effects";
import { TearVariantCustom } from "../enum";
import { spawnPoof } from "../helper";
import type { TearData } from "../Tear";
import { Tear } from "../Tear";

export interface GlitchNoteTearData extends TearData {
  onHitEnemy?: (entity: EntityNPC) => void;
  glitchTime?: number;
  initializedColor?: boolean;
}

export class GlitchNoteTear extends Tear {
  @Callback(ModCallback.POST_TEAR_INIT, TearVariantCustom.GLITCH_NOTE)
  override postTearInit(tear: EntityTear): void {
    this.applyEffect(tear);
  }

  @Callback(ModCallback.POST_TEAR_UPDATE, TearVariantCustom.GLITCH_NOTE)
  override postTearUpdate(tear: EntityTear): void {
    const player = getPlayerFromEntity(tear);

    if (!player || !isMiku(player, true)) {
      return;
    }

    this.applyEffect(tear);
  }

  @CallbackCustom(
    ModCallbackCustom.POST_TEAR_KILL,
    TearVariantCustom.GLITCH_NOTE,
  )
  override postTearKill(tear: EntityTear): void {
    spawnPoof(tear, EffectVariant.TEAR_POOF_B);
  }

  private applyEffect(tear: EntityTear): void {
    const tearData = getData<GlitchNoteTearData>(tear);

    tearData.glitchTime ??= 0;
    tearData.glitchTime++;

    const rng = tear.GetDropRNG();

    if (!(tearData.initializedColor ?? false)) {
      setTearColor(tear, tearData, rng);
      tearData.initializedColor = true;
    }

    const maxTime = 20;
    const intensity = Math.min(tearData.glitchTime / maxTime, 1);

    const minBrightness = 0.15;
    const brightness = minBrightness + (1 - minBrightness) * (1 - intensity);

    const originalColor = tearData.color;

    tear.SetColor(
      Color(
        brightness * (originalColor?.R ?? 1),
        brightness * (originalColor?.G ?? 1),
        brightness * (originalColor?.B ?? 1),
        1,
        0,
        0,
        0,
      ),
      -1,
      1000,
    );

    applyPositionJitter(tear, rng, intensity);
    applyRotationShift(tear, rng, intensity);
  }
}
