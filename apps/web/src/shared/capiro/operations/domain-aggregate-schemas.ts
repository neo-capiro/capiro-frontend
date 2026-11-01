import { z } from "zod";

// Receiving contract from Core343, not a shared aggregate endpoint.
export const aggregateClientId = z
  .uuid()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
export const aggregateRequest = z
  .object({
    query: z
      .object({
        clientId: aggregateClientId
          .transform((id) => id.toLowerCase())
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const domainAggregateScope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("actor") }).strict(),
  z.object({ kind: z.literal("client"), clientId: aggregateClientId }).strict(),
]);
export const domainAggregateFields = {
  version: z.literal(1),
  scope: domainAggregateScope,
  asOf: z.iso.datetime(),
  observedAt: z.iso.datetime(),
};
/** Envelope for producers that publish an observation without an asOf cutoff. */
export const statusAggregateFields = {
  version: z.literal(1),
  observedAt: z.iso.datetime(),
};
/** `status` branch, not Planner's `state`: a capped incomplete withholds the count. */
export const domainAggregateStatus = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("complete"),
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    complete: z.literal(true),
    capped: z.literal(false),
  }),
  z.object({
    status: z.literal("incomplete"),
    count: z.null(),
    complete: z.literal(false),
    capped: z.literal(true),
  }),
]);
export const domainAggregateState = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("complete"),
    count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    complete: z.literal(true),
    capped: z.literal(false),
  }),
  z.object({
    state: z.literal("incomplete"),
    count: z.null(),
    complete: z.literal(false),
    capped: z.literal(false),
    reason: z.enum([
      "source_changed",
      "authorization_changed",
      "invalid_source",
    ]),
  }),
]);
export const orderedObservation = (data: {
  asOf: string;
  observedAt: string;
}) => Date.parse(data.observedAt) >= Date.parse(data.asOf);
