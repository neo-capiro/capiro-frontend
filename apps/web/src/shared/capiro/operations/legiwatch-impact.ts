import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  impactContextSchema,
  impactDetailSchema,
  impactPageSchema,
  impactParams,
} from "./legiwatch-impact-schemas";

const source =
  "packages/shared/src/legiwatch-impact.ts; apps/api/src/legiwatch-impact (Core canonical tracker and source-backed client impact)";
const base = "/legiwatch/clients/:clientId/bills/:billId";
export const legiwatchImpactOperations = {
  "legiwatch.tracker": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/tracker",
    request: z
      .object({
        query: z
          .object({
            clientId: z.string().min(1).optional(),
            cursor: z.string().max(400).optional(),
            limit: z.number().int().min(1).max(50).optional(),
            q: z.string().max(160).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: impactPageSchema,
    source,
  }),
  "legiwatch.impact": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/impact`,
    request: z.object({ params: impactParams }).strict(),
    response: impactDetailSchema,
    source,
  }),
  "legiwatch.impact.analyze": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/impact/analyze`,
    request: z
      .object({ params: impactParams, body: z.object({}).strict() })
      .strict(),
    response: impactDetailSchema,
    source,
  }),
  "legiwatch.bill.context": defineOperation({
    service: "core",
    method: "PUT",
    path: `${base}/context`,
    request: z
      .object({ params: impactParams, body: impactContextSchema })
      .strict(),
    response: impactDetailSchema,
    source,
  }),
} as const;
