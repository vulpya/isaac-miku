import { EffectVariant, EntityType } from "isaac-typescript-definitions";
import {
  getEntities,
  isActiveEnemy,
  spawnEffect,
  VectorZero,
} from "isaacscript-common";
import { getFrames } from "./frames";

/**
 * Checks if an entity is eligible for the **Charm** effect.
 *
 * An entity is charmable if it is:
 * - Active and alive.
 * - Vulnerable.
 * - Not a boss.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be charmed, otherwise `false`.
 */
export const isCharmable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy() && !entity.IsBoss();

/**
 * Applies the **Charm** effect to an enemy entity.
 *
 * If the enemy is already charmed, the duration is refreshed.
 *
 * By default, bosses cannot receive permanent charm. Pass `bosses = true` to allow permanent charm
 * on bosses.
 *
 * @param entity The target enemy to charm.
 * @param seconds Duration of the charm effect in seconds.
 * @param permanent If `true`, applies charm indefinitely.
 * @param bosses If `true`, allows permanent charm to affect bosses.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * charmEnemy(enemy, 5);
 * ```
 */
export const charmEnemy = (
  entity: Entity,
  seconds: float,
  permanent = false,
  bosses = false,
): boolean => {
  entity.AddCharmed(
    EntityRef(entity),
    permanent && (bosses || !entity.IsBoss()) ? -1 : getFrames(seconds),
  );

  return true;
};

/**
 * Checks if an entity is eligible for the **Freeze** effect.
 *
 * An entity is freezable if it is:
 * - Active and alive.
 * - Vulnerable.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be frozen, otherwise `false`.
 */
export const isFreezable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy();

/**
 * Applies the **Freeze** effect to an enemy entity.
 *
 * If the enemy is already frozen, the duration is refreshed.
 *
 * Permanent freeze is not applied to bosses.
 *
 * @param entity The target enemy to freeze.
 * @param seconds Duration of the freeze effect in seconds.
 * @param permanent If `true`, applies freeze indefinitely to non-boss enemies.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * freezeEnemy(enemy, 3);
 * ```
 */
export const freezeEnemy = (
  entity: Entity,
  seconds: float,
  permanent = false,
): boolean => {
  entity.AddFreeze(
    EntityRef(entity),
    permanent && !entity.IsBoss() ? -1 : getFrames(seconds),
  );

  return true;
};

/**
 * Checks if an entity is eligible for the **Burn** effect.
 *
 * An entity is burnable if it is:
 * - Active and alive.
 * - Vulnerable.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be burned, otherwise `false`.
 */
export const isBurnable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy();

/**
 * Applies the **Burn** effect to an enemy entity.
 *
 * If the enemy is already burning, the duration is refreshed.
 *
 * Permanent burn is not applied to bosses.
 *
 * @param entity The target enemy to burn.
 * @param seconds Duration of the burn effect in seconds.
 * @param damage Damage dealt per burn tick.
 * @param permanent If `true`, applies burn indefinitely to non-boss enemies.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * burnEnemy(enemy, 0.4, 3);
 * ```
 */
export const burnEnemy = (
  entity: Entity,
  seconds: float,
  damage: float,
  permanent = false,
): boolean => {
  entity.AddBurn(
    EntityRef(entity),
    permanent && !entity.IsBoss() ? -1 : getFrames(seconds),
    damage,
  );

  return true;
};

/**
 * Checks if an entity is eligible for the **Fear** effect.
 *
 * An entity is fearable if it is:
 * - Active and alive.
 * - Vulnerable.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be feared, otherwise `false`.
 */
export const isFearable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy();

/**
 * Applies the **Fear** effect to an enemy entity.
 *
 * If the enemy is already feared, the duration is refreshed.
 *
 * Permanent fear is not applied to bosses.
 *
 * @param entity The target enemy to fear.
 * @param seconds Duration of the fear effect in seconds.
 * @param permanent If `true`, applies fear indefinitely to non-boss enemies.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * fearEnemy(enemy, 1.5);
 * ```
 */
export const fearEnemy = (
  entity: Entity,
  seconds: float,
  permanent = false,
): boolean => {
  entity.AddFear(
    EntityRef(entity),
    permanent && !entity.IsBoss() ? -1 : getFrames(seconds),
  );

  return true;
};

/**
 * Checks if an entity is eligible for the **Confusion** effect.
 *
 * An entity is confusable if it is:
 * - Active and alive.
 * - Vulnerable.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be confused, otherwise `false`.
 */
export const isConfusable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy();

/**
 * Applies the **Confusion** effect to an enemy entity.
 *
 * If the enemy is already confused, the duration is refreshed.
 *
 * Permanent confusion is not applied to bosses.
 *
 * @param entity The target enemy to confuse.
 * @param seconds Duration of the confusion effect in seconds.
 * @param permanent If `true`, applies confusion indefinitely to non-boss enemies.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * confuseEnemy(enemy, 2);
 * ```
 */
export const confuseEnemy = (
  entity: Entity,
  seconds: float,
  permanent = false,
): boolean => {
  entity.AddConfusion(
    EntityRef(entity),
    permanent && !entity.IsBoss() ? -1 : getFrames(seconds),
  );

  return true;
};

/**
 * Checks if an entity is eligible for the **Midas Freeze** effect.
 *
 * An entity is midas-freezable if it is:
 * - Active and alive.
 * - Vulnerable.
 *
 * @param entity The entity to check.
 * @returns `true` if the entity can be turned into gold, otherwise `false`.
 */
export const isMidasFreezable = (entity: Entity): boolean =>
  isActiveEnemy(entity) && entity.IsVulnerableEnemy();

/**
 * Applies the **Midas Freeze** effect to an enemy entity.
 *
 * If the enemy is already gold, the duration is refreshed.
 *
 * Permanent Midas Freeze is not applied to bosses.
 *
 * @param entity The target enemy to turn into gold.
 * @param seconds Duration of the Midas Freeze effect in seconds.
 * @param permanent If `true`, applies Midas Freeze indefinitely to non-boss enemies.
 * @returns Always returns `true` after applying the effect.
 * @example
 * ```ts
 * midasFreezeEnemy(enemy, 3);
 * ```
 */
export const midasFreezeEnemy = (
  entity: Entity,
  seconds: float,
  permanent = false,
): boolean => {
  entity.AddMidasFreeze(
    EntityRef(entity),
    permanent && !entity.IsBoss() ? -1 : getFrames(seconds),
  );

  return true;
};

/**
 * Returns a unique key for an enemy, combining its type and variant.
 *
 * This is useful for tracking enemy types that have been permanently erased by effects such as the
 * Rubber Note.
 *
 * @param npc The enemy entity.
 * @returns A string in the format `"Type_Variant"`.
 * @example
 * ```ts
 * const key = getEnemyKey(enemy);
 * // "3_1"
 * ```
 */
export const getEnemyKey = (npc: EntityNPC): string =>
  `${npc.Type}_${npc.Variant}`;

/**
 * Instantly removes all active enemies of a specific type and variant from the current room.
 *
 * Each erased enemy also spawns a pink Eraser-style poof effect.
 *
 * @param type The entity type to remove.
 * @param variant The variant of the entities to remove.
 * @returns The number of enemies that were erased.
 * @example
 * ```ts
 * const erasedCount = eraseEnemies(EntityType.ENTITY_FLY, 1);
 * ```
 */
export const eraseEnemies = (
  type: EntityType,
  variant: Entity["Variant"],
): number => {
  const enemies = getEntities(type, variant, -1, true).filter((entity) =>
    isActiveEnemy(entity),
  );

  for (const enemy of enemies) {
    enemy.Remove();

    const puff = spawnEffect(
      EffectVariant.POOF_1,
      0,
      enemy.Position,
      VectorZero,
      enemy,
    );

    // Eraser color.
    puff.SetColor(Color(1, 0.4, 0.6, 1, 0, 0, 0), -1, 0);
  }

  return enemies.length;
};

/**
 * Returns active enemies in the current room.
 *
 * @param type Optional entity type to filter by. Defaults to any type.
 * @param variant Optional entity variant to filter by. Defaults to any variant.
 * @param subType Optional entity subtype to filter by. Defaults to any subtype.
 * @returns An array of active enemy entities matching the criteria.
 */
export const getEnemies = (
  type: EntityType = EntityType.NULL,
  variant = -1,
  subType = -1,
): readonly Entity[] =>
  getEntities(
    type === EntityType.NULL ? -1 : type,
    variant,
    subType,
    true,
  ).filter(isActiveEnemy);
