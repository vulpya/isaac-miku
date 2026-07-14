import type { DamageFlag } from "isaac-typescript-definitions";
import {
  ActiveSlot,
  ButtonAction,
  CacheFlag,
  CollectibleType,
  EffectVariant,
  EntityCollisionClass,
  ModCallback,
  PickupVariant,
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
  spawnEffect,
  spawnTear,
  VectorZero,
} from "isaacscript-common";
import type { EIDExtended } from "../../compat/EID";
import { appendToDescription } from "../../compat/EID";
import { spawnNotePickup } from "../../entities/pickups/helper";
import type { NoteInstance } from "../../entities/pickups/NotePickup/NotePickup";
import {
  ITEM_SYNERGIES,
  NOTE_TYPE_DATA,
  NotePickupSubType,
} from "../../entities/pickups/NotePickup/NotePickupSubType";
import type { GlitchNoteTearData } from "../../entities/tears/GlitchNoteTear/GlitchNoteTear";
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
  unlockedNotes?: NotePickupSubType[];
  erased?: string[];
  storedCollectibles?: Set<CollectibleType>;
}

export interface TaintedMikuSaveData {
  attackMode?: MikuNoteMode;
  notes?: NoteInstance[];
  unlockedNotes?: NotePickupSubType[];
  erased?: string[];
  storedCollectibles?: CollectibleType[];
}

const NAME = "Miku";
const DESCRIPTION = "A twisted idol, using enemies as her melody.";
const BIRTHRIGHT_DESC =
  "Her fractured melody splits apart, causing multiple Lost Notes to fire with every shot.";
const BIRTHRIGHT_MULTI_SHOT = 5;
const HAIR = Isaac.GetCostumeIdByPath("gfx/characters/Character_MikuHead.anm2");
const POCKET_ACTIVE = CollectibleTypeCustom.BROKEN_VOICE;
const NULL_ITEM = CollectibleTypeCustom.MIKU_IDOL;
const NOTE_DROP_CHANCE = 45;

const ITEM_REPLACEMENTS: Partial<Record<CollectibleType, CollectibleType>> = {
  [CollectibleType.BRIMSTONE]: CollectibleTypeCustom.BRIMSTONE_NOTE,
  [CollectibleType.DR_FETUS]: CollectibleTypeCustom.DR_FETUS_NOTE,
} as const;

const ITEM_COSTUMES: Partial<Record<CollectibleType, CollectibleType>> = {
  [CollectibleTypeCustom.BRIMSTONE_NOTE]: CollectibleType.BRIMSTONE,
  [CollectibleTypeCustom.DR_FETUS_NOTE]: CollectibleType.DR_FETUS,
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
  override onGameStart(isContinued: boolean): void {
    if (!isContinued || !mod.HasData()) {
      return;
    }

    const loaded = jsonDecode(mod.LoadData()) as unknown as ModSaveData;

    Object.assign(SAVE_DATA, loaded);
  }

  @Callback(ModCallback.PRE_GAME_EXIT)
  override onGameExit(): void {
    SAVE_DATA.mikuBs = {};

    const players = getPlayersOfType(PlayerTypeCustom.MIKU_B);
    for (const player of players) {
      const playerData = getData<TaintedMikuData>(player);

      const { erased, notes, attackMode, storedCollectibles } = playerData;

      SAVE_DATA.mikuBs[player.ControllerIndex.toString()] = {
        attackMode: attackMode ?? MikuNoteMode.GLITCH,
        erased: erased ? [...erased] : [],
        notes: notes ? [...notes] : [],
        unlockedNotes: playerData.unlockedNotes
          ? [...playerData.unlockedNotes]
          : [],
        storedCollectibles: storedCollectibles ? [...storedCollectibles] : [],
      };
    }

    mod.SaveData(jsonEncode(SAVE_DATA));
  }

  /**
   * Called after Tainted Miku is initialized the first time.
   *
   * Adds Tainted Miku's hair costume.
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
    playerData.attackMode = MikuNoteMode.GLITCH;
    playerData.notes = [];
    playerData.erased = [];
    playerData.unlockedNotes = [];
    playerData.storedCollectibles = new Set();

    player.AddNullCostume(HAIR);
    Debugger.char(`${NAME} (Tainted)`, `Applied null costume: ${HAIR}`);

    player.AddCollectible(NULL_ITEM, 0);
    playerData.hasIdol = true;
    Debugger.char(NAME, `Applied null item: ${NULL_ITEM}.`);

    if (!player.HasCollectible(POCKET_ACTIVE)) {
      player.SetPocketActiveItem(POCKET_ACTIVE, ActiveSlot.POCKET, false);
      Debugger.char(NAME, "Give microphone pocket active item");
    }
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

    const saved = SAVE_DATA.mikuBs[player.ControllerIndex.toString()];
    if (!saved) {
      return;
    }

    const playerData = getData<TaintedMikuData>(player);

    playerData.erased = saved.erased ?? [];
    playerData.notes = saved.notes ?? [];
    playerData.unlockedNotes = saved.unlockedNotes ?? [];
    playerData.attackMode = saved.attackMode ?? MikuNoteMode.GLITCH;

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

  @Callback(ModCallback.POST_TEAR_INIT)
  override postTearInit(tear: EntityTear): void {
    const player = getPlayerFromEntity(tear);

    if (!player || !isMiku(player, true)) {
      return;
    }

    const tearData = getData<GlitchNoteTearData>(tear);
    const rng = tear.GetDropRNG();

    setTearColor(tear, tearData, rng);
  }

  @Callback(ModCallback.POST_FIRE_TEAR)
  override postFireTear(tear: EntityTear): void {
    const player = getPlayerFromEntity(tear);

    if (!player || !isMiku(player, true)) {
      return;
    }

    const playerData = getData<TaintedMikuData>(player);
    const { notes, attackMode } = playerData;

    if (attackMode === MikuNoteMode.GLITCH) {
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

      const tearData = getData<GlitchNoteTearData>(noteTear);
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

      // Determine HUD side
      const index = player.ControllerIndex;
      const isRightSide = controllerSides[index] ?? false;

      // HUD layout config
      const hudOffset = Options.HUDOffset;
      const hudX = hudOffset * 20;

      const startX = isRightSide ? 300 - hudX : 45 + hudX;
      const startY = 60;
      const spacing = 16;
      const baseSize = 14;
      const maxPerRow = 5;
      const maxRows = 2;
      const maxVisible = maxPerRow * maxRows;

      if (!this.noteSprite) {
        this.noteSprite = Sprite();
        this.noteSprite.Load("gfx/pickups/note.anm2", true);
        this.noteSprite.Play("Idle", true);
      }

      if (!this.activeNoteSprite) {
        this.activeNoteSprite = Sprite();
        this.activeNoteSprite.Load("gfx/pickups/note.anm2", true);
        this.activeNoteSprite.Play("Idle", true);
      }

      const RENDER_TEXT = false;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (RENDER_TEXT && !this.font) {
        this.font = Font();
        this.font.Load("font/pftempestasevencondensed.fnt");
      }

      // Render notes HUD
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
          attackMode === MikuNoteMode.GLITCH
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

      const game = Game();
      const hud = game.GetHUD();

      const isPausedCutscene =
        !hud.IsVisible() || game.GetRoom().GetFrameCount() < 5;

      // Render 'selected' note above player.
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

        if (this.font !== undefined) {
          const text = `${activeNote.remainingUses}`;
          const textScale = 0.5;
          const textX = floatX + 6;
          const textY = floatY + 6;

          // shadow
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

          // main
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
      }

      updateCollectibleCostumes(player, ITEM_COSTUMES);
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
      const tearData = getData<GlitchNoteTearData>(tear);
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
      for (const note of data.unlockedNotes ?? []) {
        unlocked.add(note);
      }
    }

    const unlockedArray = [...unlocked];

    const baseNotes = Object.values(NotePickupSubType).filter(
      (v): v is NotePickupSubType =>
        typeof v === "number" && NOTE_TYPE_DATA[v].weight > 0,
    );

    const noteSubTypes = [
      ...baseNotes,
      ...unlockedArray.filter((n) => !baseNotes.includes(n)),
    ];

    const weights = noteSubTypes.map((s) =>
      unlockedArray.includes(s) ? 2 : NOTE_TYPE_DATA[s].weight,
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

  @Callback(ModCallback.PRE_PICKUP_COLLISION, PickupVariant.COLLECTIBLE)
  prePickupCollision(
    pickup: EntityPickup,
    collider: Entity,
    _low: boolean,
  ): boolean | undefined {
    const player = getPlayerFromEntity(collider);
    if (!player || !isMiku(player, true)) {
      return undefined;
    }

    const data = getData<TaintedMikuData>(player);

    const itemID = pickup.SubType as CollectibleType;
    const synergyNote = ITEM_SYNERGIES[itemID];
    const replaceItem = ITEM_REPLACEMENTS[itemID];

    this.checkDisabledItem(player, itemID);

    if (synergyNote === undefined || replaceItem === undefined) {
      return undefined;
    }

    data.unlockedNotes ??= [];

    if (!data.unlockedNotes.includes(synergyNote)) {
      data.unlockedNotes.push(synergyNote);
    }

    player.AnimateCollectible(replaceItem);
    player.AddCollectible(replaceItem);

    pickup.EntityCollisionClass = EntityCollisionClass.NONE;
    pickup.GetSprite().Play("Collect", true);

    pickup.Timeout = 2;

    SFXManager().Play(SoundEffect.POWER_UP_SPEWER);

    spawnEffect(EffectVariant.POOF_1, 0, pickup.Position, VectorZero);
    spawnNotePickup(synergyNote, player.Position);

    return undefined;
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
      `#{{Player${PlayerTypeCustom.MIKU_B}}} {{Warning}} Tainted Miku can use the knife only in her glitched mode`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );

    appendToDescription(
      eid,
      "Dr. Fetus",
      PlayerTypeCustom.MIKU_B,
      `#{{Player${PlayerTypeCustom.MIKU_B}}} Replaces {{Collectible52}} Dr. Fetus#{{Collectible${CollectibleTypeCustom.DR_FETUS_NOTE}}} Dr. Fetus Explosive Notes can now drop from enemies`,
      () => anyPlayerIs(PlayerTypeCustom.MIKU_B),
    );
  }

  private checkDisabledItem(
    player: EntityPlayer,
    itemID: CollectibleType,
  ): void {
    const data = getData<TaintedMikuData>(player);

    if (isNoteItemDisabled(itemID) && data.attackMode !== MikuNoteMode.GLITCH) {
      setMikuAttackMode(player, MikuNoteMode.GLITCH);

      Debugger.char(
        NAME,
        `Switched to Glitch mode because ${itemID} is disabled in Notes mode.`,
      );
    }
  }

  private applyNoteEffect(
    player: EntityPlayer,
    tear: EntityTear,
    note: NoteInstance,
  ): void {
    const noteData = NOTE_TYPE_DATA[note.subType];
    const tearData = getData<GlitchNoteTearData>(tear);

    noteData.applyEffect?.(player, tear);
    noteData.onFireTear?.(player, tear);

    tearData.color = noteData.color;

    note.remainingUses--;

    if (note.remainingUses <= 0) {
      const playerData = getData<TaintedMikuData>(player);
      playerData.notes = playerData.notes?.filter((n) => n !== note);
    }
  }
}
