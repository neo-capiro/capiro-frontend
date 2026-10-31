import { z } from "zod";
import { defineOperation } from "../contracts";
import { legiwatchBriefingOperations } from "./legiwatch-briefings";
import { evidenceScope } from "./legiwatch-evidence-schemas";
import {
  monitorId,
  monitorParams,
  monitorVersion,
  scheduleTime,
} from "./legiwatch-monitor-schemas";
import {
  recipientSchema,
  recipientSelectionSchema,
} from "./legiwatch-delivery-schemas";
const source =
  "apps/intel-api/src/tracker/editorial/editorial.controller.ts; editorial.service.ts; packages/shared/src/legiwatch-phase8.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const editorialConfig = evidenceScope
  .extend({
    folderId: monitorId,
    template: z.enum(["research_update", "daily_legislative_brief"]),
    subject: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value)),
    includedKinds: z.array(z.literal("research")).length(1),
    schedule: z
      .object({
        timezone: scheduleTime.timezone,
        hour: z.number().int().min(0).max(23),
        minute: z.number().int().min(0).max(59),
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        noChange: z.enum(["draft", "skip"]),
        sourceGap: z.enum(["hold", "draft"]),
        mode: z.enum(["prepare", "send"]),
      })
      .strict(),
    recipientSelection: z.array(recipientSelectionSchema).max(500),
    prepareEnabled: z.boolean(),
    sendEnabled: z.boolean(),
    dictionaryScopeAccepted: z.boolean(),
    acceptAvailableFields: z.boolean(),
  })
  .strict();
// The backend validates ownership/folder/version, then discards these old
// picker fields. The included source family remains strictly research-only.
const rolloutConfig = editorialConfig
  .extend({
    reportId: monitorId,
    reportVersion: monitorVersion.optional(),
    monitorIds: z.array(monitorId).max(0),
    categoryMapping: z
      .object({
        namespace: z.string().nullable(),
        version: z.literal(1),
        entries: z.record(
          z.string().max(80),
          z
            .object({
              decision: z.enum(["included", "excluded", "pending"]),
              reason: z.string().min(1).max(2000),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();
export const editorialRow = z.object({
  id: z.string(),
  source_key: z.string(),
  version: monitorVersion,
  state: z.string(),
  source: z.object({
    family: z.object({
      displayName: z.string(),
      categoryNamespace: z.string().nullable().default(null),
      categories: z.array(z.string()).default([]),
    }),
  }),
  config: editorialConfig
    .omit({ recipientSelection: true })
    .partial()
    .strip()
    .extend({
      folderId: z.string().nullable().optional(),
      clientId: z.string().nullable().optional(),
      policyVersion: z.number().int().optional(),
      recipients: z.array(recipientSchema).optional(),
    }),
  approvalHash: z.string().optional(),
  last_held_reason: z.string().nullable().optional(),
  latestEdition: z
    .object({
      selectionId: z.string(),
      draftId: z.string(),
      title: z.string(),
      updatedAt: z.string().optional(),
    })
    .nullable()
    .optional(),
});
export const legiwatchEditorialOperations = {
  "legiwatch.editorial.configurations": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/briefings/configurations",
    request: z.object({}).strict(),
    response: z.object({
      configurations: z.array(editorialRow),
      draftLookupState: z.string(),
    }),
    source,
  }),
  "legiwatch.editorial.configure": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/briefings/configurations/:id",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            config: z.union([editorialConfig, rolloutConfig]),
          })
          .strict(),
      })
      .strict(),
    response: z.array(editorialRow.omit({ source: true })),
    source,
  }),
  "legiwatch.editorial.activation": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/briefings/configurations/:id/activation",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            enabled: z.boolean(),
            approvalHash: z.string().max(200).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      id: z.string(),
      state: z.string(),
      version: z.number(),
      approvalHash: z.string(),
    }),
    source,
  }),
  "legiwatch.editorial.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/briefings/configurations/:id/occurrences",
    request: z
      .object({
        params: monitorParams,
        query: evidenceScope
          .extend({
            cursor: z.string().max(1000).optional(),
            limit: z.number().int().min(1).max(50).optional(),
          })
          .strict(),
      })
      .strict(),
    response:
      legiwatchBriefingOperations["legiwatch.briefing.history"].response,
    source,
  }),
} as const;
