import { z } from "zod";
import { defineOperation } from "../../contracts";
import {
  candidateSchema,
  mergeSchema,
  pageQuery,
  paginated,
  recordParams,
} from "./schemas";

const source =
  "apps/api/src/program-element/programs/programs.controller.ts + programs.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const peopleSource =
  "apps/api/src/acquisition-personnel/acquisition-personnel.controller.ts + acquisition-personnel-read.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const analystPersonnelOperations = {
  "settings.analyst.personCandidates.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/admin/program-elements/person-candidates",
    request: z.object({ query: pageQuery.optional() }).strict(),
    response: paginated(candidateSchema),
    source: peopleSource,
  }),
  "settings.analyst.personCandidates.decide": defineOperation({
    service: "core",
    method: "POST",
    path: "/admin/program-elements/person-candidates/:id/resolve",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            decision: z.enum(["confirm", "reject"]),
            notes: z.string().max(10000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ resolved: z.boolean(), linked: z.boolean() }),
    source: peopleSource,
  }),
  "settings.analyst.personnelMerge.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/admin/acquisition-personnel/merge-queue",
    request: z.object({ query: pageQuery.optional() }).strict(),
    response: paginated(mergeSchema),
    source: peopleSource,
  }),
  "settings.analyst.personnelMerge.decide": defineOperation({
    service: "core",
    method: "POST",
    path: "/admin/acquisition-personnel/merge-queue/:id/resolve",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            decision: z.enum([
              "merge",
              "keep_separate",
              "reject_a",
              "reject_b",
            ]),
            notes: z.string().max(10000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ resolved: z.literal(true) }),
    source: peopleSource,
  }),
} as const;
