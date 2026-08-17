import type { CollectibleType } from "isaac-typescript-definitions";
import {
  EffectVariant,
  EntityType,
  ModCallback,
  SoundEffect,
} from "isaac-typescript-definitions";
import {
  Callback,
  getPlayers,
  getRandom,
  spawnEffect,
  VectorZero,
} from "isaacscript-common";
import { isMiku } from "../../../characters/enum";

import type { TaintedMikuData } from "../../../characters/Miku/MikuTaintedCharacter";
import { CollectibleTypeCustom } from "../../../items/enum";
import { mod } from "../../../mod";
import { getData } from "../../../util/data";
import { Debugger } from "../../../util/debug";
import { rollChance } from "../../../util/rng";
import { PickupVariantCustom } from "../enum";
import { Pickup } from "../Pickup";
import {
  NOTE_TYPE_DATA,
  NotePickupSubType,
  SYNERGY_NOTES,
} from "./NotePickupSubType";

/**
 * Configuration for a specific NotePickup subtype.
 *
 * Defines the visual appearance, gameplay effect, drop chance, and usage limits.
 */
export interface NoteTypeConfig {
  /** Display name of the note. */
  readonly name: string;

  /** Short description of the note's effect. */
  readonly description: string;

  /** Color applied to the note pickup. */
  readonly color: Color;

  /** Chance for this note to appear when dropped. */
  readonly weight: float;

  /** Number of times the note's effect can be used. */
  readonly uses: int;

  /**
   * Function called when the note's effect is applied via a tear.
   *
   * @param player The player who fired the tear.
   * @param tear The tear entity that will carry the note effect.
   */
  readonly applyEffect?: (player: EntityPlayer, tear: EntityTear) => void;

  /**
   * Function called when the note gets fired.
   *
   * @param player The player who fired the tear.
   * @param tear The tear entity that will carry the note behavior.
   */
  readonly onFireTear?: (player: EntityPlayer, tear: EntityTear) => void;
}

/**
 * Represents a spawned instance of a note pickup in a run.
 *
 * Tracks the subtype and remaining uses.
 */
export interface NoteInstance {
  /** The note's subtype. */
  subType: NotePickupSubType;

  /** How many uses are remaining for this note. */
  remainingUses: int;
}

/**
 * Applies visual effects and dynamic behavior to a NotePickup.
 *
 * - Sets the note's color based on its subtype.
 * - Applies smooth rotation to the sprite.
 * - Adds a slight horizontal sway.
 * - Occasionally spawns small sparkle effects.
 */
const applyNotePickupVisuals = (pickup: EntityPickup, rng: RNG): void => {
  const subType = pickup.SubType as NotePickupSubType;
  const noteData = NOTE_TYPE_DATA[subType];

  pickup.SetColor(noteData.color, -1, 0);

  // --------------------------------------------------
  // Oscillating rotation.
  // --------------------------------------------------
  pickup.SpriteRotation =
    Math.sin(Game().GetFrameCount() * 0.1 + pickup.InitSeed) * 5;

  // --------------------------------------------------
  // Slight horizontal sway.
  // --------------------------------------------------
  if (rollChance(20, rng)) {
    const sway = getRandom(rng) * 0.4 - 0.2;

    pickup.Position = pickup.Position.add(Vector(sway, 0));
  }

  // --------------------------------------------------
  // Small sparkling effect.
  // --------------------------------------------------
  if (pickup.GetSprite().IsPlaying("Idle") && rollChance(30, rng)) {
    const sparkle = spawnEffect(
      EffectVariant.TEAR_POOF_A,
      0,
      pickup.Position,
      VectorZero,
      pickup,
    );

    const scale = 0.2 + rng.RandomFloat() * 0.1;

    sparkle.SpriteScale = Vector(scale, scale);

    sparkle.SetColor(pickup.GetColor(), -1, 1);

    sparkle.Timeout = 8 + Math.floor(rng.RandomFloat() * 4);
  }
};

/** Maps each synergy note to the replacement collectible that unlocks it. */
const SYNERGY_NOTE_ITEMS: Partial<Record<NotePickupSubType, CollectibleType>> =
  {
    [NotePickupSubType.BRIMSTONE]: CollectibleTypeCustom.BRIMSTONE_NOTE,

    [NotePickupSubType.DR_FETUS]: CollectibleTypeCustom.DR_FETUS_NOTE,

    [NotePickupSubType.RUBBER]: CollectibleTypeCustom.RUBBER_NOTE,
  } as const;

/**
 * Returns the replacement collectible required for a synergy note.
 *
 * Returns undefined for normal notes.
 */
const getSynergyItem = (
  pickupSubType: NotePickupSubType,
): CollectibleType | undefined => SYNERGY_NOTE_ITEMS[pickupSubType];

/**
 * Returns whether a specific player is allowed to pick up a note.
 *
 * Rules:
 *
 * - Only Tainted Miku can pick up notes.
 * - Normal notes can be picked up by any Tainted Miku.
 * - Synergy notes can only be picked up by the Tainted Miku who personally has the corresponding
 *   replacement collectible.
 *
 * This is checked per player, so multiple Tainted Miku's work correctly in co-op.
 */
const canPickupNote = (
  pickupSubType: NotePickupSubType,
  player: EntityPlayer,
): boolean => {
  // --------------------------------------------------
  // Only Tainted Miku can collect notes.
  // --------------------------------------------------
  if (!isMiku(player, true)) {
    return false;
  }

  // --------------------------------------------------
  // Normal notes have no item requirement.
  // --------------------------------------------------
  if (!SYNERGY_NOTES.has(pickupSubType)) {
    return true;
  }

  // --------------------------------------------------
  // Get the replacement item for this synergy note.
  // --------------------------------------------------
  const requiredItem = getSynergyItem(pickupSubType);

  // A synergy note without a configured replacement item cannot be collected.
  if (requiredItem === undefined) {
    return false;
  }

  // --------------------------------------------------
  // Check THIS specific Miku.

  // This is important for co-op:

  // Miku 1 -> BRIMSTONE_NOTE -> can collect Miku 2 -> no BRIMSTONE_NOTE -> cannot collect
  // --------------------------------------------------
  return player.HasCollectible(requiredItem);
};

/**
 * Pushes a pickup away from a player.
 *
 * The push only happens when the player is close enough to physically collide with the note.
 */
const pushPickupAwayFromPlayer = (
  pickup: EntityPickup,
  player: EntityPlayer,
): void => {
  const distance = player.Position.sub(pickup.Position).Length();

  // Only push when actually being close/touching the pickup.
  if (distance > 12) {
    return;
  }

  const direction = pickup.Position.sub(player.Position);

  // Prevent division by zero when both entities occupy exactly the same position.
  if (direction.LengthSquared() <= 0) {
    return;
  }

  const pushDirection = direction.Normalized().mul(2.5);

  pickup.Velocity = pickup.Velocity.mul(0.8).add(pushDirection);
};

/**
 * Pushes a note away from players who are not allowed to collect it.
 *
 * Rules:
 *
 * - Non-Tainted Miku -> pushed away from ALL notes.
 * - Tainted Miku + normal note -> never pushed.
 * - Tainted Miku + correct synergy item -> never pushed.
 * - Tainted Miku + wrong/missing synergy item -> pushed.
 *
 * Every player is checked individually, allowing multiple Tainted Miku's to coexist correctly in
 * co-op.
 */
const pushAwayFromInvalidPlayers = (pickup: EntityPickup): void => {
  const pickupSubType = pickup.SubType as NotePickupSubType;

  const players = getPlayers();

  for (const player of players) {
    // Non-Tainted Miku cannot collect ANY note.
    if (!isMiku(player, true)) {
      pushPickupAwayFromPlayer(pickup, player);
      continue;
    }

    // Tainted Miku can always collect normal notes.
    if (!SYNERGY_NOTES.has(pickupSubType)) {
      continue;
    }

    if (canPickupNote(pickupSubType, player)) {
      continue;
    }

    pushPickupAwayFromPlayer(pickup, player);
  }
};

/**
 * A custom pickup representing musical notes with unique tear effects.
 *
 * Each NotePickup subtype has distinct behavior, color and uses.
 */
export class NotePickup extends Pickup {
  /**
   * Updates the visual effects and collision behavior for the note pickup.
   *
   * @param pickup The NotePickup entity.
   */
  @Callback(ModCallback.POST_PICKUP_UPDATE, PickupVariantCustom.NOTE)
  override postPickupUpdate(pickup: EntityPickup): void {
    const rng = pickup.GetDropRNG();

    applyNotePickupVisuals(pickup, rng);

    pushAwayFromInvalidPlayers(pickup);
  }

  /**
   * Registers all NotePickup subtypes as custom pickups.
   *
   * Collection rules:
   *
   * - Non-Tainted Miku: blocked.
   * - Tainted Miku + normal note: allowed.
   * - Tainted Miku + correct synergy item: allowed.
   * - Tainted Miku + incorrect synergy item: blocked.
   */
  static register(): void {
    for (const [subTypeKey, noteData] of Object.entries(NOTE_TYPE_DATA)) {
      const subType = Number(subTypeKey) as NotePickupSubType;

      mod.registerCustomPickup(
        PickupVariantCustom.NOTE,
        subType,
        // Collect function.
        (pickup, player) => {
          const playerData = getData<TaintedMikuData>(player);

          const currentNoteData =
            NOTE_TYPE_DATA[pickup.SubType as NotePickupSubType];

          playerData.erased ??= [];
          playerData.notes ??= [];

          playerData.notes.push({
            subType: pickup.SubType as NotePickupSubType,

            remainingUses: currentNoteData.uses,
          });

          SFXManager().Play(SoundEffect.SOUL_PICKUP, 0.8, 2, false, 1);
        },
        // Collision function.
        (pickup, player) =>
          canPickupNote(pickup.SubType as NotePickupSubType, player)
            ? undefined
            : true,
      );

      // EID Compat.
      if (EID) {
        EID.addEntity(
          EntityType.PICKUP,
          PickupVariantCustom.NOTE,
          subType,
          noteData.name,
          this.formatEIDDescription(noteData),
        );

        Debugger.eid(noteData.name, `Note: ${noteData.name} (${subType})`);
      }
    }
  }

  /**
   * Formats a note's EID description with its usage limit.
   *
   * @param note The note configuration.
   * @returns The formatted EID description including usage information.
   */
  private static formatEIDDescription(note: NoteTypeConfig): string {
    return note.uses === 1
      ? `{{Warning}} SINGLE USE {{Warning}}#${note.description}`
      : `${note.description}#{{Battery}} ${note.uses} uses`;
  }
}
