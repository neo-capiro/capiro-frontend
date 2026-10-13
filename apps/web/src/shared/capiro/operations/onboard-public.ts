import { z } from "zod";
import { defineOperation } from "../contracts";
import { onboardOkSchema } from "./onboard-funnel-schemas";
import {
  itConsentUrlSchema,
  itInviteTokenSchema,
  itInviteViewSchema,
  itProviderSchema,
  onboardConfigSchema,
} from "./onboard-setup-schemas";

const source =
  "apps/onboard-api/src/it-admin/it-admin.controller.ts + it-admin.service.ts @7b5a9644d30d22389b23f0e07f923c8925682047";
const params = z.object({ token: itInviteTokenSchema }).strict();
/** Capability/public allowlist: no authenticated registry membership or bearer forwarding. */
export const publicOnboardOperations = {
  "public-onboard.config": defineOperation({
    service: "onboard",
    method: "GET",
    path: "/public/config",
    request: z.object({}).strict(),
    response: onboardConfigSchema,
    source:
      "apps/onboard-api/src/public/public-config.controller.ts @7b5a9644d30d22389b23f0e07f923c8925682047",
  }),
  "public-onboard.invite": defineOperation({
    service: "onboard",
    method: "GET",
    path: "/it/invite/:token",
    source,
    request: z.object({ params }).strict(),
    response: itInviteViewSchema,
  }),
  "public-onboard.consent": defineOperation({
    service: "onboard",
    method: "POST",
    path: "/it/invite/:token/consent-url",
    source,
    request: z
      .object({
        params,
        body: z.object({ provider: itProviderSchema }).strict(),
      })
      .strict(),
    response: z.object({ url: itConsentUrlSchema }),
  }),
  "public-onboard.skipGoogle": defineOperation({
    service: "onboard",
    method: "POST",
    path: "/it/invite/:token/skip-google",
    source,
    request: z.object({ params }).strict(),
    response: onboardOkSchema,
  }),
} as const;
