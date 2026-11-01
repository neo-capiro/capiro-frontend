import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  objectiveDestinationQuery,
  objectiveResourceId,
  type ObjectiveDestinationQuery,
} from "./objective-destination-binding";

export const objectiveSavedGeneration = z.strictObject({
  selection: z.strictObject({
    query: objectiveDestinationQuery,
    ids: z.strictObject({
      strategyId: objectiveResourceId,
      strategyVersionId: objectiveResourceId,
      generatedJobId: objectiveResourceId,
    }),
  }),
  objectiveRevisionId: objectiveResourceId,
  savedAt: z.iso.datetime(),
});

export const objectiveSavedGenerationOperation = defineOperation({
  service: "strategy",
  method: "GET",
  path: "/strategies/objective-saved-generation",
  request: z.strictObject({ query: objectiveDestinationQuery }),
  response: objectiveSavedGeneration,
  source:
    "api-strategy/strategy/objective-saved-generation.ts; actor-owned canonical saved output discovery",
});

/** Discovery is a navigation hint; the exact receiver rechecks source and access. */
export function requireSavedGenerationDiscovery(
  raw: unknown,
  query: ObjectiveDestinationQuery,
) {
  const value = objectiveSavedGeneration.parse(raw);
  const selected = objectiveDestinationQuery.parse(query);
  const actual = value.selection.query;
  if (
    actual.clientId !== selected.clientId ||
    actual.objectiveId !== selected.objectiveId ||
    actual.objectiveVersion !== selected.objectiveVersion
  )
    throw new Error("Saved generation does not match this Objective version.");
  return value;
}

export function savedGenerationDiscoveryHref(
  value: z.infer<typeof objectiveSavedGeneration>,
) {
  const { selection } = objectiveSavedGeneration.parse(value);
  return `/modules/strategies?${new URLSearchParams({
    ...selection.query,
    objectiveVersion: String(selection.query.objectiveVersion),
    ...selection.ids,
  })}`;
}
