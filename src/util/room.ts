import { getEntities, getRandomFloat } from "isaacscript-common";

/**
 * Finds a random, non-colliding position in the current room.
 *
 * Ensures the position does not overlap with existing entities and stays within room bounds.
 *
 * @param safeRadius Minimum distance from other entities.
 * @param maxAttempts Number of random positions to try before falling back to room center.
 * @returns A valid position vector for spawning entities or pickups.
 */
export const getValidRoomPosition = (
  safeRadius = 20,
  maxAttempts = 20,
): Vector => {
  const room = Game().GetRoom();
  const entities = getEntities(-1, -1, -1, false);
  let spawnPos = room.GetCenterPos();

  for (let i = 0; i < maxAttempts; i++) {
    const x =
      room.GetTopLeftPos().X
      + getRandomFloat(
        0,
        room.GetBottomRightPos().X - room.GetTopLeftPos().X,
        undefined,
      );
    const y =
      room.GetTopLeftPos().Y
      + getRandomFloat(
        0,
        room.GetBottomRightPos().Y - room.GetTopLeftPos().Y,
        undefined,
      );
    const pos = Vector(x, y);

    const colliding = entities.some((e) => {
      const dx = e.Position.X - pos.X;
      const dy = e.Position.Y - pos.Y;
      return dx * dx + dy * dy < safeRadius * safeRadius;
    });

    if (!colliding) {
      spawnPos = pos;
      break;
    }
  }

  return spawnPos;
};
