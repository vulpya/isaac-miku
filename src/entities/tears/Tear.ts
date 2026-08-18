import { Feature } from "../../Feature";

export interface TearData {
  color?: Color;
  poofColor?: Color;
}

export abstract class Tear extends Feature {}
