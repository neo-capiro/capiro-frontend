import { z } from "zod";
import { defineOperation } from "../contracts";
import { engagementArtifactOperations } from "./engagement-artifacts";
import { engagementSessionOperations } from "./engagement-sessions";
import { engagementTaskOperations } from "./engagement-tasks";
import { objectiveDestinationOperations } from "./engagement-objective-destination";
import { newsletterRoutingMetadata } from "./newsletter-routing";
const source =
  "capirov2@4be13b0 apps/api/src/engagement/engagement.controller.ts and engagement.service.ts";
const id = z.uuid();
const params = z.object({ id }).strict();
const client = z.object({ id, name: z.string() }).strip().nullable();
export const engagementMeeting = z
  .object({
    id,
    subject: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    status: z.string(),
    location: z.string().nullable(),
    description: z.string().nullable(),
    client: client.optional(),
    visibility: z.string().optional(),
    notesApproved: z.boolean().optional(),
    libraryQualifiedBy: z
      .array(
        z.object({
          kind: z.enum(["prep", "notes", "debrief"]),
          current: z.boolean(),
        }),
      )
      .optional(),
    joinLink: z.string().nullable().optional(),
    preps: z
      .array(
        z
          .object({
            id,
            status: z.string(),
            summary: z.string().nullable().optional(),
            agenda: z.array(z.string()).optional(),
            talkingPoints: z.array(z.string()).optional(),
            risks: z.array(z.string()).optional(),
            followUps: z.array(z.string()).optional(),
          })
          .strip(),
      )
      .optional(),
    notes: z
      .array(
        z
          .object({
            id,
            status: z.string().optional(),
            sharedAt: z.string().nullable().optional(),
          })
          .strip(),
      )
      .optional(),
    debriefs: z
      .array(
        z
          .object({
            id,
            status: z.string().optional(),
            sharedAt: z.string().nullable().optional(),
          })
          .strip(),
      )
      .optional(),
  })
  .strip();
const createMeeting = z
  .object({
    subject: z.string().trim().min(1).max(240),
    description: z.string().optional(),
    location: z.string().max(240).optional(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    clientId: id.optional(),
  })
  .strict()
  .refine((value) => value.startsAt < value.endsAt, "End must follow start.");
const artifact = z
  .object({
    id,
    body: z.string().nullable(),
    restricted: z.boolean().optional(),
    status: z.string().optional(),
    createdAt: z.string(),
  })
  .strip();
export const outreachRecord = z
  .object({
    id,
    title: z.string(),
    type: z.string(),
    status: z.string(),
    subject: z.string().nullable(),
    body: z.string().nullable(),
    client: client.optional(),
    metadata: newsletterRoutingMetadata.nullable().optional(),
    hasWorkflow: z.boolean().optional(),
    createdAt: z.string().optional(),
    recipients: z
      .array(
        z.object({
          id: z.string().max(384).optional(),
          clientId: id.optional(),
          name: z.string().max(240).optional(),
          email: z.string().max(320).optional(),
          office: z.string().max(240).optional(),
          title: z.string().max(240).optional(),
          direction: z.enum(["on-behalf", "to-clients"]).optional(),
        }),
      )
      .optional(),
  })
  .strip();
const scopeQuery = z
  .object({
    clientId: id.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .strict();
export const engagementOperations = {
  ...engagementTaskOperations,
  ...engagementArtifactOperations,
  ...engagementSessionOperations,
  ...objectiveDestinationOperations,
  "engagement.meetings": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/meetings",
    request: z.object({ query: scopeQuery.optional() }).strict(),
    response: z.array(engagementMeeting),
    source,
  }),
  "engagement.meeting": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/meetings/:id",
    request: z.object({ params }).strict(),
    response: engagementMeeting,
    source,
  }),
  "engagement.meeting.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/meetings",
    request: z.object({ body: createMeeting }).strict(),
    response: engagementMeeting,
    source,
  }),
  "engagement.outreach": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach",
    request: z
      .object({
        query: scopeQuery
          .extend({
            type: z.string().max(50).optional(),
            limit: z.number().int().min(1).max(500).optional(),
            deleted: z.enum(["true", "false"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(outreachRecord),
    source,
  }),
  "engagement.outreach.records": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/records",
    request: z
      .object({
        query: scopeQuery
          .extend({
            q: z.string().max(240).optional(),
            limit: z.number().int().min(1).max(100).optional(),
            cursor: z.string().optional(),
            deleted: z.enum(["true", "false"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(outreachRecord.extend({ hasWorkflow: z.boolean() })),
      nextCursor: z.string().nullable(),
    }),
    source:
      "Core OutreachCampaignController.listRecords / EngagementService.listOutreachRecordPage",
  }),
  "engagement.outreach.record": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/:id",
    request: z.object({ params }).strict(),
    response: outreachRecord,
    source,
  }),
  "engagement.outreach.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach",
    request: z
      .object({
        body: z
          .object({
            type: z.enum([
              "campaign",
              "follow_up",
              "prep",
              "outbound_campaign",
            ]),
            title: z.string().trim().min(1).max(240),
            clientId: id.optional(),
            subject: z.string().max(300).optional(),
            body: z.string().optional(),
            direction: z.enum(["on-behalf", "to-clients"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: outreachRecord,
    source,
  }),
  "engagement.outreach.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/engagement/outreach/:id",
    request: z
      .object({
        params,
        body: z
          .object({
            title: z.string().trim().min(1).max(240),
            clientId: id.nullable(),
            subject: z.string().max(300).nullable(),
            body: z.string().max(40000).nullable(),
          })
          .strict(),
      })
      .strict(),
    response: outreachRecord,
    source:
      "Core EngagementController.updateOutreachRecord and EngagementService.updateOutreachRecord",
  }),
  "engagement.notes": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/meetings/:id/notes",
    request: z.object({ params }).strict(),
    response: z.array(artifact),
    source,
  }),
  "engagement.debriefs": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/meetings/:id/debriefs",
    request: z.object({ params }).strict(),
    response: z.array(artifact),
    source,
  }),
  "engagement.note.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/meetings/:id/notes",
    request: z
      .object({
        params,
        body: z
          .object({
            body: z.string().trim().min(1).max(100_000),
            confidential: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    response: artifact,
    source,
  }),
};
export type EngagementMeeting = z.infer<typeof engagementMeeting>;
export type OutreachRecord = z.infer<typeof outreachRecord>;
