/* eslint-disable @typescript-eslint/no-unnecessary-condition */
const DEBUG = {
  RNG: false,
  MATH: false,
  CHARACTERS: false,
  ITEMS: false,
  TEAR: false,
  PICKUP: false,
  EID: true,
} as const;

/** Debugging utility functions for the mod. */
export const Debugger = {
  /**
   * Logs a debug message related to items.
   *
   * Only logs if {@link DEBUG.ITEMS} is enabled.
   *
   * @param name The context or source of the `Item` event.
   * @param message The debug message to log.
   */
  item: (name: string, message: string): void => {
    if (!DEBUG.ITEMS) {
      return;
    }
    print(`[Item\\${name}]: ${message}`);
  },
  /**
   * Logs a debug message related to characters.
   *
   * Only logs if {@link DEBUG.CHARACTERS} is enabled.
   *
   * @param name The context or source of the `Character` event.
   * @param message The debug message to log.
   */
  char: (name: string, message: string): void => {
    if (!DEBUG.CHARACTERS) {
      return;
    }
    print(`[Character\\${name}]: ${message}`);
  },

  /**
   * Logs a debug message related to RNG and chances.
   *
   * Only logs if {@link DEBUG.RNG} is enabled.
   *
   * @param name The context or source of the `RNG` event.
   * @param message The debug message to log.
   * @param debugMath The detailed info of the rng calculation.
   */
  rng: (name: string, message: string, debugMath = false): void => {
    if (!DEBUG.RNG && !debugMath) {
      return;
    }
    print(`[RNG\\${name}]: ${message}`);
  },
  /**
   * Logs a debug message related to tears.
   *
   * Only logs if {@link DEBUG.TEAR} is enabled.
   *
   * @param name The context or source of the `Tear` event.
   * @param message The debug message to log.
   */
  tear: (name: string, message: string): void => {
    if (!DEBUG.TEAR) {
      return;
    }
    print(`[Tear\\${name}]: ${message}`);
  },
  /**
   * Logs a debug message related to pickups.
   *
   * Only logs if {@link DEBUG.PICKUP} is enabled.
   *
   * @param name The context or source of the `Pickup` event.
   * @param message The debug message to log.
   */
  pickup: (name: string, message: string): void => {
    if (!DEBUG.PICKUP) {
      return;
    }
    print(`[Pickup\\${name}]: ${message}`);
  },
  /**
   * Logs a debug message related to External Item Descriptions.
   *
   * Only logs if {@link DEBUG.PICKUP} is enabled.
   *
   * @param name The context or source of the `EID` event.
   * @param message The debug message to log.
   */
  eid: (name: string, message: string): void => {
    if (!DEBUG.EID) {
      return;
    }
    print(`[EID Compat\\${name}]: ${message}`);
  },
} as const;
