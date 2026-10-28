import { z } from "zod";
import {
  parseMemoryReviewDetail,
  parseMemoryReviewInboxPage,
  MEMORY_REVIEW_INBOX_VIEWS,
} from "@capiro/shared/memory-review";
import { defineOperation } from "../contracts";

const source =
  "Core memory-review-inbox.controller.ts and memory-review-inbox.service.ts; @capiro/shared/memory-review";
const id = z.string().uuid();
const empty = z.object({}).strict();
const selected = z.object({ params: z.object({ id }).strict() }).strict();
/** Use the released owner codecs instead of maintaining a second review DTO. */
const received = <T>(parse: (value: unknown) => T) =>
  z.unknown().transform((value, context) => {
    try {
      return parse(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "Memory review response could not be verified.",
      });
      return z.NEVER;
    }
  });
export const memoryReviewOperations = {
  "memory.review.inbox": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/review/inbox",
    source,
    request: z
      .object({
        query: z
          .object({
            view: z.enum(MEMORY_REVIEW_INBOX_VIEWS),
            limit: z.number().int().min(1).max(100),
            cursor: z.string().max(4096).optional(),
          })
          .strict(),
      })
      .strict(),
    response: received(parseMemoryReviewInboxPage),
  }),
  "memory.review.request": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/review/inbox/requests/:id",
    source,
    request: selected,
    response: received(parseMemoryReviewDetail),
  }),
  "memory.notifications.unread": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/review/notifications/unread-count",
    source,
    request: empty,
    response: z
      .object({ enabled: z.boolean(), count: z.number().int().nonnegative() })
      .strict(),
  }),
  "memory.notifications.read": defineOperation({
    service: "core",
    method: "POST",
    path: "/memory/review/notifications/:id/read",
    source,
    request: selected,
    response: z.object({ ok: z.literal(true) }).strict(),
  }),
  "memory.notifications.readAll": defineOperation({
    service: "core",
    method: "POST",
    path: "/memory/review/notifications/read-all",
    source,
    request: empty,
    response: z
      .object({ ok: z.literal(true), updated: z.number().int().nonnegative() })
      .strict(),
  }),
} as const;
