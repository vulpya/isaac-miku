import type { DamageFlag } from "isaac-typescript-definitions";
import {
  ActiveSlot,
  ButtonAction,
  CacheFlag,
  CollectibleType,
  EffectVariant,
  EntityCollisionClass,
  ModCallback,
  PlayerVariant,
  SoundEffect,
} from "isaac-typescript-definitions";
import {
  anyPlayerIs,
  Callback,
  CallbackCustom,
  getPlayerFromEntity,
  getPlayersOfType,
  getRandom,
  isActiveEnemy,
  jsonDecode,
  jsonEncode,
  ModCallbackCustom,
  ReadonlyMap,
  removeCollectibleFromPools,
  spawnCollectible,
  spawnEffect,
  spawnTear,
  VectorZero,
} from "isaacscript-common";
import type { EIDExtended } from "../../compat/EID";
import { appendToDescription } from "../../compat/EID";
import { getShowNoteCounter, isMCMOpen } from "../../compat/MCM";
import { spawnNotePickup } from "../../entities/pickups/helper";
import type { NoteInstance } from "../../entities/pickups/NotePickup/NotePickup";
import {
  ITEM_SYNERGIES,
  NOTE_TYPE_DATA,
  NotePickupSubType,
  SYNERGY_NOTES,
} from "../../entities/pickups/NotePickup/NotePickupSubType";
import type { BloodNoteTearData } from "../../entities/tears/BloodNoteTear/BloodNoteTear";
import { CollectibleTypeCustom } from "../../items/enum";
import { mod } from "../../mod";
import { maxFireDelayToTears, tearsToMaxFireDelay } from "../../util/calc";
import { ISAAC_STATS } from "../../util/const";
import { updateCollectibleCostumes } from "../../util/costumes";
import { getData } from "../../util/data";
import { Debugger } from "../../util/debug";
import { setTearColor } from "../../util/effects";
import { eraseEnemies, getEnemyKey } from "../../util/enemies";
import { rollWeighted } from "../../util/rng";
import type { ModSaveData } from "../../util/save";
import { SAVE_DATA } from "../../util/save";
import { Character } from "../Character";
import { isMiku, PlayerTypeCustom } from "../enum";
import type { MikuPlayerData } from "./MikuCharacter";
import {
  isNoteItemDisabled,
  MikuAttackMode as MikuNoteMode,
  setMikuAttackMode,
} from "./mikuHelper";

export interface TaintedMikuData extends MikuPlayerData {
  attackMode?: MikuNoteMode;
  notes?: NoteInstance[];
  unlockedSynergyNotes?: NotePickupSubType[];
  erased?: string[];
  storedCollectibles?: Set<CollectibleType>;
}

export interface TaintedMikuSaveData {
  attackMode?: MikuNoteMode;
  notes?: NoteInstance[];
  unlockedSynergyNotes?: NotePickupSubType[];
  erased?: string[];
  storedCollectibles?: CollectibleType[];
}

const NAME = "Miku";
const DESCRIPTION = "A twisted idol, using enemies as her melody.";
const BIRTHRIGHT_DESC =
  "Her fractured melody splits apart, causing multiple Lost Notes to fire with every shot.";
const BIRTHRIGHT_MULTI_SHOT = 5;
const HAIR = Isaac.GetCostumeIdByPath(
  "gfx/characters/Character_MikuHead_b.anm2",
);
const POCKET_ACTIVE = CollectibleTypeCustom.BROKEN_VOICE;
const NULL_ITEM = CollectibleTypeCustom.MIKU_IDOL;
const NOTE_DROP_CHANCE = 40;
const STARTING_NOTE_COUNT = 5;

const ITEM_REPLACEMENTS: Partial<Record<CollectibleType, CollectibleType>> = {
  [CollectibleType.BRIMSTONE]: CollectibleTypeCustom.BRIMSTONE_NOTE,
  [CollectibleType.DR_FETUS]: CollectibleTypeCustom.DR_FETUS_NOTE,
  [CollectibleType.ERASER]: CollectibleTypeCustom.ERASER_NOTE,
} as const;

const ITEM_COSTUMES: Partial<Record<CollectibleType, CollectibleType>> = {
  [CollectibleTypeCustom.BRIMSTONE_NOTE]: CollectibleType.BRIMSTONE,
  [CollectibleTypeCustom.DR_FETUS_NOTE]: CollectibleType.DR_FETUS,
} as const;

/** Replacement collectibles required to determine who can pick up synergy notes. */
export const SYNERGY_NOTE_ITEMS: Partial<
  Record<NotePickupSubType, CollectibleType>
> = {
  [NotePickupSubType.BRIMSTONE]: CollectibleTypeCustom.BRIMSTONE_NOTE,
  [NotePickupSubType.DR_FETUS]: CollectibleTypeCustom.DR_FETUS_NOTE,
  [NotePickupSubType.ERASER]: CollectibleTypeCustom.ERASER_NOTE,
} as const;

export const MIKU_B_STATS = new ReadonlyMap<CacheFlag, float>([
  [CacheFlag.DAMAGE, 4.35],
  [CacheFlag.LUCK, -1.5],
  [CacheFlag.COLOR, 2],
  [CacheFlag.FIRE_DELAY, 2.13],
]);

export class MikuTaintedCharacter extends Character {
  /** Spritesheet with icons for HUD. */
  private noteSprite: Sprite | undefined = undefined;
  /** Spritesheet with icons for selected note display. */
  private activeNoteSprite: Sprite | undefined = undefined;
  /** Font for the uses text of the notes. */
  private font: Font | undefined = undefined;

  @CallbackCustom(ModCallbackCustom.POST_GAME_STARTED_REORDERED, true)
  override onGameStart(): void {
    if (!mod.HasData()) {
      return;
    }

    const loaded = jsonDecode(mod.LoadData()) as unknown as ModSaveData;

    Object.assign(SAVE_DATA, loaded);
  }

  @Callback(ModCallback.PRE_GAME_EXIT)
  override onGameExit(): void {
    SAVE_DATA.miku_b_players = {};

    const players = getPlayersOfType(PlayerTypeCustom.MIKU_B);
    for (const player of players) {
      const playerData = getData<TaintedMikuData>(player);

      const { erased, notes, attackMode, storedCollectibles } = playerData;

      SAVE_DATA.miku_b_players[player.ControllerIndex.toString()] = {
        attackMode: attackMode ?? MikuNoteMode.EMPTY,
        erased: erased ? [...erased] : [],
        notes: notes ? [...notes] : [],
        unlockedSynergyNotes: playerData.unlockedSynergyNotes
          ? [...playerData.unlockedSynergyNotes]
          : [],
        storedCollectibles: storedCollectibles ? [...storedCollectibles] : [],
      };
    }

    mod.SaveData(jsonEncode(SAVE_DATA));
  }

  /**
   * Called after Tainted Miku is initialized the first time.
   *
   * Adds Tainted Miku's hair and patch costume.
   *
   * @param player The player entity being initialized.
   */
  @CallbackCustom(
    ModCallbackCustom.POST_PLAYER_INIT_FIRST,
    PlayerVariant.PLAYER,
    PlayerTypeCustom.MIKU_B,
  )
  override postPlayerInitFirst(player: EntityPlayer): void {
    const playerData = getData<TaintedMikuData>(player);

    playerData.hasIdol = false;
    playerData.attackMode = MikuNoteMode.EMPTY;
    playerData.notes = [];
    playerData.erased = [];
    playerData.unlockedSynergyNotes = [];
    playerData.storedCollectibles = new Set();

    player.AddNullCostume(HAIR);
    Debugger.char(`${NAME} (Tainted)`, `Applied null costume: ${HAIR}.`);

    player.AddCollectible(NULL_ITEM, 0);
    playerData.hasIdol = true;
    Debugger.char(NAME, `Applied null item: ${NULL_ITEM}.`);

    if (!player.HasCollectible(POCKET_ACTIVE)) {
      player.SetPocketActiveItem(POCKET_ACTIVE, ActiveSlot.POCKET, false);
      Debugger.char(NAME, "Give microphone pocket active item.");
    }

    this.addStartingNotes(player, STARTING_NOTE_COUNT);
  }

  @CallbackCustom(
    ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED,
    PlayerVariant.PLAYER,
    PlayerTypeCustom.MIKU_B,
  )
  override postPlayerUpdate(player: EntityPlayer): void {
    const playerData = getData<TaintedMikuData>(player);
    const { notes } = playerData;

    if (!notes || notes.length === 0) {
      return;
    }

    const isDropping = Input.IsActionTriggered(
      ButtonAction.DROP,
      player.ControllerIndex,
    );

    if (
      playerData.attackMode === MikuNoteMode.VOICES
      && isDropping
      && notes.length > 1
    ) {
      const firstNote = notes.shift();
      if (firstNote) {
        notes.push(firstNote);
      }

      SFXManager().Play(
        SoundEffect.SOUL_PICKUP,
        0.8,
        2,
        false,
        1 + (getRandom(player.GetDropRNG()) * 0.15 - 0.075),
      );
    }
  }

  /**
   * Called after Tainted Miku is initialized.
   *
   * Reads the mod save data to set the data for Tainted Miku on a continued run.
   *
   * @param player The player entity being initialized.
   */
  @Callback(ModCallback.POST_PLAYER_INIT, PlayerVariant.PLAYER)
  override postPlayerInit(player: EntityPlayer): void {
    super.postPlayerInit(player);
    if (!isMiku(player, true)) {
      return;
    }

    const saved = SAVE_DATA.miku_b_players[player.ControllerIndex.toString()];
    if (!saved) {
      return;
    }

    const playerData = getData<TaintedMikuData>(player);

    playerData.erased = saved.erased ?? [];
    playerData.notes = saved.notes ?? [];
    playerData.unlockedSynergyNotes = saved.unlockedSynergyNotes ?? [];
    playerData.attackMode = saved.attackMode ?? MikuNoteMode.EMPTY;

    playerData.storedCollectibles = new Set(saved.storedCollectibles ?? []);

    for (const collectible of playerData.storedCollectibles) {
      if (!player.HasCollectible(collectible)) {
        player.AddCollectible(collectible);
      }
    }
  }

  @Callback(ModCallback.EVALUATE_CACHE, CacheFlag.FIRE_DELAY)
  override cacheFireDelay(player: EntityPlayer): void {
    if (!isMiku(player, true)) {
      return;
    }

    const tears = maxFireDelayToTears(player.MaxFireDelay);
    if (tears >= ISAAC_STATS.TEARS_THRESHOLD) {
      player.MaxFireDelay = tearsToMaxFireDelay(0.1);
    }
  }

  @Callback(ModCallback.POST_FIRE_TEAR)
  override postFireTear(tear: EntityTear): void {
    const player = getPlayerFromEntity(tear);

    if (!player || !isMiku(player, true)) {
      return;
    }

    const playerData = getData<TaintedMikuData>(player);
    const { notes, attackMode } = playerData;

    if (attackMode === MikuNoteMode.EMPTY) {
      return;
    }

    if (!notes || notes.length === 0) {
      return;
    }

    const amount = player.HasCollectible(CollectibleType.BIRTHRIGHT)
      ? BIRTHRIGHT_MULTI_SHOT
      : 1;

    const activeNotes = notes.slice(0, amount);

    for (const [i, note] of activeNotes.entries()) {
      let noteTear = tear;

      if (i > 0) {
        noteTear = spawnTear(
          tear.Variant,
          tear.SubType,
          tear.Position,
          tear.Velocity,
          player,
        );

        noteTear.CollisionDamage = tear.CollisionDamage;
        noteTear.Scale = tear.Scale;
      }

      this.applyNoteEffect(player, noteTear, note);

      const tearData = getData<BloodNoteTearData>(noteTear);
      setTearColor(noteTear, tearData, noteTear.GetDropRNG());
    }
  }

  @Callback(ModCallback.POST_NPC_INIT)
  override postNPCInit(npc: EntityNPC): void {
    const players = getPlayersOfType(PlayerTypeCustom.MIKU_B);
    if (players.length === 0) {
      return;
    }

    for (const player of players) {
      const playerData = getData<TaintedMikuData>(player);
      if (!playerData.erased) {
        return;
      }

      if (playerData.erased.includes(getEnemyKey(npc))) {
        const erased = eraseEnemies(npc.Type, npc.Variant);
        Debugger.char(NAME, `Erased ${erased} enemies.`);
      }
    }
  }

  @Callback(ModCallback.POST_RENDER)
  render(): void {
    if (isMCMOpen()) {
      return;
    }

    const players = getPlayersOfType(PlayerTypeCustom.MIKU_B);
    if (players.length === 0) {
      return;
    }

    const controllerSides: Record<number, boolean> = {
      0: false, // player 1 - left
      1: true, // player 2 - right
      2: false, // player 3 - left
      3: true, // player 4 - right
    };

    for (const player of players) {
      const playerData = getData<TaintedMikuData>(player);
      const { notes, attackMode } = playerData;

      if (!notes || notes.length === 0) {
        continue;
      }

      // Determine HUD side.
      const index = player.ControllerIndex;
      const isRightSide = controllerSides[index] ?? false;

      // HUD layout config.
      const hudOffset = Options.HUDOffset;
      const hudX = hudOffset * 20;

      const startX = isRightSide ? 300 - hudX : 45 + hudX;
      const startY = 60;

      const spacing = 16;
      const baseSize = 14;

      const maxPerRow = 5;
      const maxRows = 2;
      const maxVisible = maxPerRow * maxRows;

      // Load note sprite.
      if (!this.noteSprite) {
        this.noteSprite = Sprite();
        this.noteSprite.Load("gfx/pickups/note.anm2", true);
        this.noteSprite.Play("Idle", true);
      }

      // Load active note sprite.
      if (!this.activeNoteSprite) {
        this.activeNoteSprite = Sprite();
        this.activeNoteSprite.Load("gfx/pickups/note.anm2", true);
        this.activeNoteSprite.Play("Idle", true);
      }

      // Load font.
      if (!this.font) {
        this.font = Font();
        this.font.Load("font/pftempestasevencondensed.fnt");
      }

      // --------------------------------------------------
      // Render note inventory.
      // --------------------------------------------------
      const visibleNotes = notes.slice(0, maxVisible);

      for (const [i, note] of visibleNotes.entries()) {
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;

        const x = startX + col * spacing;
        const y = startY + row * spacing;

        const noteConfig = NOTE_TYPE_DATA[note.subType];

        this.noteSprite.Scale =
          i === 0
            ? Vector((baseSize / 16) * 1.2, (baseSize / 16) * 1.2)
            : Vector(baseSize / 16, baseSize / 16);

        const baseColor =
          note.remainingUses < noteConfig.uses
            ? Color(
                noteConfig.color.R * (note.remainingUses / noteConfig.uses),
                noteConfig.color.G * (note.remainingUses / noteConfig.uses),
                noteConfig.color.B * (note.remainingUses / noteConfig.uses),
                noteConfig.color.A,
                0,
                0,
                0,
              )
            : noteConfig.color;

        this.noteSprite.Color =
          attackMode === MikuNoteMode.EMPTY
            ? Color(
                baseColor.R * 0.35,
                baseColor.G * 0.35,
                baseColor.B * 0.35,
                baseColor.A,
                0,
                0,
                0,
              )
            : baseColor;

        this.noteSprite.Render(Vector(x, y));
      }

      // --------------------------------------------------
      // Selected note above player
      // --------------------------------------------------
      const game = Game();
      const hud = game.GetHUD();

      const isPausedCutscene =
        !hud.IsVisible() || game.GetRoom().GetFrameCount() < 5;

      const activeNote = notes[0];

      if (
        attackMode === MikuNoteMode.VOICES
        && activeNote
        && !isPausedCutscene
      ) {
        const noteConfig = NOTE_TYPE_DATA[activeNote.subType];

        const screenPos: Vector = Isaac.WorldToScreen(player.Position);

        const floatX = screenPos.X;
        const floatY = screenPos.Y - 50;

        const pulse = 1 + Math.sin(Game().GetFrameCount() * 0.2) * 0.08;

        const breath = 0.85 + Math.sin(Game().GetFrameCount() * 0.1) * 0.15;

        this.activeNoteSprite.Scale = Vector(pulse, pulse);

        const baseColor =
          activeNote.remainingUses < noteConfig.uses
            ? Color(
                noteConfig.color.R
                  * (activeNote.remainingUses / noteConfig.uses),
                noteConfig.color.G
                  * (activeNote.remainingUses / noteConfig.uses),
                noteConfig.color.B
                  * (activeNote.remainingUses / noteConfig.uses),
                noteConfig.color.A,
                0,
                0,
                0,
              )
            : noteConfig.color;

        this.activeNoteSprite.Color = Color(
          baseColor.R * breath,
          baseColor.G * breath,
          baseColor.B * breath,
          1,
          0,
          0,
          0,
        );

        this.activeNoteSprite.Render(Vector(floatX, floatY));

        // Remaining uses text.
        if (getShowNoteCounter()) {
          const text = `${activeNote.remainingUses}`;
          const textScale = 0.5;

          const textX = floatX + 6;
          const textY = floatY + 6;

          // Shadow.
          this.font.DrawStringScaled(
            text,
            textX + 1,
            textY + 1,
            textScale,
            textScale,
            KColor(0, 0, 0, 1),
            0,
            true,
          );

          // Main text.
          this.font.DrawStringScaled(
            text,
            textX,
            textY,
            textScale,
            textScale,
            KColor(1, 1, 1, 1),
            0,
            true,
          );
        }

        // Update collectible costumes.
        updateCollectibleCostumes(player, ITEM_COSTUMES);
      }
    }
  }

  @Callback(ModCallback.ENTITY_TAKE_DMG)
  override entityTakeDamage(
    entity: Entity,
    _amount: float,
    _flags: BitFlags<DamageFlag>,
    source: EntityRef,
    _frames: int,
  ): boolean {
    if (!source.Entity) {
      return true;
    }

    const player = getPlayerFromEntity(source.Entity);
    if (!player) {
      return true;
    }

    const tear = source.Entity.ToTear();
    if (tear) {
      const tearData = getData<BloodNoteTearData>(tear);
      if (tearData.onHitEnemy && isActiveEnemy(entity)) {
        tearData.onHitEnemy(entity as EntityNPC);
      }
    }

    return true;
  }

  /**
   * Handles enemy death events for note drops.
   * - Rolls a note subtype based on weight and a general `noteDropChance`.
   * - Spawns the note pickup at the enemy's position if a roll succeeds.
   *
   * @param npc The NPC entity that died.
   */
  @Callback(ModCallback.POST_NPC_DEATH)
  override postNPCDeath(npc: EntityNPC): void {
    if (!anyPlayerIs(PlayerTypeCustom.MIKU_B) || !npc.IsEnemy()) {
      return;
    }

    const unlocked = new Set<NotePickupSubType>();

    for (const player of getPlayersOfType(PlayerTypeCustom.MIKU_B)) {
      const data = getData<TaintedMikuData>(player);

      for (const note of data.unlockedSynergyNotes ?? []) {
        unlocked.add(note);
      }
    }

    const noteSubTypes = Object.values(NotePickupSubType).filter(
      (value): value is NotePickupSubType => {
        if (typeof value !== "number") {
          return false;
        }

        const config = NOTE_TYPE_DATA[value];

        if (config.weight <= 0) {
          return false;
        }

        if (!SYNERGY_NOTES.has(value)) {
          return true;
        }

        // Add synergy notes if available.
        return unlocked.has(value);
      },
    );

    const weights = noteSubTypes.map(
      (subType) => NOTE_TYPE_DATA[subType].weight,
    );

    const note = rollWeighted(
      noteSubTypes,
      weights,
      npc.GetDropRNG(),
      NOTE_DROP_CHANCE,
    );

    if (note !== undefined) {
      spawnNotePickup(note, npc.Position);
    }
  }

  @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
  debugSpawnAllNotes(player: EntityPlayer): void {
    if (!isMiku(player, true)) {
      return;
    }

    if (!Input.IsActionTriggered(ButtonAction.BOMB, player.ControllerIndex)) {
      return;
    }

    const noteSubTypes = Object.values(NotePickupSubType).filter(
      (value): value is NotePickupSubType => typeof value === "number",
    );

    const roomCenter = Game().GetRoom().GetCenterPos();
    const spacing = 20;
    const totalWidth = (noteSubTypes.length - 1) * spacing;
    const startX = roomCenter.X - totalWidth / 2;

    for (const [index, subType] of noteSubTypes.entries()) {
      const position = Vector(startX + index * spacing, roomCenter.Y);

      spawnNotePickup(subType, position);
    }

    Debugger.char(
      NAME,
      `Spawned all ${noteSubTypes.length} note pickups, including synergy notes.`,
    );
  }

  // @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
  debugSpawnShopItem(player: EntityPlayer): void {
    if (!isMiku(player, true)) {
      return;
    }

    // Press the DROP button to spawn test item.
    if (!Input.IsActionTriggered(ButtonAction.DROP, player.ControllerIndex)) {
      return;
    }

    const pickup = spawnCollectible(
      CollectibleType.ERASER,
      player.Position,
      player.GetDropRNG(),
    ).ToPickup();

    if (!pickup) {
      return;
    }

    pickup.Price = 15;
    pickup.ShopItemId = 1;

    Debugger.char(NAME, "Spawned test Eraser shop item for 15¢.");
  }

  @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED)
  override postAddCollectible(
    player: EntityPlayer,
    collectibleType: CollectibleType,
  ): void {
    if (!isMiku(player, true)) {
      return;
    }

    const synergyNote = ITEM_SYNERGIES[collectibleType];
    const replaceItem = ITEM_REPLACEMENTS[collectibleType];

    if (synergyNote === undefined || replaceItem === undefined) {
      return;
    }

    const data = getData<TaintedMikuData>(player);

    data.unlockedSynergyNotes ??= [];

    if (!data.unlockedSynergyNotes.includes(synergyNote)) {
      data.unlockedSynergyNotes.push(synergyNote);

      // TODO: Add better way to make this less hard coded.
      if (collectibleType === CollectibleType.ERASER) {
        data.storedCollectibles ??= new Set();
        data.storedCollectibles.add(CollectibleType.ERASER);

        removeCollectibleFromPools(collectibleType);
      }
    }

    player.RemoveCollectible(collectibleType);
    player.AddCollectible(replaceItem);

    spawnNotePickup(synergyNote, player.Position);

    SFXManager().Play(SoundEffect.POWER_UP_SPEWER);
    spawnEffect(EffectVariant.POOF_1, 0, player.Position, VectorZero);
  }

  @Callback(ModCallback.PRE_PICKUP_COLLISION)
  override prePickupCollision(
    pickup: EntityPickup,
    collider: Entity,
    _low: boolean,
  ): boolean | undefined {
    const player = getPlayerFromEntity(collider);

    if (!player || !isMiku(player, true)) {
      return undefined;
    }

    // Synergy note pickups require the corresponding replacement item.
    const synergyRequiredItem =
      SYNERGY_NOTE_ITEMS[pickup.SubType as NotePickupSubType];

    if (
      synergyRequiredItem !== undefined
      && !player.HasCollectible(synergyRequiredItem)
    ) {
      return false;
    }

    const itemID = pickup.SubType as CollectibleType;

    if (
      itemID === CollectibleType.ERASER
      && player.HasCollectible(CollectibleTypeCustom.ERASER_NOTE)
    ) {
      return false;
    }

    const synergyNote = ITEM_SYNERGIES[itemID];
    const replaceItem = ITEM_REPLACEMENTS[itemID];

    this.checkDisabledItem(player, itemID);

    if (synergyNote === undefined || replaceItem === undefined) {
      return undefined;
    }

    if (pickup.Price > 0) {
      return undefined;
    }

    this.replaceWithNote(player, pickup, synergyNote, replaceItem);

    return undefined;
  }

  /**
   * Checks whether the specified collectible is disabled while Tainted Miku is using Notes mode.
   *
   * If the item is disabled, switches Tainted Miku back to Empty mode.
   *
   * @param player The player character entity.
   * @param itemID The collectible being checked.
   */
  private checkDisabledItem(
    player: EntityPlayer,
    itemID: CollectibleType,
  ): void {
    const data = getData<TaintedMikuData>(player);

    if (isNoteItemDisabled(itemID) && data.attackMode !== MikuNoteMode.EMPTY) {
      setMikuAttackMode(player, MikuNoteMode.EMPTY);

      Debugger.char(
        NAME,
        `Switched to Empty mode because ${itemID} is disabled in Notes mode.`,
      );
    }
  }

  /**
   * Applies the effects of a note to a fired tear.
   *
   * Triggers the note's tear effects, updates the tear's color, and consumes one use of the note.
   * Removes the note from Tainted Miku's note inventory when all of its uses have been consumed.
   *
   * @param player The player entity firing the tear.
   * @param tear The tear receiving the note's effects.
   * @param note The note being consumed.
   */
  private applyNoteEffect(
    player: EntityPlayer,
    tear: EntityTear,
    note: NoteInstance,
  ): void {
    const noteData = NOTE_TYPE_DATA[note.subType];
    const tearData = getData<BloodNoteTearData>(tear);

    noteData.applyEffect?.(player, tear);
    noteData.onFireTear?.(player, tear);

    tearData.color = noteData.color;

    note.remainingUses--;

    if (note.remainingUses <= 0) {
      const playerData = getData<TaintedMikuData>(player);
      playerData.notes = playerData.notes?.filter((n) => n !== note);
    }
  }

  /**
   * Adds a number of random non-synergy notes to Tainted Miku's inventory.
   *
   * Notes are selected using their configured weights and are removed from the available pool after
   * being selected to prevent duplicates.
   *
   * @param player The player entity receiving the notes.
   * @param amount The maximum number of starting notes to add.
   */
  private addStartingNotes(player: EntityPlayer, amount: number): void {
    const playerData = getData<TaintedMikuData>(player);

    playerData.notes ??= [];

    const availableNotes = Object.values(NotePickupSubType).filter(
      (value): value is NotePickupSubType => {
        if (typeof value !== "number") {
          return false;
        }

        if (SYNERGY_NOTES.has(value)) {
          return false;
        }

        return NOTE_TYPE_DATA[value].weight > 0;
      },
    );

    const rng = player.GetDropRNG();
    const notesToAdd = Math.min(amount, availableNotes.length);

    for (let i = 0; i < notesToAdd; i++) {
      const weights = availableNotes.map(
        (subType) => NOTE_TYPE_DATA[subType].weight,
      );

      const noteSubType = rollWeighted(availableNotes, weights, rng, 100);

      if (noteSubType === undefined) {
        break;
      }

      const config = NOTE_TYPE_DATA[noteSubType];

      playerData.notes.push({
        subType: noteSubType,
        remainingUses: config.uses,
      });

      // Prevent this note from being selected again.
      const index = availableNotes.indexOf(noteSubType);
      if (index !== -1) {
        availableNotes.splice(index, 1);
      }
    }

    Debugger.char(
      NAME,
      `Added ${playerData.notes.length} random starting notes.`,
    );
  }

  /**
   * Replaces a collectible pickup with its corresponding synergy note.
   *
   * Unlocks the synergy note, gives Tainted Miku the replacement collectible, plays the collection
   * animation, effects and spawns an associated note pickup.
   *
   * @param player The player entity collecting the item.
   * @param pickup The collectible pickup being replaced.
   * @param synergyNote The synergy note unlocked by the collectible.
   * @param replaceItem The replacement collectible given to the player.
   */
  private replaceWithNote(
    player: EntityPlayer,
    pickup: EntityPickup,
    synergyNote: NotePickupSubType,
    replaceItem: CollectibleType,
  ): void {
    const data = getData<TaintedMikuData>(player);

    data.unlockedSynergyNotes ??= [];

    if (!data.unlockedSynergyNotes.includes(synergyNote)) {
      data.unlockedSynergyNotes.push(synergyNote);
    }

    player.AnimateCollectible(replaceItem);
    player.AddCollectible(replaceItem);

    pickup.EntityCollisionClass = EntityCollisionClass.NONE;
    pickup.GetSprite().Play("Collect", true);
    pickup.Timeout = 2;

    SFXManager().Play(SoundEffect.POWER_UP_SPEWER);

    spawnEffect(EffectVariant.POOF_1, 0, pickup.Position, VectorZero);

    spawnNotePickup(synergyNote, player.Position);
  }

  /**
   * Sets up **External Item Descriptions (EID)** compatibility for Tainted Miku.
   *
   * This method registers the player icon, character info, and birthright description with EID, so
   * that in-game tooltips display properly for Miku.
   *
   * @param eid The `EIDExtended` instance used to add compatibility.
   * @see {@link EIDExtended}
   */
  override setupEID(eid: EIDExtended): void {
    const icons = Sprite();
    icons.Load("gfx/player_icons.anm2", true);
    eid.addIcon(
      `Player${PlayerTypeCustom.MIKU_B}`,
      "Players",
      0,
      16,
      16,
      0,
      0,
      icons,
    );
    eid.addCharacterInfo(PlayerTypeCustom.MIKU_B, DESCRIPTION, NAME);
    eid.addBirthright(PlayerTypeCustom.MIKU_B, BIRTHRIGHT_DESC, NAME);
    Debugger.eid(
      `${NAME} (Tainted)`,
      "Add description and birthright description.",
    );

    // TODO: Implement with loop.
    appendToDescription(
      eid,
      "Brimstone",
      PlayerTypeCustom.MIKU_B,
      `#{{Player${PlayerTypeCustom.MIKU_B}}} Replaces {{Collectible118}} Brimstone#{{Collectible${CollectibleTypeCustom.BRIMSTONE_NOTE}}} Brimstone Notes can now drop from enemies`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );

    appendToDescription(
      eid,
      "Mom's Knife",
      PlayerTypeCustom.MIKU_B,
      `#{{Player${PlayerTypeCustom.MIKU_B}}} {{Warning}} Tainted Miku can use the knife only in her empty mode`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );

    appendToDescription(
      eid,
      "Dr. Fetus",
      PlayerTypeCustom.MIKU_B,
      `#{{Player${PlayerTypeCustom.MIKU_B}}} Replaces {{Collectible52}} Dr. Fetus#{{Collectible${CollectibleTypeCustom.DR_FETUS_NOTE}}} Dr. Fetus Explosive Notes can now drop from enemies`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );

    appendToDescription(
      eid,
      "Eraser",
      PlayerTypeCustom.MIKU_B,
      `#{{Player${PlayerTypeCustom.MIKU_B}}} Replaces {{Collectible638}} Eraser#{{Collectible${CollectibleTypeCustom.ERASER_NOTE}}} Rubber Notes can permanently erase enemies.#{{Warning}} Doesn't work on bosses.`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );
  }
}
