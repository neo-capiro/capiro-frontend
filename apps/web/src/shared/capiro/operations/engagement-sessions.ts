import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capirov2@4be13b0 outreach-v3/api/outreach-v3-state.controller.ts + services/outreach-session.service.ts + persistence/outreach-state.repository.ts + outreach-command.contract.ts";
const id = z.uuid();
const params = z.object({ sessionId: id }).strict();
const session = z
  .object({
    id,
    title: z.string().nullable(),
    status: z.string(),
    currentStateVersion: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable(),
  })
  .strip();
const text = z.string().nullable();
const spec = z
  .object({
    goal: z.object({
      goal: text,
      objective: text,
      topic: text,
      desiredOutcome: text,
      ask: z.object({ mode: z.string(), text }),
      whyNow: text,
    }),
    sponsor: z.object({
      kind: z.string(),
      label: text,
      clientRefs: z.array(z.object({ clientId: id })),
    }),
    strategy: z.object({
      campaignAngle: text,
      tone: text,
      length: z.string(),
      customLengthInstruction: text,
    }),
    delivery: z.object({ pattern: z.string(), personalization: z.string() }),
    targeting: z
      .object({
        selectedTargetRefs: z.array(
          z
            .object({
              targetKey: z.string().min(1).max(384),
              displayName: z.string().min(1).max(240),
              email: z.string().email().nullable(),
              snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .strip(),
        ),
      })
      .strip(),
  })
  .strip();
const detail = z.object({
  session,
  currentStateVersion: z.number().int().positive(),
  spec,
  specHash: z.string(),
  readiness: z.object({
    goalReady: z.boolean(),
    sponsorResolved: z.boolean(),
    targetCriteriaReady: z.boolean(),
    targetsReady: z.boolean(),
    deliveryReady: z.boolean(),
    contextReady: z.boolean(),
    contextEvidenceReady: z.boolean(),
    strategyReady: z.boolean(),
    sampleGenerationEligible: z.boolean(),
    fullGenerationEligible: z.boolean(),
    sendReviewEligible: z.boolean(),
    blockers: z.array(z.string()),
  }),
  pendingProposalCount: z.number().int().nonnegative(),
});
export const engagementSessionOperations = {
  "engagement.sessions": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach-v3/sessions",
    request: z
      .object({
        query: z
          .object({
            limit: z.number().int().min(1).max(100).optional(),
            offset: z.number().int().nonnegative().optional(),
            includeArchived: z.boolean().optional(),
            search: z.string().max(160).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(
      session.extend({
        topic: text,
        goal: text,
        targetCount: z.number().int().nonnegative(),
        recordStatus: text,
        sentAt: text,
      }),
    ),
    source,
  }),
  "engagement.session": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach-v3/sessions/:sessionId",
    request: z.object({ params }).strict(),
    response: detail,
    source,
  }),
};
