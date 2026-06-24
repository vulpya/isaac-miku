import type { DamageFlag } from "isaac-typescript-definitions";
import type { ModUpgraded } from "isaacscript-common";
import { ModFeature } from "isaacscript-common";
import type { EIDExtended } from "./compat/EID";

/** Abstract base class representing a custom feature. */
export abstract class Feature extends ModFeature {
  constructor(mod: ModUpgraded, init?: boolean) {
    super(mod, init);
    const ExEID = EID as EIDExtended | undefined;
    if (this.setupEID && ExEID) {
      this.setupEID(ExEID);
    }
  }

  onGameExit?(): void;

  onGameStart?(isContinued: boolean): void;

  /**
   * Optional callback triggered after a player entity is initialized.
   *
   * Use this to set up character-specific item, costumes, etc...
   *
   * @param player The player entity being initialized.
   */
  postPlayerInitFirst?(player: EntityPlayer): void;

  /**
   * Optional callback triggered after a player entity is initialized.
   *
   * @param player The player entity being initialized.
   */
  postPlayerInit?(player: EntityPlayer): void;

  /**
   * Optional callback triggered ever frame a player is updated.
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
   * Optional callback triggered after a tear was fired.
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
   * Can be used to modify movement, appearance, or behavior over time.
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
   * Optional callback triggered when an entity takes damage.
   *
   * If implemented, returning `false` prevents the damage from being applied.
   *
   * @param entity The entity that is taking damage.
   * @param amount The amount of damage being dealt.
   * @param flags Flags describing the type and source of damage.
   * @param source The entity responsible for the damage (e.g., tear, player, enemy).
   * @param frames The number of frames since the damage occurred (can be used for invincibility
   *               timing).
   * @returns Return `false` to block the damage; otherwise `true`.
   */
  entityTakeDamage?(
    entity: Entity,
    amount: float,
    flags: BitFlags<DamageFlag>,
    source: EntityRef,
    frames: int,
  ): boolean;

  /**
   * Optional callback triggered after npc entity was initialized.
   *
   * @param npc The npc entity that was initialized.
   */
  postNPCInit?(npc: EntityNPC): void;

  /**
   * Optional callback triggered after npc entity was killed.
   *
   * @param npc The npc entity that was killed.
   */
  postNPCDeath?(npc: EntityNPC): void;

  /**
   * Optional callback triggered after a entity was removed.
   *
   * @param pickup The pickup entity that was removed.
   */
  postEntityRemove?(entity: Entity): void;

  /** Optional callback triggered when a new room is entered. */
  onNewRoom?(): void;

  /** Optional callback triggered before a room clear reward is spawned. */
  onPreSpawnClearAward?(rng: RNG, _position: Vector): boolean | undefined;

  /** Optional callback triggered every frame (update tick). */
  postUpdate?(): void;

  /**
   * Optional function called during initialization to register compatibility with **External Item
   * Descriptions (EID)**.
   *
   * Override this method to add custom descriptions, effects, or metadata for this item using the
   * provided `EIDExtended` API.
   *
   * @param eid The extended EID API instance used to register descriptions and modify how the item
   *            appears in External Item Descriptions.
   */
  setupEID?(eid: EIDExtended): void;
}
