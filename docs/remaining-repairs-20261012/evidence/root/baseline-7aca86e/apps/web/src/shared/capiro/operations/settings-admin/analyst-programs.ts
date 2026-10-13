import { z } from "zod";
import { defineOperation } from "../../contracts";
import {
  aliasSchema,
  aliasType,
  empty,
  id,
  matchSchema,
  nullable,
  pageQuery,
  paginated,
  programSchema,
  recordParams,
} from "./schemas";

const source =
  "apps/api/src/program-element/programs/programs.controller.ts + programs.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const programParams = z.object({ programId: id }).strict();
export const analystProgramsOperations = {
  "settings.analyst.programMatches.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/programs/admin/match-queue",
    request: z.object({ query: pageQuery.optional() }).strict(),
    response: paginated(matchSchema),
    source,
  }),
  "settings.analyst.programMatches.decide": defineOperation({
    service: "core",
    method: "POST",
    path: "/programs/admin/match-queue/:id/resolve",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            decision: z.enum(["accept", "reject", "quarantine"]),
            notes: z.string().max(10000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      resolved: z.literal(true),
      id: z.string(),
      status: z.string(),
      decision: z.string(),
    }),
    source,
  }),
  "settings.analyst.programs.search": defineOperation({
    service: "core",
    method: "GET",
    path: "/programs",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(1000).optional(),
            limit: z.number().int().min(1).max(200).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      data: z.array(programSchema),
      total: z.number(),
      q: z.string(),
    }),
    source,
  }),
  "settings.analyst.aliases.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/programs/admin/:programId/aliases",
    request: z.object({ params: programParams }).strict(),
    response: z.object({
      programId: z.string(),
      data: z.array(aliasSchema),
      total: z.number(),
    }),
    source,
  }),
  "settings.analyst.aliases.add": defineOperation({
    service: "core",
    method: "POST",
    path: "/programs/admin/:programId/aliases",
    request: z
      .object({
        params: programParams,
        body: z
          .object({
            alias: z.string().min(1).max(1000),
            aliasType,
            source: z.string().max(1000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: aliasSchema,
    source,
  }),
  "settings.analyst.aliases.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/programs/admin/aliases/:id",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            alias: z.string().min(1).max(1000).optional(),
            aliasType: aliasType.optional(),
          })
          .strict(),
      })
      .strict(),
    response: aliasSchema,
    source,
  }),
  "settings.analyst.aliases.delete": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/programs/admin/aliases/:id",
    request: z.object({ params: recordParams }).strict(),
    response: z.object({ deleted: z.literal(true), id: z.string() }),
    source,
  }),
  "settings.analyst.aliases.duplicates": defineOperation({
    service: "core",
    method: "GET",
    path: "/programs/admin/duplicate-aliases",
    request: empty,
    response: z.object({
      data: z.array(
        z.object({
          aliasNormalized: z.string(),
          programs: z.array(
            z.object({
              programId: z.string(),
              canonicalName: nullable,
              status: nullable,
              aliasId: z.string(),
            }),
          ),
        }),
      ),
      total: z.number(),
    }),
    source,
  }),
  "settings.analyst.programs.merge": defineOperation({
    service: "core",
    method: "POST",
    path: "/programs/admin/merge",
    request: z
      .object({
        body: z
          .object({ keepProgramId: id, mergeProgramId: id })
          .strict()
          .refine((body) => body.keepProgramId !== body.mergeProgramId),
      })
      .strict(),
    response: z.object({
      merged: z.literal(true),
      keepProgramId: z.string(),
      mergeProgramId: z.string(),
      repointed: z.object({
        matches: z.number(),
        roles: z.number(),
        officeLinks: z.number(),
        provisionLinks: z.number(),
      }),
      aliasesCopied: z.number(),
    }),
    source,
  }),
} as const;
