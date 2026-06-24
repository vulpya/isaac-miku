/**
 * Retrieves the custom data attached to a entity.
 *
 * @template T - The expected type of the entities data.
 * @param entity The entity to get data from.
 * @returns The data object stored on the entity, cast to type `T`.
 */
export const getData = <T>(entity: Entity): T => entity.GetData() as T;
