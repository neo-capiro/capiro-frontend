import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarPageSchema,
  committeeParams,
  sourceUpdateSchema,
  stateCommitteeSchema,
} from "./legiwatch-calendar-schemas";

const params = z.object({ params: committeeParams }).strict();
const base = "/legiwatch/live-hearings";
const source =
  "apps/api/src/live-hearings/legiwatch-wave1.controller.ts; legiwatch-wave1.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const committeeFollowBodySchema = z
  .object({
    clientIds: z.array(z.uuid()).optional(),
    notifyOnNewHearing: z.boolean().optional(),
    notifyOnScheduleChange: z.boolean().optional(),
    notifyOnTranscriptReady: z.boolean().optional(),
    notifyOnHighPriorityMatch: z.boolean().optional(),
    notifyOnPublication: z.boolean().optional(),
  })
  .strict();
export const committeeFollowSchema = committeeFollowBodySchema
  .required()
  .extend({
    committeeSystemCode: z.string(),
    following: z.boolean(),
    clients: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        archived: z.boolean(),
      }),
    ),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  });
const stateMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  chamber: z.string().nullable(),
  district: z.string().nullable(),
  party: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  url: z.string().nullable(),
  active: z.boolean(),
  legiscanPeopleId: z.number().nullable(),
  role: z.string().nullable(),
  roles: z.array(z.string()),
  sourceCommitteeIds: z.array(z.string()),
  lastSyncedAt: z.string(),
});
export const stateCommitteeDetailSchema = z.object({
  body: stateCommitteeSchema,
  sourceCommitteeIds: z.array(z.string()),
  members: z.array(stateMemberSchema),
  rosterStatus: z.enum(["unqualified", "source_memberships"]),
  upcomingEvents: calendarPageSchema,
  recentEvents: calendarPageSchema,
  sourceCoverage: z.array(
    z.object({
      chamber: z.string(),
      status: z.string(),
      from: z.string(),
      to: z.string(),
      attemptedAt: z.string(),
      items: z.number(),
      sourceHealth: z.string(),
      lastCheckedAt: z.string().nullable(),
      lastSuccessAt: z.string().nullable(),
      lastError: z.string().nullable(),
      sourceUrl: z.string().nullable(),
      adapterKey: z.string().nullable(),
    }),
  ),
  publicationSources: z.array(
    z.object({
      sourceUrl: z.string(),
      sourceHealth: z.string(),
      lastCheckedAt: z.string().nullable(),
      lastSuccessAt: z.string().nullable(),
      lastError: z.string().nullable(),
      scope: z.string(),
      note: z.string(),
    }),
  ),
  updates: z.object({
    rows: z.array(sourceUpdateSchema.omit({ inheritedFromParent: true })),
    returned: z.number(),
    total: z.number(),
    truncated: z.boolean(),
    asOf: z.string(),
  }),
  referredBills: z.object({
    rows: z.array(
      z.object({
        id: z.string(),
        billNumber: z.string(),
        title: z.string().nullable().optional(),
        latestActionDate: z.string().nullable(),
        syncedAt: z.string(),
      }),
    ),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});
export const legiwatchCommitteeOperations = {
  "legiwatch.stateCommittee": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/state-committees/:id`,
    request: z
      .object({
        params: committeeParams,
        query: z
          .object({
            referralPage: z.number().int().min(1).max(100000).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: stateCommitteeDetailSchema,
    source:
      "apps/api/src/live-hearings/live-hearings.controller.ts; live-hearings.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
  "legiwatch.committee.follow": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/committees/:id/follow`,
    request: params,
    response: committeeFollowSchema,
    source,
  }),
  "legiwatch.committee.follow.update": defineOperation({
    service: "core",
    method: "PUT",
    path: `${base}/committees/:id/follow`,
    request: z
      .object({ params: committeeParams, body: committeeFollowBodySchema })
      .strict(),
    response: committeeFollowSchema,
    source,
  }),
  "legiwatch.committee.follow.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: `${base}/committees/:id/follow`,
    request: params,
    response: committeeFollowSchema,
    source,
  }),
  "legiwatch.committee.updates": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/committees/:id/updates`,
    request: z
      .object({
        params: committeeParams,
        query: z
          .object({ limit: z.number().int().min(1).max(500).optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      rows: z.array(sourceUpdateSchema),
      total: z.number(),
      asOf: z.string(),
    }),
    source:
      "apps/api/src/live-hearings/live-hearings.controller.ts; committee-directory.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
} as const;
