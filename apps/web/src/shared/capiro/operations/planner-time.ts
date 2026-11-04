import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarDate,
  event,
  plannerId,
  read,
  recordParams,
} from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner.controller.ts + planner.service.ts:3682-4410 + strategy-verifier/planner-timesheets.ts";
const time = z
  .object({
    workedOn: calendarDate,
    timeZone: z.string().min(1).max(100),
    billable: z.boolean(),
    projectId: plannerId.nullable(),
    category: z.string().max(200),
  })
  .strict();
const timeSettings = z.object({
  options: z.object({ timeZone: z.string() }),
});
export const plannerTimeOperations = {
  "planner.time.add": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks/:id/events",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            kind: z.literal("time"),
            text: z.string().trim().min(1).max(20000),
            minutes: z.number().int().min(1).max(1440),
            time,
          })
          .strict(),
      })
      .strict(),
    response: event,
    source,
  }),
  "planner.time.settings": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/time/settings",
    request: read,
    response: timeSettings,
    source,
  }),
};
