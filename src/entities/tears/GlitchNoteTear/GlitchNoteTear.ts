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

  private applyEffect(tear: EntityTear) {
    const tearData = getData<GlitchNoteTearData>(tear);
    const rng = tear.GetDropRNG();

    setTearColor(tear, tearData, rng);

    applyPositionJitter(tear, rng);
    applyRotationShift(tear, rng);
  }
}
