/* eslint-disable complete/require-capital-read-only */
import {
  CoinSubType,
  CollectibleType,
  PickupVariant,
  SoundEffect,
  TearFlag,
} from "isaac-typescript-definitions";
import {
  arrayToBitFlags,
  isActiveEnemy,
  spawnPickup,
  VectorZero,
} from "isaacscript-common";
import type { TaintedMikuData } from "../../../characters/Miku/MikuTaintedCharacter";
import { getData } from "../../../util/data";
import { Debugger } from "../../../util/debug";
import {
  burnEnemy,
  charmEnemy,
  confuseEnemy,
  eraseEnemies,
  fearEnemy,
  freezeEnemy,
  getEnemyKey,
  isBurnable,
  isCharmable,
  isConfusable,
  isFearable,
  isFreezable,
  isMidasFreezable,
  midasFreezeEnemy,
} from "../../../util/enemies";
import { rollChance } from "../../../util/rng";
import type { BloodNoteTearData } from "../../tears/BloodNoteTear/BloodNoteTear";
import type { NoteTypeConfig } from "./NotePickup";

const ENEMY_FREEZE_DURATION = 3;

const ENEMY_BURN_DURATION = 0.4;
const ENEMY_BURN_DAMAGE = 3;

const ENEMY_FEAR_DURATION = 1.5;
const ENEMY_FEAR_CHANCE = 50;
const ENEMY_CONFUSE_DURATION = 2;

const ENEMY_MIDAS_DURATION = 3;
const ENEMY_MIDAS_CHANCE = 20;

const LUCKY_NOTE_PENNY_DROP_CHANCE = 1;

const BRIMSTONE_SYNERGY_DAMAGE_MULTIPLIER = 4;
const DR_FETUS_SYNERGY_DAMAGE_MULTIPLIER = 3.5;

/**
 * Identifies the different note pickup types available to Tainted Miku.
 *
 * The first group contains standard notes, while the final group contains synergy notes that
 * require specific collectibles to unlock.
 */
export enum NotePickupSubType {
  LOVE = 1,
  FIRE,
  ICE,
  TOXIC,
  SPOOKY,
  HOMING,
  GOLDEN,
  LUCKY,

  // SYNERGIES
  BRIMSTONE,
  DR_FETUS,
  ERASER,
}

/**
 * Maps collectibles to the synergy note they unlock.
 *
 * When Tainted Miku obtains one of these collectibles, it is converted into the corresponding note
 * mechanic.
 */
export const ITEM_SYNERGIES: Partial<
  Record<CollectibleType, NotePickupSubType>
> = {
  [CollectibleType.BRIMSTONE]: NotePickupSubType.BRIMSTONE,
  [CollectibleType.DR_FETUS]: NotePickupSubType.DR_FETUS,
  [CollectibleType.ERASER]: NotePickupSubType.ERASER,
} as const;

/**
 * Contains all notes that require a specific collectible before they can begin appearing in the
 * note pool.
 */
export const SYNERGY_NOTES = new Set<NotePickupSubType>(
  Object.values(ITEM_SYNERGIES),
);

/**
 * Configuration for every note type.
 *
 * Weight determines how frequently a note is selected from the note pool. Higher values make a note
 * more common, while lower values make it rarer.
 *
 * Synergy notes intentionally have lower weights because:
 *
 * 1. They are unlocked by powerful items.
 * 2. Their effects are significantly stronger than normal notes.
 */
export const NOTE_TYPE_DATA: Record<NotePickupSubType, NoteTypeConfig> = {
  [NotePickupSubType.LOVE]: {
    name: "Love Note",
    description: "{{Charm}} Tears permanently charms enemies.",
    color: Color(0.85, 0.25, 0.25, 1, 0, 0, 0),
    weight: 0.4,
    uses: 1,

    /**
     * Causes enemies hit by the tear to become permanently charmed.
     *
     * @param _player The player who fired the tear.
     * @param tear The tear receiving the Love Note effect.
     */
    applyEffect: (_player: EntityPlayer, tear: EntityTear) => {
      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isCharmable(enemy)) {
          return;
        }

        charmEnemy(enemy, 0, true);
      };
    },
  },

  [NotePickupSubType.FIRE]: {
    name: "Blazing Note",
    description:
      "{{Burning}} Tears burn enemies over time.#{{Warning}} Burning enemies explode on death.",
    color: Color(1, 0.5, 0.15, 1, 0, 0, 0),
    weight: 0.75,
    uses: 2,

    /**
     * Adds the burning tear flag and applies a burn effect when the tear hits an enemy.
     *
     * @param _player The player who fired the tear.
     * @param tear The tear receiving the Blazing Note effect.
     */
    applyEffect: (_player, tear) => {
      tear.AddTearFlags(TearFlag.BURN);

      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isBurnable(enemy)) {
          return;
        }

        burnEnemy(enemy, ENEMY_BURN_DURATION, ENEMY_BURN_DAMAGE);
      };
    },
  },

  [NotePickupSubType.ICE]: {
    name: "Freeze Note",
    description: `{{Freezing}} Tears freezes enemies for ${ENEMY_FREEZE_DURATION} seconds.`,
    color: Color(0.4, 0.85, 1, 1, 0, 0, 0),
    weight: 0.75,
    uses: 2,

    /**
     * Freezes enemies hit by the tear.
     *
     * @param _player The player who fired the tear.
     * @param tear The tear receiving the Freeze Note effect.
     */
    applyEffect: (_player: EntityPlayer, tear: EntityTear) => {
      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isFreezable(enemy)) {
          return;
        }

        freezeEnemy(enemy, ENEMY_FREEZE_DURATION);
      };
    },
  },

  [NotePickupSubType.TOXIC]: {
    name: "Toxic Note",
    description:
      "{{Poison}} Tears poison enemies and causes tears to explode on impact.#{{Warning}} Explosions can damage you.",
    color: Color(0.12, 0.65, 0.18, 1, 0, 0, 0),
    weight: 0.5,
    uses: 1,

    /**
     * Gives the tear poison and explosive properties.
     *
     * @param _player The player who fired the tear.
     * @param tear The tear receiving the Toxic Note effect.
     */
    applyEffect: (_player, tear) => {
      tear.AddTearFlags(arrayToBitFlags([TearFlag.POISON, TearFlag.EXPLOSIVE]));
    },
  },

  [NotePickupSubType.SPOOKY]: {
    name: "Spooky Note",
    description: `{{Fear}} Tears confuses enemies. Has a ${ENEMY_FEAR_CHANCE}% chance to also fear them.`,
    color: Color(0.15, 0.25, 0.4, 1, 0, 0, 0),
    weight: 1,
    uses: 3,

    /**
     * Applies confusion to enemies hit by the tear, with a chance to apply fear instead.
     *
     * @param player The player who fired the tear.
     * @param tear The tear receiving the Spooky Note effect.
     */
    applyEffect: (player, tear) => {
      tear.AddTearFlags(TearFlag.CONFUSION);
      tear.AddTearFlags(TearFlag.FEAR);

      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isActiveEnemy(enemy)) {
          return;
        }

        if (
          rollChance(ENEMY_FEAR_CHANCE, player.GetDropRNG())
          && isFearable(enemy)
        ) {
          fearEnemy(enemy, ENEMY_FEAR_DURATION);
          return;
        }

        if (isConfusable(enemy)) {
          confuseEnemy(enemy, ENEMY_CONFUSE_DURATION);
        }
      };
    },
  },

  [NotePickupSubType.HOMING]: {
    name: "Magical Note",
    description: "{{Weakness}} Tears home in on enemies.",
    color: Color(0.65, 0.3, 0.9, 1, 0, 0, 0),
    weight: 1.1,
    uses: 3,

    /**
     * Gives the tear homing properties.
     *
     * @param _player The player who fired the tear.
     * @param tear The tear receiving the Magical Note effect.
     */
    applyEffect: (_player, tear) => {
      tear.AddTearFlags(TearFlag.HOMING);
    },
  },

  [NotePickupSubType.GOLDEN]: {
    name: "Greedy Note",
    description: `{{Coin}} Tears have a ${ENEMY_MIDAS_CHANCE}% chance to turn enemies into {{ColorGold}}gold{{CR}}.`,
    color: Color(1, 0.78, 0.15, 1, 0, 0, 0),
    weight: 0.45,
    uses: 2,

    /**
     * Gives the tear Midas properties and attempts to turn enemies into gold when they are hit.
     *
     * @param player The player who fired the tear.
     * @param tear The tear receiving the Greedy Note effect.
     */
    applyEffect: (player, tear) => {
      tear.AddTearFlags(TearFlag.MIDAS);

      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (
          !isMidasFreezable(enemy)
          || !rollChance(ENEMY_MIDAS_CHANCE, player.GetDropRNG())
        ) {
          return;
        }

        midasFreezeEnemy(enemy, ENEMY_MIDAS_DURATION);
      };
    },
  },

  [NotePickupSubType.LUCKY]: {
    name: "Lucky Note",
    description: `{{Trinket52}} Tears have a ${LUCKY_NOTE_PENNY_DROP_CHANCE}% chance to create a {{ColorGold}}Lucky Penny{{CR}} on hit.`,
    color: Color(0.55, 1, 0.15, 1, 0, 0, 0),
    weight: 0.25,
    uses: 3,

    /**
     * Gives tears a chance to create a Lucky Penny when they hit an enemy.
     *
     * The player's Luck increases the chance above the base chance.
     *
     * @param player The player who fired the tear.
     * @param tear The tear receiving the Lucky Note effect.
     */
    applyEffect: (player, tear) => {
      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isActiveEnemy(enemy)) {
          return;
        }

        const chance = LUCKY_NOTE_PENNY_DROP_CHANCE + Math.max(0, player.Luck);

        if (!rollChance(chance, player.GetDropRNG())) {
          return;
        }

        spawnPickup(
          PickupVariant.COIN,
          CoinSubType.LUCKY_PENNY,
          enemy.Position,
          VectorZero,
          player,
          player.GetDropRNG(),
        );
      };
    },
  },

  // SYNERGY NOTES

  /**
   * Brimstone synergy.
   *
   * Replaces the normal tear with a Brimstone laser.
   *
   * The laser deals 3.5x the player's damage.
   */
  [NotePickupSubType.BRIMSTONE]: {
    name: "Brimstone Note",
    description: "{{Collectible118}} Tears combine into a powerful laser.",
    color: Color(1, 0, 0, 1, 0, 0, 0),
    weight: 0.15,
    uses: 2,

    /**
     * Replaces the fired tear with a Brimstone laser.
     *
     * The laser inherits the firing player's damage multiplied by
     * {@link SYNERGY_DAMAGE_MULTIPLIER}.
     *
     * @param player The player who fired the tear.
     * @param tear The original tear being replaced.
     */
    onFireTear: (player, tear) => {
      const velocity = tear.Velocity;

      tear.Remove();

      if (velocity.LengthSquared() <= 0) {
        return;
      }

      const laser = player.FireBrimstone(velocity);

      laser.Parent = player;
      laser.CollisionDamage =
        player.Damage * BRIMSTONE_SYNERGY_DAMAGE_MULTIPLIER;
    },
  },

  /**
   * Dr. Fetus synergy.
   *
   * Replaces the normal tear with a bomb.
   *
   * The bomb deals 3.5x the player's damage and has an increased explosion radius.
   */
  [NotePickupSubType.DR_FETUS]: {
    name: "Bomb Note",
    description: "{{Collectible52}} Tears become a powerful explosive bomb.",
    color: Color(0.1, 0.1, 0.1, 1, 0, 0, 0),
    weight: 0.2,
    uses: 4,

    /**
     * Replaces the fired tear with a Dr. Fetus-style bomb.
     *
     * The bomb is spawned at the original tear's position, travels in the same direction as the
     * tear, deals 3.5x the player's damage, and has a 1.3x explosion radius.
     *
     * @param player The player who fired the tear.
     * @param tear The original tear being replaced.
     */
    onFireTear: (player, tear) => {
      const velocity = tear.Velocity;

      tear.Remove();

      if (velocity.LengthSquared() <= 0) {
        return;
      }

      // Spawn the bomb where the original tear would have been.
      const bomb = player.FireBomb(tear.Position, velocity.mul(1.5));

      bomb.SpawnerEntity = player;
      bomb.Parent = player;

      bomb.ExplosionDamage = player.Damage * DR_FETUS_SYNERGY_DAMAGE_MULTIPLIER;
      bomb.RadiusMultiplier = 1.3;
      bomb.CollisionDamage = bomb.ExplosionDamage;

      bomb.AddTearFlags(TearFlag.EXPLOSIVE);
    },
  },

  /**
   * Eraser synergy.
   *
   * Permanently removes enemy types when they are hit.
   *
   * This effect does not work against bosses or invincible enemies.
   */
  [NotePickupSubType.ERASER]: {
    name: "Rubber Note",
    description:
      "{{Collectible638}} Permanently erases enemies.#{{Warning}} Doesn't work on bosses.",
    color: Color(1, 0.35, 0.65, 1, 0, 0, 0),
    weight: 0.01,
    uses: 1,

    /**
     * Permanently erases the enemy type when the tear hits it.
     *
     * Bosses, invincible enemies, inactive enemies, and enemy types that have already been erased
     * are ignored.
     *
     * @param player The player who fired the tear.
     * @param tear The tear receiving the Eraser Note effect.
     */
    applyEffect: (player: EntityPlayer, tear: EntityTear) => {
      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isActiveEnemy(enemy) || enemy.IsBoss() || enemy.IsInvincible()) {
          return;
        }

        const playerData = getData<TaintedMikuData>(player);

        playerData.erased ??= [];

        const enemyKey = getEnemyKey(enemy);

        // Don't repeatedly erase the same enemy type.
        if (playerData.erased.includes(enemyKey)) {
          return;
        }

        const erased = eraseEnemies(enemy.Type, enemy.Variant);

        if (erased <= 0) {
          return;
        }

        playerData.erased.push(enemyKey);

        SFXManager().Play(SoundEffect.ERASER_HIT);

        Debugger.char(
          player.GetName(),
          `Erased ${erased} enemies. `
            + `(Type: ${enemy.Type}, Variant: ${enemy.Variant})`,
        );
      };
    },
  },
} as const;
