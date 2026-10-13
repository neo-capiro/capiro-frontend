import { z } from "zod";
import { defineOperation } from "../contracts";
import { effectiveDateOperations } from "./calendar-effective-dates";
import { commentDeadlineOperations } from "./calendar-comment-deadlines";

export const commentDeadline = z.object({
  id: z.string(),
  documentNumber: z.string(),
  title: z.string(),
  commentEndDate: z.string(),
  htmlUrl: z.string().nullable().optional(),
  agencyNames: z.array(z.string()).optional(),
});
export const calendarOperations = {
  ...effectiveDateOperations,
  ...commentDeadlineOperations,
  "calendar.commentDeadlines": defineOperation({
    service: "core",
    method: "GET",
    path: "/federal-register/upcoming-deadlines",
    request: z.object({}).strict(),
    response: z.array(commentDeadline),
    source:
      "capirov2@4be13b0 apps/api/src/federal-register/federal-register.controller.ts:85 + federal-register.service.ts:68; fixed next 30 days, take 50",
  }),
} as const;
