import { Feature } from "../Feature";

export interface PlayerData {
  fireDelayInit?: boolean;
}

/** Abstract base class representing a custom character. */
export abstract class Character extends Feature {}
