import { Feature } from "../../Feature";

export abstract class Pickup extends Feature {
  /**
   * Optional callback triggered after a pickup is about to be collected.
   *
   * @param pickup The pickup entity that is about to be collected.
   */
  prePickupCollision?(
    pickup: EntityPickup,
    collider: Entity,
    low: boolean,
  ): boolean;

  /**
   * Optional callback triggered after a pickup was initialized.
   *
   * @param pickup The pickup entity that was initialized.
   */
  postPickupInit?(pickup: EntityPickup): void;

  /**
   * Optional callback triggered after a pickup was updated.
   *
   * @param pickup The pickup entity that was updated.
   */
  postPickupUpdate?(pickup: EntityPickup): void;
}
