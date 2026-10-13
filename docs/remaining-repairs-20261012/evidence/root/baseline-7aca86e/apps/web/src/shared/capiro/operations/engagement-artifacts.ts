import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capirov2@4be13b0 engagement.controller.ts:2107-2190 + meetings-api.ts";
const id = z.uuid();
const params = z.object({ id, noteId: id }).strict();
const debriefParams = z.object({ id, debriefId: id }).strict();
const artifact = z
  .object({
    id,
    body: z.string().nullable(),
    status: z.string().optional(),
    createdAt: z.string(),
  })
  .strip();
const body = z
  .object({
    body: z.string().trim().min(1).max(100000),
    confidential: z.boolean().optional(),
  })
  .strict();
export const engagementArtifactOperations = {
  "engagement.note.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/engagement/meetings/:id/notes/:noteId",
    request: z.object({ params, body }).strict(),
    response: artifact,
    source,
  }),
  "engagement.note.approve": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/meetings/:id/notes/:noteId/approve",
    request: z.object({ params }).strict(),
    response: artifact,
    source,
  }),
  "engagement.debrief.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/meetings/:id/debriefs",
    request: z.object({ params: z.object({ id }).strict(), body }).strict(),
    response: artifact,
    source,
  }),
  "engagement.debrief.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/engagement/meetings/:id/debriefs/:debriefId",
    request: z.object({ params: debriefParams, body }).strict(),
    response: artifact,
    source,
  }),
  "engagement.debrief.approve": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/meetings/:id/debriefs/:debriefId/approve",
    request: z.object({ params: debriefParams }).strict(),
    response: artifact,
    source,
  }),
};
