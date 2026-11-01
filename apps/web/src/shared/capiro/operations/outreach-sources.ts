import { z } from "zod";
import { defineOperation } from "../contracts";
import { contextAttachment } from "./strategies-imports";
import {
  classicOutreachTemplate,
  createClassicTemplateInput,
  createdClassicTemplate,
} from "./outreach-template-catalog";
const source =
  "Core EngagementService existing source, template, audience, attachment and mail read owners";
const id = z.uuid();
const libraryItem = z.object({
  id: z.string(),
  clientId: id.nullable(),
  clientName: z.string(),
  title: z.string(),
  sub: z.string().optional(),
  body: z.string().optional(),
  tag: z.string().optional(),
  date: z.string().optional(),
});
const audience = z.object({
  id,
  kind: z.enum(["list", "group"]),
  name: z.string(),
  members: z.array(
    z.object({
      id,
      source: z.string(),
      sourceRefId: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string(),
      title: z.string().nullable(),
      office: z.string().nullable(),
    }),
  ),
});
const metadata = z
  .object({
    clientId: id.optional(),
    fileName: z.string().min(1).max(240),
    contentType: z.string().min(1).max(160),
  })
  .strict();
export const outreachSourceOperations = {
  "engagement.campaign.templates": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/ai-templates",
    request: z.object({}).strict(),
    response: z.array(classicOutreachTemplate),
    source,
  }),
  "engagement.campaign.template.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/ai-templates",
    request: z.object({ body: createClassicTemplateInput }).strict(),
    response: createdClassicTemplate,
    source,
  }),
  "engagement.campaign.library": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/context-library",
    request: z.object({}).strict(),
    response: z.object({
      documents: z.array(libraryItem),
      debriefs: z.array(libraryItem),
      preps: z.array(libraryItem),
    }),
    source,
  }),
  "engagement.campaign.audiences": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/audiences",
    request: z.object({}).strict(),
    response: z.array(audience),
    source,
  }),
  "engagement.campaign.audience.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach/audiences",
    request: z
      .object({
        body: z
          .object({
            kind: z.enum(["list", "group"]),
            name: z.string().min(1).max(240),
            members: z
              .array(
                z
                  .object({
                    source: z.enum(["congress", "client_contact", "manual"]),
                    sourceRefId: z.string().optional(),
                    name: z.string().optional(),
                    email: z.email(),
                    title: z.string().optional(),
                    office: z.string().optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(500),
          })
          .strict(),
      })
      .strict(),
    response: audience,
    source,
  }),
  "engagement.campaign.recentContacts": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/outreach/outbound/contact-data",
    request: z
      .object({ query: z.object({ clientId: id.optional() }).strict() })
      .strict(),
    response: z.object({
      generatedAt: z.string(),
      from: z.string(),
      to: z.string(),
      contacts: z.array(
        z.object({
          id: z.string(),
          meetingId: id,
          meetingSubject: z.string(),
          attendeeName: z.string(),
          attendeeEmail: z.string().nullable(),
          attendeeNames: z.string(),
          attendeeEmails: z.string(),
          prepSummary: z.string(),
          debriefSummary: z.string(),
          clientId: id.nullable(),
          clientName: z.string().nullable(),
          directoryContactId: z.string().nullable(),
          office: z.string().nullable(),
          title: z.string().nullable(),
        }),
      ),
    }),
    source,
  }),
  "engagement.campaign.attachments": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/attachments",
    request: z
      .object({
        query: z
          .object({
            clientId: id.optional(),
            unlinked: z.literal("true").optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.array(contextAttachment),
    source,
  }),
  "engagement.campaign.attachment.confirm": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/attachments/confirm",
    request: z
      .object({
        body: metadata
          .extend({ s3Key: z.string().min(1), source: z.literal("outreach") })
          .strict(),
      })
      .strict(),
    response: contextAttachment,
    source,
  }),
  "engagement.campaign.emails": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/mail-threads",
    request: z
      .object({
        query: z
          .object({
            clientId: id.optional(),
            query: z.string().max(500).optional(),
            limit: z.literal(50),
            cursor: z.string().optional(),
            asOf: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    // IDs are source selectors; snippets are explicitly previews, never a full body.
    response: z.object({
      items: z.array(
        z.object({
          id,
          subject: z.string(),
          snippet: z.string().nullable(),
          messages: z.array(
            z.object({
              id,
              subject: z.string().nullable(),
              bodyText: z.string().nullable(),
            }),
          ),
        }),
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      asOf: z.string(),
      notice: z.string(),
      coverageTruncated: z.boolean(),
    }),
    source,
  }),
} as const;
export type OutreachLibraryItem = z.infer<typeof libraryItem>;
