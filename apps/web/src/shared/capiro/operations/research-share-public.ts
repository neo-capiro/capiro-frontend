import { z } from "zod";
import { defineOperation } from "../contracts";
import * as s from "./research-share-schemas";

const source =
  "apps/api/src/research-portfolios/research-portfolio-share.controller.ts (ResearchPortfolioSharePublicController)";
/** The link token is 64 hex characters; anything else is answered as "not available" upstream. */
const params = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).strict();

/**
 * Recipient capability allowlist: a person with the link and the portfolio PIN, no
 * Clerk session and no bearer forwarding. Mirrors the public onboard/form registries.
 */
export const publicResearchShareOperations = {
  "public-research-share.availability": defineOperation({
    service: "core",
    method: "GET",
    path: "/public/research-share/:token",
    request: z.object({ params }).strict(),
    response: s.researchShareAvailability,
    source,
  }),
  "public-research-share.pin": defineOperation({
    service: "core",
    method: "POST",
    path: "/public/research-share/:token/pin",
    request: z
      .object({ params, body: z.object({ pin: s.researchSharePin }).strict() })
      .strict(),
    response: s.researchShareViewSession,
    source,
  }),
  "public-research-share.dashboard": defineOperation({
    service: "core",
    method: "POST",
    path: "/public/research-share/:token/dashboard",
    request: z
      .object({
        params,
        body: z.object({ viewToken: z.string().min(1).max(256) }).strict(),
      })
      .strict(),
    response: s.researchShareDashboard,
    source,
  }),
  "public-research-share.logo": defineOperation({
    service: "core",
    method: "POST",
    path: "/public/research-share/:token/logo",
    request: z
      .object({
        params,
        body: z.object({ viewToken: z.string().min(1).max(256) }).strict(),
      })
      .strict(),
    response: s.researchShareLogo,
    source,
  }),
} as const;
