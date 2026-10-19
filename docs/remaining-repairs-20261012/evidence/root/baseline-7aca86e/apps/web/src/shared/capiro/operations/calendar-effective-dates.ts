import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  effectiveDatePage,
  effectiveDateQuery,
} from "../../federal-register/effective-dates";
export const effectiveDateOperations = {
  "calendar.effectiveDates": defineOperation({
    service: "core",
    method: "GET",
    path: "/federal-register/effective-date-calendar",
    request: z.object({ query: effectiveDateQuery }).strict(),
    response: effectiveDatePage,
    source:
      "capirov2@762aea0004dba51643ff370e7029de266966b74e docs/effective-date-calendar-20261012/CONTRACT.md; FederalRegisterService.getEffectiveDateCalendar",
  }),
} as const;
