import {
  EntityCollisionClass,
  EntityGridCollisionClass,
} from "isaac-typescript-definitions";
import { spawnPickup } from "isaacscript-common";
import { Debugger } from "../../util/debug";
import {
  NOTE_TYPE_DATA,
  NotePickupSubType,
} from "./NotePickup/NotePickupSubType";
import { PickupVariantCustom } from "./enum";

const getRandomNote = (): NotePickupSubType => {
  const keys = Object.keys(NOTE_TYPE_DATA);

  if (keys.length === 0) {
    return NotePickupSubType.LOVE;
  }

  return Number(
    keys[Math.floor(Math.random() * keys.length)],
  ) as NotePickupSubType;
};

/**
 * Spawns a colored `NotePickup` at the specified position.
 *
 * @param subType The subtype of the note.
 * @param position The position in the room to spawn the pickup.
 * @returns The spawned pickup entity, or undefined if spawning failed.
 */
export const spawnNotePickup = (
  subType: NotePickupSubType,
  position: Vector,
): EntityPickup => {
  const validSubType = subType in NOTE_TYPE_DATA ? subType : getRandomNote();

  const note = NOTE_TYPE_DATA[validSubType];
  const pickup = spawnPickup(PickupVariantCustom.NOTE, validSubType, position);

  const sprite = pickup.GetSprite();
  sprite.Color = note.color;

  pickup.GridCollisionClass = EntityGridCollisionClass.GROUND;
  pickup.EntityCollisionClass = EntityCollisionClass.PLAYER_OBJECTS;

  Debugger.pickup(
    "Note",
    `Spawned ${note.name} at (${position.X}, ${position.Y})`,
  );

  return pickup;
};
