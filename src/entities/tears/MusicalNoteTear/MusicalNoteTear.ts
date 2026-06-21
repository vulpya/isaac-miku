import type { DamageFlag } from "isaac-typescript-definitions";
import {
  CollectibleType,
  EffectVariant,
  ModCallback,
} from "isaac-typescript-definitions";
import {
  Callback,
  CallbackCustom,
  getPlayerFromEntity,
  ModCallbackCustom,
} from "isaacscript-common";
import { isMiku } from "../../../characters/enum";
import { Debugger } from "../../../util/debug";
import { charmEnemy, isCharmable } from "../../../util/enemies";
import { calcChance, rollFromChances } from "../../../util/rng";
import { TearVariantCustom } from "../enum";
import { spawnPoof } from "../helper";
import { Tear } from "../Tear";

interface MusicalNoteData {
  /** Charm chance of the `NoteTear` in percent. */
  charmChance: float;
  /** Chance to charm an enemy permanently in percent. */
  fanChance: float;
  /** Duration of the charm effect in seconds. */
  charmDuration: float;
}

const NAME = "Musical Note";

const data: MusicalNoteData = {
  charmChance: 20,
  fanChance: 1.5,
  charmDuration: 3,
};

export class MusicalNoteTear extends Tear {
  v = data;

  /**
   * Adds a chance to apply a charm effect to the enemy hit for a fixed duration.
   *
   * There is a also a small chance the enemy becomes a fan, permanently charmed it will follow
   * Isaac through rooms.
   *
   * ### Notes
   * - Always returns **`true`** to ensure normal damage continues processing.
   *
   * @param entity The entity that is taking damage.
   * @param _amount The amount of damage dealt (currently unused in this method).
   * @param _flags Flags describing the type of damage (unused here).
   * @param source Reference to the source of the damage (e.g., a tear projectile).
   * @param _frames Frame count or timing information (unused in this method).
   * @returns Always returns `true` to indicate damage processing should continue.
   */
  @Callback(ModCallback.ENTITY_TAKE_DMG)
  override entityTakeDamage(
    entity: Entity,
    _amount: float,
    _flags: BitFlags<DamageFlag>,
    source: EntityRef,
    _frames: int,
  ): boolean {
    if (
      source.Entity?.ToTear()?.Variant !== TearVariantCustom.MUSICAL_NOTE
      || !isCharmable(entity)
    ) {
      return true;
    }

    const player = getPlayerFromEntity(source.Entity);
    if (!player) {
      return true;
    }

    const hasMikuBirthright =
      isMiku(player) && player.HasCollectible(CollectibleType.BIRTHRIGHT);

    const result = rollFromChances(
      entity.GetDropRNG(),
      calcChance(this.v.fanChance, hasMikuBirthright ? player.Luck : 0),
      calcChance(this.v.charmChance, player.Luck),
    );

    if (result === 0) {
      charmEnemy(entity, 0, true);
      Debugger.tear(NAME, "Enemy charmed permanently");
    } else if (result === 1) {
      charmEnemy(entity, this.v.charmDuration);
      Debugger.tear(NAME, `Enemy charmed for ${this.v.charmDuration}s`);
    }

    return true;
  }

  @CallbackCustom(
    ModCallbackCustom.POST_TEAR_KILL,
    TearVariantCustom.MUSICAL_NOTE,
  )
  override postTearKill(tear: EntityTear): void {
    spawnPoof(tear, EffectVariant.TEAR_POOF_A);
  }
}
