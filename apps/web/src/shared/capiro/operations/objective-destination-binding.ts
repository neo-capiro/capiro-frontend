import { z } from "zod";

export const objectiveResourceId = z
  .uuid()
  .transform((value) => value.toLowerCase());
export const objectiveDestinationQuery = z
  .object({
    clientId: objectiveResourceId,
    objectiveId: objectiveResourceId,
    objectiveVersion: z.number().int().min(1).max(2147483647),
  })
  .strict();
export type ObjectiveDestinationQuery = z.infer<
  typeof objectiveDestinationQuery
>;
export const objectiveDestinationBinding = objectiveDestinationQuery.extend({
  resourceId: objectiveResourceId,
  objectiveRevisionId: objectiveResourceId,
});
export function requireObjectiveBinding<
  Value extends {
    destination: z.infer<typeof objectiveDestinationBinding>;
  },
>(value: Value, resourceId: string, query: ObjectiveDestinationQuery): Value {
  const selected = objectiveDestinationQuery.parse(query),
    d = value.destination;
  if (
    d.resourceId !== resourceId.toLowerCase() ||
    d.clientId !== selected.clientId ||
    d.objectiveId !== selected.objectiveId ||
    d.objectiveVersion !== selected.objectiveVersion
  )
    throw new Error(
      "The destination does not match the selected current Objective version.",
    );
  return value;
}

/** A bound URL is an exact selection hint, never authorization or an arbitrary destination. */
export function readObjectiveLocation<Id extends string>(
  params: Pick<URLSearchParams, "get" | "getAll" | "keys">,
  resourceKeys: readonly Id[],
): { query: ObjectiveDestinationQuery; ids: Record<Id, string> } | undefined {
  const allowed = [
    "clientId",
    "objectiveId",
    "objectiveVersion",
    ...resourceKeys,
  ];
  if (
    [...params.keys()].some((key) => !allowed.includes(key)) ||
    allowed.some((key) => params.getAll(key).length !== 1)
  )
    return undefined;
  const version = params.get("objectiveVersion") ?? "";
  const query = objectiveDestinationQuery.safeParse({
    clientId: params.get("clientId"),
    objectiveId: params.get("objectiveId"),
    objectiveVersion: /^[1-9]\d*$/.test(version) ? Number(version) : 0,
  });
  if (!query.success) return undefined;
  const ids = {} as Record<Id, string>;
  for (const key of resourceKeys) {
    const id = objectiveResourceId.safeParse(params.get(key));
    if (!id.success) return undefined;
    ids[key] = id.data;
  }
  return { query: query.data, ids };
}
