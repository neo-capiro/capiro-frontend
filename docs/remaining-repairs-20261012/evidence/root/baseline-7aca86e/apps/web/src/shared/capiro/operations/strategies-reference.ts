import { z } from "zod";
import { defineOperation } from "../contracts";
import { emptyStrategyRequest, strategyId } from "./strategies-schemas";

export const referenceRow = z.object({
  id: strategyId,
  kind: z.string(),
  label: z.string(),
  fy: z.number().nullable(),
  startsOn: z.string().nullable(),
  endsOn: z.string().nullable(),
  tone: z.string().nullable(),
  position: z.number().int(),
});
export const referenceCalendars = z.object({
  congress: z.array(referenceRow),
  ppbeLanes: z.array(referenceRow),
  ppbeCurrentPhases: z.array(referenceRow),
  source: z.record(z.string(), z.enum(["baseline", "override"])),
});
const source =
  "capirov2@4be13b0 apps/api-strategy/src/reference/reference.controller.ts, reference.service.ts and dto/reference-fork.dto.ts";
export const strategiesReferenceOperations = {
  "strategies.calendars": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/reference-calendars",
    request: emptyStrategyRequest,
    response: referenceCalendars,
    source,
  }),
  "strategies.calendar.replace": defineOperation({
    service: "strategy",
    method: "PUT",
    path: "/reference-calendars/:kind",
    request: z
      .object({
        params: z.object({ kind: z.enum(["congress", "ppbe"]) }).strict(),
        body: z
          .object({
            rows: z
              .array(
                z
                  .object({
                    label: z.string().trim().min(1).max(200),
                    startsOn: z.iso.date().nullable().optional(),
                    endsOn: z.iso.date().nullable().optional(),
                    fy: z
                      .number()
                      .int()
                      .min(2000)
                      .max(2100)
                      .nullable()
                      .optional(),
                    tone: z.string().max(20).nullable().optional(),
                  })
                  .strict(),
              )
              .max(60),
          })
          .strict(),
      })
      .strict(),
    response: referenceCalendars,
    source,
  }),
};
export type StrategyReferenceRow = z.infer<typeof referenceRow>;
