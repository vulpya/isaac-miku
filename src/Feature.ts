import type { CollectibleType, DamageFlag } from "isaac-typescript-definitions";
import { ModFeature } from "isaacscript-common";
import type { EIDExtended } from "./compat/EID";

/** Abstract base class representing a custom feature. */
export abstract class Feature extends ModFeature {
  /**
   * Optional callback triggered before the game exits.
   *
   * Use this to save feature-specific state before the current game ends.
   */
  onGameExit?(): void;

  /**
   * Optional callback triggered when the game starts.
   *
   * @param isContinued Whether the game is being continued from an existing save.
   */
  onGameStart?(isContinued: boolean): void;

  /**
   * Optional callback triggered after a player entity is initialized for the first time.
   *
   * Use this to set up character-specific items, costumes, and other initial state.
   *
   * @param player The player entity being initialized.
   */
  postPlayerInitFirst?(player: EntityPlayer): void;

  /**
   * Optional callback triggered after a player entity is initialized.
   *
   * Use this to restore or configure player-specific state after initialization.
   *
   * @param player The player entity being initialized.
   */
  postPlayerInit?(player: EntityPlayer): void;

  /**
   * Optional callback triggered every frame while a player is being updated.
   *
   * @param player The player entity being updated.
   */
  postPlayerUpdate?(player: EntityPlayer): void;

  /**
   * Optional callback to recalculate the player's movement speed.
   *
   * @param player The player whose movement speed is being recalculated.
   */
  cacheMoveSpeed?(player: EntityPlayer): void;

  /**
   * Optional callback to recalculate the player's fire delay (rate of fire).
   *
   * @param player The player whose fire delay is being recalculated.
   */
  cacheFireDelay?(player: EntityPlayer): void;

  /**
   * Optional callback to recalculate the player's damage.
   *
   * @param player The player whose damage is being recalculated.
   */
  cacheDamage?(player: EntityPlayer): void;

  /**
   * Optional callback to recalculate the player's tear flags.
   *
   * @param player The player whose tear flags are being recalculated.
   */
  cacheTearFlags?(player: EntityPlayer): void;

  /**
   * Optional callback triggered after a tear is fired.
   *
   * @param tear The tear entity that was just fired.
   */
  postFireTear?(tear: EntityTear): void;

  /**
   * Optional callback triggered after a tear is created (spawned).
   *
   * @param tear The tear entity that was just initialized.
   */
  postTearInit?(tear: EntityTear): void;

  /**
   * Optional callback triggered every frame while a tear exists.
   *
   * Use this to modify the tear's movement, appearance, or behavior over time.
   *
   * @param tear The tear entity being updated.
   */
  postTearUpdate?(tear: EntityTear): void;

  /**
   * Optional callback triggered after a tear is destroyed.
   *
   * @param tear The tear entity that was destroyed.
   */
  postTearKill?(tear: EntityTear): void;

  /**
   * Optional callback triggered when a pickup collides with an entity.
   *
   * Can be used to modify or prevent the pickup's interaction with the colliding entity.
   *
   * @param pickup The pickup entity involved in the collision.
   * @param collider The entity that collided with the pickup.
   * @param low Whether the collision is considered a low-priority collision.
   * @returns `false` to prevent the collision; `true` or `undefined` to allow it.
   */
  prePickupCollision?(
    pickup: EntityPickup,
    collider: Entity,
    low: boolean,
  ): boolean | undefined;

  /**
   * Optional callback triggered when a player gains a collectible.
   *
   * @param player The player who gained the collectible.
   * @param collectibleType The type of collectible that was added.
   */
  postAddCollectible?(
    player: EntityPlayer,
    collectibleType: CollectibleType,
  ): void;

  /**
   * Optional callback triggered when an entity takes damage.
   *
   * If implemented, returning `false` prevents the damage from being applied.
   *
   * @param entity The entity that is taking damage.
   * @param amount The amount of damage being dealt.
   * @param flags Flags describing the type and source of damage.
   * @param source The entity responsible for the damage (e.g., tear, player, enemy).
   * @param frames The number of frames since the damage occurred.
   * @returns `false` to block the damage; otherwise `true`.
   */
  entityTakeDamage?(
    entity: Entity,
    amount: float,
    flags: BitFlags<DamageFlag>,
    source: EntityRef,
    frames: int,
  ): boolean;

  /**
   * Optional callback triggered after an NPC entity is initialized.
   *
   * @param npc The NPC entity that was initialized.
   */
  postNPCInit?(npc: EntityNPC): void;

  /**
   * Optional callback triggered after an NPC entity is killed.
   *
   * @param npc The NPC entity that was killed.
   */
  postNPCDeath?(npc: EntityNPC): void;

  /**
   * Optional callback triggered after an entity is removed.
   *
   * @param entity The entity that was removed.
   */
  postEntityRemove?(entity: Entity): void;

  /** Optional callback triggered when a new room is entered. */
  onNewRoom?(): void;

  /**
   * Optional callback triggered before a room clear reward is spawned.
   *
   * @param rng The random number generator associated with the room clear reward.
   * @param _position The position where the room clear reward would be spawned.
   * @returns `false` to prevent the reward from spawning; otherwise `true` or `undefined`.
   */
  onPreSpawnClearAward?(rng: RNG, _position: Vector): boolean | undefined;

  /** Optional callback triggered every frame during the game update. */
  postUpdate?(): void;

  /**
   * Optional callback called during initialization to register compatibility with **External Item
   * Descriptions (EID)**.
   *
   * Override this method to add custom descriptions, effects, or metadata for this feature using
   * the provided `EIDExtended` API.
   *
   * @param eid The extended EID API instance used to register descriptions and modify how the
   *            feature appears in External Item Descriptions.
   * @param player The player entity associated with the feature.
   */
  setupEID?(eid: EIDExtended, player: EntityPlayer): void;
}
