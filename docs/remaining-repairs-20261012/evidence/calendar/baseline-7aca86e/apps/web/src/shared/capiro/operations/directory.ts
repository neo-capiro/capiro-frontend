import { z } from "zod";
import { defineOperation, type OperationInput } from "../contracts";
import * as s from "./directory-schemas";

const source =
  "apps/api/src/directory/directory.controller.ts @ 4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const read = <
  Q extends z.ZodType<NonNullable<OperationInput["query"]>>,
  R extends z.ZodType,
>(
  path: string,
  query: Q,
  response: R,
) =>
  defineOperation({
    service: "core",
    method: "GET",
    path,
    request: z.object({ query: query.optional() }).strict(),
    response,
    source,
  });
const contactParams = z.object({ contactId: s.directoryId }).strict();
export const directoryOperations = {
  "directory.news": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/contacts/:contactId/news",
    request: z.object({ params: contactParams }).strict(),
    response: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          link: z.string(),
          publishedAt: z.string().nullable(),
          summary: z.string(),
        }),
      ),
      lastSyncedAt: z.string().nullable(),
      feedError: z.string().nullable(),
    }),
    source,
  }),
  "directory.fec": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/contacts/:contactId/fec-summary",
    request: z.object({ params: contactParams }).strict(),
    response: z.object({
      matchQuality: z.literal("name_approximate"),
      clients: z.array(
        z.object({
          clientId: z.string(),
          clientName: z.string(),
          mappedEmployer: z.string(),
          totalAmount: z.number(),
          contributionCount: z.number(),
          latestContributionDate: z.string().nullable(),
        }),
      ),
      disclaimer: z.string(),
    }),
    source,
  }),
  "directory.contacts": read(
    "/directory/contacts",
    s.directoryPaging,
    s.directoryContactsResponse,
  ),
  "directory.committees": read(
    "/directory/committees",
    s.directoryPaging
      .pick({ q: true, chamber: true, page: true, pageSize: true })
      .extend({ kind: z.enum(["committee", "subcommittee"]).optional() }),
    s.directoryCommitteesResponse,
  ),
  "directory.committee.staff": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/committees/:committeeId/staff",
    request: z
      .object({
        params: z.object({ committeeId: s.directoryId }).strict(),
        query: s.directoryPaging
          .pick({ q: true, page: true, pageSize: true })
          .optional(),
      })
      .strict(),
    response: s.directoryCommitteeStaffResponse,
    source,
  }),
  "directory.notes": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/contacts/:contactId/notes",
    request: z.object({ params: contactParams }).strict(),
    response: z.array(s.directoryNote),
    source,
  }),
  "directory.notes.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/directory/contacts/:contactId/notes",
    request: z
      .object({
        params: contactParams,
        body: z
          .object({
            body: z.string().trim().min(1).max(4000),
            directoryContactName: z.string().max(240).optional(),
          })
          .strict(),
      })
      .strict(),
    response: s.directoryNote,
    source,
  }),
  "directory.favorites": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/favorites",
    request: z.object({}).strict(),
    response: z.array(
      z.object({
        directoryContactId: z.string(),
        directoryContactName: z.string().nullable().optional(),
      }),
    ),
    source,
  }),
  "directory.favorite.add": defineOperation({
    service: "core",
    method: "POST",
    path: "/directory/contacts/:contactId/favorite",
    request: z
      .object({
        params: contactParams,
        body: z
          .object({ directoryContactName: z.string().max(240).optional() })
          .strict(),
      })
      .strict(),
    response: z.object({
      ok: z.literal(true),
      directoryContactId: z.string(),
      favorited: z.boolean(),
    }),
    source,
  }),
  "directory.favorite.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/directory/contacts/:contactId/favorite",
    request: z.object({ params: contactParams }).strict(),
    response: z.object({
      ok: z.literal(true),
      directoryContactId: z.string(),
      favorited: z.boolean(),
    }),
    source,
  }),
  "directory.state-legislators": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/state-legislators",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(500).optional(),
            states: z.array(z.string()).optional(),
            chambers: z.array(z.string()).optional(),
            parties: z.array(z.string()).optional(),
            committee: z.string().optional(),
            includeCommittees: z.boolean().optional(),
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(200).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: s.stateListResponse,
    source:
      "apps/api/src/explorer/explorer.controller.ts / ExplorerService.stateLegislators",
  }),
  "directory.state-facets": defineOperation({
    service: "core",
    method: "GET",
    path: "/explorer/state-legislator-facets",
    request: z
      .object({
        query: z
          .object({ states: z.array(z.string()).optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      states: z.array(z.string()),
      chambers: z.array(z.string()),
      parties: z.array(z.string()),
    }),
    source: "apps/api/src/explorer/explorer.controller.ts",
  }),
  "directory.personnel": defineOperation({
    service: "core",
    method: "GET",
    path: "/acquisition-personnel",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(500).optional(),
            service: z.string().optional(),
            organization: z.string().optional(),
            role: z.string().optional(),
            pe_code: z.string().optional(),
            pe_aligned: z.enum(["aligned", "unaligned"]).optional(),
            sort: z.enum(["pe_first", "confidence"]).optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).max(200).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: s.personnelList,
    source:
      "apps/api/src/acquisition-personnel/acquisition-personnel.controller.ts / dto/list-personnel.dto.ts",
  }),
} as const;
