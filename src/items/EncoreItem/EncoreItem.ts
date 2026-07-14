import {
  EntityType,
  ModCallback,
  PickupVariant,
  RoomType,
  SoundEffect,
} from "isaac-typescript-definitions";
import {
  anyPlayerHasCollectible,
  Callback,
  CallbackCustom,
  getEntities,
  getRandom,
  ModCallbackCustom,
  newRNG,
  setRoomUncleared,
  spawn,
  spawnPickup,
  VectorZero,
} from "isaacscript-common";
import type { EIDExtended } from "../../compat/EID";
import { Debugger } from "../../util/debug";
import { getEnemies } from "../../util/enemies";
import { getFrames } from "../../util/frames";
import { rollChance } from "../../util/rng";
import { getValidRoomPosition } from "../../util/room";
import { CollectibleTypeCustom } from "../enum";
import { Item } from "../Item";

interface EncoreRoomData {
  active?: boolean;
  triggered?: boolean;
  hadEnemies?: boolean;
  encoreDelayTimer?: number;
  enemies?: Array<{
    type: EntityType;
    variant: number;
    subType: number;
    position: Vector;
  }>;
}

const DEFAULT_ROOM_DATA: EncoreRoomData = {
  active: false,
  triggered: false,
  hadEnemies: false,
  enemies: [],
  encoreDelayTimer: undefined,
} as const;

// TODO: Balance pickups.
const ENCORE_PICKUPS: ReadonlyArray<{
  variant: PickupVariant;
  maxSubtype: number;
}> = [
  { variant: PickupVariant.COIN, maxSubtype: 4 },
  { variant: PickupVariant.HEART, maxSubtype: 4 },
  { variant: PickupVariant.BOMB, maxSubtype: 2 },
  { variant: PickupVariant.KEY, maxSubtype: 1 },
  { variant: PickupVariant.PILL, maxSubtype: 23 },
  { variant: PickupVariant.CARD, maxSubtype: 52 },
  { variant: PickupVariant.CHEST, maxSubtype: 0 },
] as const;

const ENCORE_DELAY = getFrames(5);
const ENCORE_CHANCE = 15;

const NAME = "Encore!";
const DESCRIPTION =
  `${ENCORE_CHANCE}% chance to trigger an {{ColorRed}}Encore{{CR}} after clearing a room.#`
  + "Enemies will respawn after {{ColorYellow}}5 seconds{{CR}} and drop a reward when defeated.#"
  + "Leaving the room {{ColorGray}}cancels{{CR}} the Encore.";

export class EncoreItem extends Item {
  v: { room: EncoreRoomData } = { room: { ...DEFAULT_ROOM_DATA } };

  @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
  override onNewRoom(): void {
    if (!anyPlayerHasCollectible(CollectibleTypeCustom.ENCORE)) {
      return;
    }

    const room = Game().GetRoom();
    if (room.GetType() === RoomType.BOSS) {
      return;
    }

    const aliveEnemies = getEnemies();
    if (aliveEnemies.length === 0) {
      return;
    }

    this.v.room.hadEnemies = true;
    this.v.room.enemies = aliveEnemies.map((e) => ({
      type: e.Type,
      variant: e.Variant,
      subType: e.SubType,
      position: e.Position,
    }));

    Debugger.item(NAME, `Enemies stored: ${this.v.room.enemies.length}`);
  }

  /**
   * Decides whether to block the normal clear room reward for an Encore.
   *
   * Boss rooms always allow rewards and never trigger Encore.
   *
   * @param rng RNG object for random chance calculation.
   * @param _position Position of the default reward spawn (unused here).
   * @returns `false` to block reward until Encore resolves, `true` or `undefined` otherwise.
   */
  @Callback(ModCallback.PRE_SPAWN_CLEAR_AWARD)
  override onPreSpawnClearAward(
    rng: RNG,
    _position: Vector,
  ): boolean | undefined {
    if (!anyPlayerHasCollectible(CollectibleTypeCustom.ENCORE)) {
      return undefined;
    }

    const room = Game().GetRoom();
    if (room.GetType() === RoomType.BOSS) {
      return undefined;
    }

    if (this.v.room.triggered ?? false) {
      return true;
    }

    if (rollChance(ENCORE_CHANCE, rng)) {
      this.v.room.triggered = true;
      this.v.room.active = true;
      this.v.room.encoreDelayTimer = ENCORE_DELAY;

      Debugger.item(NAME, "Encore! triggered");
      SFXManager().Play(SoundEffect.POWER_UP_1, 2);

      return false;
    }

    return true;
  }

  /**
   * Handles countdown timer for Encore, spawns enemies after delay, and checks for Encore
   * completion to spawn a reward.
   */
  @Callback(ModCallback.POST_UPDATE)
  override postUpdate(): void {
    if (!anyPlayerHasCollectible(CollectibleTypeCustom.ENCORE)) {
      return;
    }
    if (!(this.v.room.active ?? false)) {
      return;
    }

    const room = Game().GetRoom();

    if (this.v.room.encoreDelayTimer !== undefined) {
      this.v.room.encoreDelayTimer--;

      const roomTL = room.GetTopLeftPos();
      const roomBR = room.GetBottomRightPos();
      const playerInRoom = getEntities(EntityType.PLAYER, -1, -1, false).some(
        (p) =>
          p.Position.X >= roomTL.X
          && p.Position.X <= roomBR.X
          && p.Position.Y >= roomTL.Y
          && p.Position.Y <= roomBR.Y,
      );

      if (!playerInRoom) {
        Debugger.item(NAME, "Player left the room. Encore cancelled.");
        this.v.room.active = false;
        this.v.room.triggered = false;
        this.v.room.encoreDelayTimer = undefined;
        return;
      }

      if (this.v.room.encoreDelayTimer % 30 === 0) {
        SFXManager().Play(SoundEffect.BEEP);
      }

      if (this.v.room.encoreDelayTimer <= 0) {
        this.spawnEncoreEnemies();
        SFXManager().Play(SoundEffect.HAPPY_RAINBOW, 0.75);
        this.v.room.encoreDelayTimer = undefined;
      }

      return;
    }

    // Check if Encore enemies are cleared.
    const aliveEnemies = getEnemies();
    if (aliveEnemies.length === 0) {
      Debugger.item(NAME, "Encore cleared!");
      this.v.room.active = false;
      this.spawnEncoreReward(newRNG(room.GetSpawnSeed()));
    }
  }

  /**
   * Respawns enemies recorded for Encore. Sets the room as uncleared to allow additional combat.
   */
  private spawnEncoreEnemies(): void {
    setRoomUncleared();
    // TODO: Enemies in Encore should get buffed.

    for (const enemy of this.v.room.enemies ?? []) {
      spawn(
        enemy.type,
        enemy.variant,
        enemy.subType,
        enemy.position,
        VectorZero,
        undefined,
      );
    }

    Debugger.item(NAME, "Enemies respawned");
  }

  /** Spawns a random pickup after clearing the Encore enemies. */
  private spawnEncoreReward(rng: RNG): void {
    const pickup =
      ENCORE_PICKUPS[Math.floor(getRandom(rng) * ENCORE_PICKUPS.length)];

    if (!pickup) {
      Debugger.item(NAME, "Could'nt generate pickup");
      return;
    }

    const subtype = Math.floor(getRandom(rng) * (pickup.maxSubtype + 1));
    const spawnPos = getValidRoomPosition();

    spawnPickup(pickup.variant, subtype, spawnPos, VectorZero, undefined);
    Debugger.item(
      NAME,
      `Spawned pickup: Variant ${pickup.variant}, Subtype ${subtype}`,
    );
  }

  /** Registers EID description for the Encore collectible. */
  override setupEID(eid: EIDExtended): void {
    eid.addCollectible(CollectibleTypeCustom.ENCORE, DESCRIPTION, NAME);
    Debugger.eid(NAME, "Add description.");
  }
}
