import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarEvent,
  carrySelection,
  documentParams,
  emptyWorkspaceRequest,
  firstPage,
  hillDayDocument,
  libraryDocument,
  meetingContext,
  office,
  resolution,
  sourceStatus,
  workspaceClient,
  workspaceId,
} from "./workspace-schemas";

const source =
  "capirov2@4be13b0 apps/workspace/src/hillday/hillday.controller.ts; hillday.types.ts; hillday-document.service.ts";
const boundedText = z.string().min(1).max(200);
const docRead = z.object({ params: documentParams }).strict();
const meetingParams = documentParams
  .extend({ meetingId: z.string().min(1).max(64) })
  .strict();
const generationSource =
  "capirov2@6f4f82145f797a9a1a4fffb4c33ee4c1a260c882 apps/workspace/src/hillday/{hillday.controller.ts,hillday.types.ts,hillday-generation.service.ts,dto/hillday.dto.ts}";
const jobLifecycle = z.enum([
  "queued",
  "running",
  "complete",
  "failed",
  "cancelled",
]);
const jobRead = z
  .object({ params: documentParams.extend({ jobId: workspaceId }).strict() })
  .strict();
export const hillDayJobStatus = z.object({
  jobId: workspaceId,
  documentId: workspaceId,
  status: jobLifecycle,
  units: z.array(
    z.object({
      sectionId: z.string().nullable(),
      state: z.enum(["queued", "running", "done", "failed", "unknown"]),
      meetingId: z.string(),
      reason: z.string().nullable(),
      at: z.string(),
    }),
  ),
  quality: z.number().nullable(),
  error: z.string().nullable(),
  cancelRequestedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type HillDayJobStatus = z.infer<typeof hillDayJobStatus>;
export const workspaceHillDayOperations = {
  "workspace.documents": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents",
    request: z
      .object({
        query: z
          .object({
            clientId: workspaceId.optional(),
            status: z.string().max(30).optional(),
            kind: z.enum(["all", "hillday", "draft"]).optional(),
            scope: z.enum(["all", "mine", "shared"]).optional(),
            q: z.string().max(200).optional(),
            cursor: z.string().max(500).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(libraryDocument),
      nextCursor: z.string().nullable(),
    }),
    source:
      "capiro-backend@b79a168cdb75aa021c48fe328f599c2788cdae07 apps/workspace/src/hillday/dto/hillday.dto.ts ListLibraryQueryDto; hillday.types.ts; hillday-document.service.ts listDocuments",
  }),
  "workspace.clients": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/clients",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(200).optional(),
            cursor: z.string().max(500).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(workspaceClient),
      nextCursor: z.string().nullable(),
      sources: z.array(sourceStatus),
    }),
    source,
  }),
  "workspace.hillday.blueprints": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/blueprints",
    request: emptyWorkspaceRequest,
    response: z.object({
      blueprints: z.array(
        z.object({
          id: z.string(),
          slug: z.string(),
          name: z.string(),
          implemented: z.boolean(),
          description: z.string().optional(),
        }),
      ),
    }),
    source,
  }),
  "workspace.hillday.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents",
    request: z
      .object({
        body: z
          .object({
            blueprintId: z.string().min(1).max(128),
            clientId: workspaceId,
            name: boundedText,
            lookbackDays: z.number().int().min(7).max(365).optional(),
            timeZone: z.string().min(1).max(64).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      id: workspaceId,
      name: z.string(),
      status: z.string(),
      client: z.object({ id: workspaceId, name: z.string() }),
      timeZone: z.string(),
      lookbackDays: z.number(),
    }),
    source,
  }),
  "workspace.hillday.document": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id",
    request: docRead,
    response: hillDayDocument,
    source,
  }),
  "workspace.hillday.update": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/hillday/documents/:id",
    request: z
      .object({
        params: documentParams,
        body: z
          .object({
            name: boundedText.optional(),
            status: z.enum(["draft", "delivered"]).optional(),
            section: z
              .object({
                sectionId: z.string().min(1).max(64),
                focus: z.string().max(20000).optional(),
                background: z.string().max(20000).optional(),
              })
              .strict()
              .optional(),
            firstPage: firstPage.nullable().optional(),
            expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
          })
          .strict(),
      })
      .strict(),
    response: hillDayDocument,
    source,
  }),
  "workspace.hillday.calendar": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/clients/:clientId/calendar",
    request: z
      .object({
        params: z.object({ clientId: workspaceId }).strict(),
        query: z
          .object({
            from: z.iso.datetime({ offset: true }).optional(),
            to: z.iso.datetime({ offset: true }).optional(),
            timeZone: z.string().min(1).max(64).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      clientId: workspaceId,
      from: z.string(),
      to: z.string(),
      timeZone: z.string(),
      events: z.array(calendarEvent),
      upcomingEventAt: z.string().nullable(),
      sources: z.array(sourceStatus),
    }),
    source,
  }),
  "workspace.hillday.meetings": defineOperation({
    service: "workspace",
    method: "PUT",
    path: "/hillday/documents/:id/meetings",
    request: z
      .object({
        params: documentParams,
        body: z
          .object({
            eventIds: z.array(z.string().min(1).max(500)).max(80),
            weekStart: z.iso.date().optional(),
            timeZone: z.string().max(64).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      documentId: workspaceId,
      meetings: z.array(
        z.object({
          meetingId: z.string(),
          eventId: z.string(),
          ordinal: z.number(),
          event: calendarEvent,
          resolved: z.boolean(),
        }),
      ),
      skipped: z.array(z.string()),
      sources: z.array(sourceStatus),
    }),
    source,
  }),
  "workspace.hillday.resolution": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/resolution",
    request: docRead,
    response: resolution,
    source,
  }),
  "workspace.hillday.resolve": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/resolution",
    request: docRead,
    response: resolution,
    source,
  }),
  "workspace.hillday.correction": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/hillday/documents/:id/resolution/:meetingId",
    request: z
      .object({
        params: meetingParams,
        body: z
          .object({
            kind: z.enum([
              "assign_staffer",
              "manual_attendee",
              "accept_stale",
              "create_directory_record",
              "change_office",
              "edit_meeting_facts",
            ]),
            attendeeId: z.string().max(64).optional(),
            stafferId: z.string().max(64).optional(),
            name: boundedText.optional(),
            role: z.string().max(200).optional(),
            address: z.string().email().max(320).optional(),
            memberId: z.string().max(64).optional(),
            useOffice: z.enum(["directory", "invite"]).optional(),
            subject: z.string().max(240).optional(),
            startsAt: z.iso.datetime({ offset: true }).optional(),
            endsAt: z.iso.datetime({ offset: true }).optional(),
            location: z.string().max(240).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      resolution: resolution.shape.meetings.element,
      event: calendarEvent,
    }),
    source,
  }),
  "workspace.hillday.context": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/meetings/:meetingId/context",
    request: z
      .object({
        params: meetingParams,
        query: z
          .object({ lookbackDays: z.number().int().min(7).max(365).optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: meetingContext,
    source,
  }),
  "workspace.hillday.context.save": defineOperation({
    service: "workspace",
    method: "PUT",
    path: "/hillday/documents/:id/meetings/:meetingId/context",
    request: z
      .object({
        params: meetingParams,
        body: z
          .object({
            note: z.string().max(4000),
            carry: carrySelection,
            threadIds: z.array(z.string()).max(64),
            lookbackDays: z.number().int().min(7).max(365).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      record: meetingContext.shape.record.unwrap(),
      sourceCount: z.number(),
      units: meetingContext.shape.units,
    }),
    source,
  }),
  "workspace.hillday.quality": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/quality",
    request: docRead,
    response: z.object({
      documentId: workspaceId,
      score: z.number(),
      checks: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          state: z.enum(["pass", "warn"]),
          detail: z.string(),
        }),
      ),
      computedAt: z.string(),
    }),
    source,
  }),
  "workspace.hillday.generate": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/generate",
    request: z
      .object({
        params: documentParams,
        body: z.object({ requestId: workspaceId }).strict(),
      })
      .strict(),
    response: z.object({
      jobId: workspaceId,
      status: jobLifecycle,
    }),
    source: generationSource,
  }),
  "workspace.hillday.generation": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/generation",
    request: docRead,
    response: z.object({ job: hillDayJobStatus.nullable() }),
    source: generationSource,
  }),
  "workspace.hillday.job": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/generate/:jobId",
    request: jobRead,
    response: hillDayJobStatus,
    source: generationSource,
  }),
  "workspace.hillday.retry": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/generate/:jobId/retry",
    request: jobRead,
    response: hillDayJobStatus,
    source: generationSource,
  }),
  "workspace.hillday.cancel": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/generate/:jobId/cancel",
    request: jobRead,
    response: hillDayJobStatus,
    source: generationSource,
  }),
  "workspace.hillday.members": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/directory/members",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(200),
            chamber: z.string().max(30).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      members: z.array(office),
      sources: z.array(sourceStatus),
    }),
    source,
  }),
  "workspace.hillday.manual": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/meetings/manual",
    request: z
      .object({
        params: documentParams,
        body: z.object({ memberId: z.string().min(1).max(64) }).strict(),
      })
      .strict(),
    response: z.object({
      resolution: resolution.shape.meetings.element,
      event: calendarEvent,
    }),
    source,
  }),
};
