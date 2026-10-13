import { z } from "zod";
import { defineOperation } from "../contracts";
import { onboardOkSchema } from "./onboard-funnel-schemas";
import {
  setupItInviteSchema,
  setupStateSchema,
  setupTaskKeySchema,
  setupTransitionStatusSchema,
} from "./onboard-setup-schemas";

const source =
  "apps/onboard-api/src/setup/setup.controller.ts + setup.service.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const member = {
  service: "onboard",
  authentication: "clerk-session",
  source,
} as const;
const empty = z.object({}).strict();
export const onboardSetupOperations = {
  "onboard.setup.state": defineOperation({
    ...member,
    method: "GET",
    path: "/setup/state",
    request: empty,
    response: setupStateSchema,
  }),
  "onboard.setup.transition": defineOperation({
    ...member,
    method: "POST",
    path: "/setup/tasks/:task/transition",
    request: z
      .object({
        params: z.object({ task: setupTaskKeySchema }).strict(),
        body: z
          .object({
            from: setupTransitionStatusSchema,
            to: setupTransitionStatusSchema,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      task: setupTaskKeySchema,
      status: setupTransitionStatusSchema,
    }),
  }),
  "onboard.setup.itInvite": defineOperation({
    ...member,
    method: "POST",
    path: "/setup/it-invites",
    request: z
      .object({ body: z.object({ email: z.email() }).strict() })
      .strict(),
    response: z.array(setupItInviteSchema),
  }),
  "onboard.setup.itResend": defineOperation({
    ...member,
    method: "POST",
    path: "/setup/it-invites/:inviteId/resend",
    request: z
      .object({ params: z.object({ inviteId: z.uuid() }).strict() })
      .strict(),
    response: onboardOkSchema,
  }),
  "onboard.setup.complete": defineOperation({
    ...member,
    method: "POST",
    path: "/setup/complete",
    request: empty,
    response: setupStateSchema,
  }),
} as const;
