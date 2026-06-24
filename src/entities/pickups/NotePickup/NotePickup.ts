import {
  EffectVariant,
  EntityType,
  ModCallback,
  SoundEffect,
} from "isaac-typescript-definitions";
import {
  Callback,
  getRandom,
  spawnEffect,
  VectorZero,
} from "isaacscript-common";
import { isMiku } from "../../../characters/enum";

import type { TaintedMikuData } from "../../../characters/Miku/MikuTaintedCharacter";
import { mod } from "../../../mod";
import { getData } from "../../../util/data";
import { Debugger } from "../../../util/debug";
import { rollChance } from "../../../util/rng";
import { PickupVariantCustom } from "../enum";
import { Pickup } from "../Pickup";
import type { NotePickupSubType } from "./NotePickupSubType";
import { NOTE_TYPE_DATA } from "./NotePickupSubType";

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
 * - Adds a slight horizontal sway for organic motion.
 * - Occasionally spawns small sparkle effects around the note.
 *
 * @param pickup The pickup entity to animate.
 * @param rng A random number generator instance for deterministic effects.
 */
const applyNotePickupVisuals = (pickup: EntityPickup, rng: RNG): void => {
  const subType = pickup.SubType as NotePickupSubType;
  const noteData = NOTE_TYPE_DATA[subType];

  pickup.SetColor(noteData.color, -1, 0);

  // Oscillating rotation
  pickup.SpriteRotation =
    Math.sin(Game().GetFrameCount() * 0.1 + pickup.InitSeed) * 5;

  // Slight horizontal sway
  if (rollChance(20, rng)) {
    const sway = getRandom(rng) * 0.4 - 0.2; // [-0.2, 0.2)
    pickup.Position = pickup.Position.add(Vector(sway, 0));
  }

  // Small sparkling effect
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

/**
 * A custom pickup representing musical notes with unique tear effects.
 *
 * Each NotePickup subtype has distinct behavior, color and uses.
 */
export class NotePickup extends Pickup {
  /**
   * Updates the visual effects for the note pickup each frame.
   *
   * @param pickup The note pickup entity to update.
   */
  @Callback(ModCallback.POST_PICKUP_UPDATE, PickupVariantCustom.NOTE)
  override postPickupUpdate(pickup: EntityPickup): void {
    const rng = pickup.GetDropRNG();
    applyNotePickupVisuals(pickup, rng);
  }

  /**
   * Registers all `NotePickup` subtypes as custom pickups.
   *
   * - Adds the pickup to the mod's registry.
   * - Associates subtype-specific behavior when collected by a player.
   * - Adds entries to EID if available for in-game descriptions.
   */
  static register(): void {
    for (const [subTypeKey, noteData] of Object.entries(NOTE_TYPE_DATA)) {
      const subType = Number(subTypeKey) as NotePickupSubType;

      mod.registerCustomPickup(
        PickupVariantCustom.NOTE,
        subType,
        (pickup, player) => {
          const playerData = getData<TaintedMikuData>(player);
          const noteData = NOTE_TYPE_DATA[pickup.SubType as NotePickupSubType];

          playerData.erased ??= [];
          playerData.notes ??= [];

          playerData.notes.push({
            subType: pickup.SubType as NotePickupSubType,
            remainingUses: noteData.uses,
          });

          SFXManager().Play(SoundEffect.SOUL_PICKUP, 0.8, 2, false, 1);
        },
        (_, player) => (isMiku(player, true) ? undefined : true),
      );

      if (EID) {
        EID.addEntity(
          EntityType.PICKUP,
          PickupVariantCustom.NOTE,
          subType,
          noteData.name,
          this.addUses(noteData),
        );

        Debugger.eid(noteData.name, `Note: ${noteData.name} (${subType})`);
      }
    }
  }

  private static addUses(note: NoteTypeConfig) {
    let { description } = note;
    description =
      note.uses === 1
        ? `{{Warning}} SINGLE USE {{Warning}}#${description}`
        : `${description}(${note.uses} charges)`;

    return description;
  }
}
