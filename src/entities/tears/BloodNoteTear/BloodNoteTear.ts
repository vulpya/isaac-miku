import { EffectVariant } from "isaac-typescript-definitions";
import {
  CallbackCustom,
  ModCallbackCustom,
  spawnEffect,
  VectorZero,
} from "isaacscript-common";

import { getData } from "../../../util/data";
import { TearVariantCustom } from "../enum";
import { spawnPoof } from "../helper";
import type { TearData } from "../Tear";
import { Tear } from "../Tear";

export interface BloodNoteTearData extends TearData {
  onHitEnemy?: (entity: EntityNPC) => void;
  initialized?: boolean;
}

const BLOOD_COLOR = Color(0.65, 0.02, 0.03, 1, 0, 0, 0);
const BLOOD_CREEP_CHANCE = 5;
const BLOOD_CREEP_DURATION = 3;
const BLOOD_CREEP_DAMAGE = 3;

export class BloodNoteTear extends Tear {
  @CallbackCustom(
    ModCallbackCustom.POST_TEAR_KILL,
    TearVariantCustom.BLOOD_NOTE,
  )
  override postTearKill(tear: EntityTear): void {
    if (tear.Height >= -5) {
      this.spawnFloorBlood(tear);
      this.trySpawnBloodCreep(tear);
    }

    const poof = spawnPoof(tear, EffectVariant.TEAR_POOF_B);

    poof.SetColor(BLOOD_COLOR, 0, 1000);
  }

  /**
   * Applies the bloody appearance to the tear.
   *
   * @param tear The Blood Note tear entity.
   */
  private applyTearEffect(tear: EntityTear): void {
    const tearData = getData<BloodNoteTearData>(tear);

    tearData.color ??= BLOOD_COLOR;
    tearData.poofColor ??= BLOOD_COLOR;
    tearData.initialized = true;

    tear.SetColor(tearData.color, -1, 1000, false, false);
    tear.GetSprite().Color = tearData.color;
  }

  /**
   * Spawns a blood creep at the location where the Blood Note tear impacted dependent on a
   * specified chance.
   *
   * @param tear The Blood Note tear that was destroyed.
   */
  private trySpawnBloodCreep(tear: EntityTear): void {
    const rng = tear.GetDropRNG();

    if (rng.RandomFloat() >= BLOOD_CREEP_CHANCE / 100) {
      return;
    }

    const creep = spawnEffect(
      EffectVariant.CREEP_RED,
      0,
      tear.Position,
      VectorZero,
      tear.SpawnerEntity,
      rng,
    );

    creep.SetColor(BLOOD_COLOR, -1, 1000);
    creep.SpriteScale = Vector(0.8, 0.8);

    creep.Timeout = BLOOD_CREEP_DURATION * 30;
    creep.CollisionDamage = BLOOD_CREEP_DAMAGE;
  }

  /**
   * Spawns a small blood stain when the tear reaches the floor.
   *
   * @param tear The Blood Note tear that reached the floor.
   */
  private spawnFloorBlood(tear: EntityTear): void {
    const rng = tear.GetDropRNG();

    const blood = spawnEffect(
      EffectVariant.BLOOD_PARTICLE,
      0,
      tear.Position,
      Vector(0, 0),
      tear.SpawnerEntity,
      rng,
    );

    const scale = 0.5 + rng.RandomFloat() * 0.4;

    blood.SpriteScale = Vector(scale, scale * 0.5);

    const tearData = getData<BloodNoteTearData>(tear);

    if (!tearData.poofColor) {
      return;
    }

    blood.SetColor(tearData.poofColor, -1, 1000);
  }
}
