import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  monitorId,
  monitorParams,
  monitorVersion,
} from "./legiwatch-monitor-schemas";

const source =
  "apps/intel-api/src/tracker/keywords/internal-workflow.controller.ts; internal-workflow.service.ts; workflow-trigger.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const workflowTemplates = [
  "hearing_preparation",
  "added_bill_review",
  "published_review",
  "report_review",
] as const;
const template = z.enum(workflowTemplates);
const config = z
  .object({
    folderIds: z.array(monitorId).min(1).max(20),
    jurisdiction: z.string().regex(/^[A-Z]{2}$/),
    sessionKey: z.string().min(1).max(60),
    reportId: monitorId.optional(),
  })
  .strict();
const definition = z
  .object({ name: z.string().trim().min(1).max(200), template, config })
  .strict()
  .refine(
    (body) =>
      body.template !== "report_review" || Boolean(body.config.reportId),
    "Choose a report for report review.",
  );
export const workflow = z.object({
  id: z.string(),
  name: z.string(),
  template,
  config: config.strip(),
  state: z.string(),
  version: monitorVersion,
  baseline_at: z.string().nullable().optional(),
});
export const workflowPreviewInput = config
  .extend({
    template: z.enum([
      ...workflowTemplates,
      "legal_research",
      "legal_deadline",
    ]),
    eventId: monitorId.optional(),
    billId: monitorId.optional(),
    selectionId: monitorId.optional(),
  })
  .strict();
const frozenInput = z.object({
  template: z.string(),
  folderIds: z.array(z.string()),
  jurisdiction: z.string(),
  sessionKey: z.string(),
  eventId: z.string().nullable().optional(),
  billId: z.string().nullable().optional(),
  reportId: z.string().nullable().optional(),
  selectionId: z.string().nullable().optional(),
  eventRevision: z.number().nullable().optional(),
  reportVersion: z.number().nullable().optional(),
  contextHash: z.string().optional(),
  workflowVersion: z.number().optional(),
});
export const workflowAction = z.object({
  id: z.string(),
  workflow_id: z.string().nullable(),
  template: z.string(),
  input_hash: z.string(),
  input: frozenInput,
  state: z.string(),
  reason: z.string().nullable(),
  attempts: z.number(),
  steps: z.object({
    draftId: z.string().optional(),
    contextItemId: z.string().optional(),
    recordRunId: z.string().optional(),
    reportRunId: z.string().optional(),
  }),
});
const folderRequest = z
  .object({ params: z.object({ folderId: monitorId }).strict() })
  .strict();
const idRequest = z.object({ params: monitorParams }).strict();
export const legiwatchWorkflowOperations = {
  "legiwatch.workflows": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/workflows/templates/:folderId",
    request: folderRequest,
    response: z.array(workflow),
    source,
  }),
  "legiwatch.workflow.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/templates",
    request: z.object({ body: definition }).strict(),
    response: workflow,
    source,
  }),
  "legiwatch.workflow.save": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/templates/:id",
    request: z
      .object({
        params: monitorParams,
        body: definition.safeExtend({ expectedVersion: monitorVersion }),
      })
      .strict(),
    response: workflow,
    source,
  }),
  "legiwatch.workflow.activation": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/templates/:id/activation",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            enabled: z.boolean(),
            baseline: z.literal("from_now").optional(),
            reviewed: z.literal(true).optional(),
          })
          .strict()
          .refine(
            (body) =>
              !body.enabled ||
              (body.baseline === "from_now" && body.reviewed === true),
            "Review and activate from now.",
          ),
      })
      .strict(),
    response: z.object({
      id: z.string(),
      state: z.string(),
      version: monitorVersion,
    }),
    source,
  }),
  "legiwatch.workflow.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/preview",
    request: z.object({ body: workflowPreviewInput }).strict(),
    response: z.object({
      input: frozenInput,
      inputHash: z.string(),
      effects: z.array(
        z.object({ kind: z.string(), outbound: z.literal(false) }),
      ),
      limits: z.array(z.string()),
    }),
    source,
  }),
  "legiwatch.workflow.enqueue": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/actions",
    request: z
      .object({
        body: z
          .object({
            input: workflowPreviewInput,
            inputHash: z.string().min(1).max(200),
            requestKey: z.string().uuid(),
          })
          .strict(),
      })
      .strict(),
    response: workflowAction,
    source,
  }),
  "legiwatch.workflow.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/workflows/history/:folderId",
    request: folderRequest,
    response: z.array(workflowAction),
    source,
  }),
  "legiwatch.workflow.action": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/workflows/actions/:id",
    request: idRequest,
    response: workflowAction,
    source,
  }),
  "legiwatch.workflow.execute": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/actions/:id/retry",
    request: idRequest,
    response: workflowAction,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.workflow.pause": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/workflows/actions/:id/pause",
    request: idRequest,
    response: z.number().int().nonnegative(),
    source,
  }),
} as const;
