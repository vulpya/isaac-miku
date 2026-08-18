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

const ENEMY_LUCKY_PENNY_CHANCE = 1;
const ENEMY_LUCKY_NOTE_PENNY_DROP_CHANCE = 1;

const BRIMSTONE_NOTE_DAMAGE_MULTIPLIER = 3.5;
const DR_FETUS_NOTE_DAMAGE_MULTIPLIER = 3.5;

/** Represents the different subtypes of lost note pickups. */
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

/** Items that unlock a corresponding synergy note. */
export const ITEM_SYNERGIES: Partial<
  Record<CollectibleType, NotePickupSubType>
> = {
  [CollectibleType.BRIMSTONE]: NotePickupSubType.BRIMSTONE,
  [CollectibleType.DR_FETUS]: NotePickupSubType.DR_FETUS,
  [CollectibleType.ERASER]: NotePickupSubType.ERASER,
} as const;

/** All notes that require an item before they can begin appearing in the note pool. */
export const SYNERGY_NOTES = new Set<NotePickupSubType>(
  Object.values(ITEM_SYNERGIES),
);

/**
 * Weight: Higher = more common. Lower = rarer.
 *
 * Synergy notes intentionally have lower weights because:
 *   1. They are unlocked by powerful items.
 *   2. Their effects are significantly stronger than normal notes.
 */
export const NOTE_TYPE_DATA: Record<NotePickupSubType, NoteTypeConfig> = {
  [NotePickupSubType.LOVE]: {
    name: "Love Note",
    description: "{{Charm}} Tears permanently charms enemies.",
    color: Color(0.85, 0.25, 0.25, 1, 0, 0, 0),
    weight: 0.4,
    uses: 1,

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

    applyEffect: (player, tear) => {
      tear.AddTearFlags(TearFlag.CONFUSION);
      tear.AddTearFlags(TearFlag.FEAR);

      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isActiveEnemy(enemy)) {
          return;
        }

        if (rollChance(ENEMY_FEAR_CHANCE, player.GetDropRNG())) {
          if (isFearable(enemy)) {
            fearEnemy(enemy, ENEMY_FEAR_DURATION);
          }

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
    description: `{{Trinket52}} Tears have a ${ENEMY_LUCKY_PENNY_CHANCE}% chance to create a {{ColorGold}}Lucky Penny{{CR}} on hit.`,
    color: Color(0.55, 1, 0.15, 1, 0, 0, 0),
    weight: 0.25,
    uses: 3,

    applyEffect: (player, tear) => {
      const tearData = getData<BloodNoteTearData>(tear);

      tearData.onHitEnemy = (enemy: EntityNPC) => {
        if (!isActiveEnemy(enemy)) {
          return;
        }

        const chance =
          ENEMY_LUCKY_NOTE_PENNY_DROP_CHANCE + Math.max(0, player.Luck);

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
   * ----------------------------------------------------------
   * BRIMSTONE NOTE
   * ----------------------------------------------------------
   * Compared to the normal Brimstone item:
   * - Only lasts for 2 attacks.
   * - Fires in the direction of the tear.
   * - Deals 3.5x Miku's damage.
   */
  [NotePickupSubType.BRIMSTONE]: {
    name: "Brimstone Note",
    description: "{{Collectible118}} Tears combine into a powerful laser.",
    color: Color(1, 0, 0, 1, 0, 0, 0),
    weight: 0.15,
    uses: 2,

    onFireTear: (player, tear) => {
      const direction = tear.Velocity;

      tear.Remove();

      if (direction.LengthSquared() <= 0) {
        return;
      }

      const laser = player.FireBrimstone(direction);

      laser.Parent = player;
      laser.CollisionDamage = player.Damage * BRIMSTONE_NOTE_DAMAGE_MULTIPLIER;
    },
  },

  /**
   * ----------------------------------------------------------
   * DR. FETUS NOTE
   * ----------------------------------------------------------
   * 3.5x damage and 1.3x radius makes each bomb substantially stronger than a normal tear.
   */
  [NotePickupSubType.DR_FETUS]: {
    name: "Dr. Fetus Note",
    description: "{{Collectible52}} Tears become a powerful explosive bomb.",
    color: Color(0.1, 0.1, 0.1, 1, 0, 0, 0),
    weight: 0.2,
    uses: 4,

    onFireTear: (player, tear) => {
      const direction = tear.Velocity;

      tear.Remove();

      if (direction.LengthSquared() <= 0) {
        return;
      }

      const bomb = player.FireBomb(tear.Position, direction.mul(1.5));

      bomb.SpawnerEntity = player;
      bomb.Parent = player;

      bomb.ExplosionDamage = player.Damage * DR_FETUS_NOTE_DAMAGE_MULTIPLIER;

      bomb.RadiusMultiplier = 1.3;

      bomb.CollisionDamage = bomb.ExplosionDamage;

      bomb.AddTearFlags(TearFlag.EXPLOSIVE);
    },
  },

  /**
   * ----------------------------------------------------------
   * ERASER NOTE
   * ----------------------------------------------------------
   * It does not work against:
   * - Bosses
   * - Invincible enemies
   */
  [NotePickupSubType.ERASER]: {
    name: "Rubber Note",
    description:
      "{{Collectible638}} Permanently erases enemies.#{{Warning}} Doesn't work on bosses.",
    color: Color(1, 0.35, 0.65, 1, 0, 0, 0),
    weight: 0.01,
    uses: 1,

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

        playerData.erased.push(enemyKey);

        SFXManager().Play(SoundEffect.ERASER_HIT);

        const erased = eraseEnemies(enemy.Type, enemy.Variant);

        Debugger.char(
          player.GetName(),
          `Erased ${erased} enemies. `
            + `(Type: ${enemy.Type}, Variant: ${enemy.Variant})`,
        );
      };
    },
  },
} as const;
