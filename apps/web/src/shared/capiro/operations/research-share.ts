import { z } from "zod";
import { defineOperation } from "../contracts";
import * as s from "./research-share-schemas";

const source =
  "apps/api/src/research-portfolios/research-portfolio-share.controller.ts; packages/shared/src/research-portfolios.ts (client share links)";
const params = z.object({ id: z.uuid() }).strict();
const read = <R extends z.ZodType>(path: string, response: R) =>
  defineOperation({
    service: "core",
    method: "GET",
    path,
    request: z.object({ params }).strict(),
    response,
    source,
  });
const post = <B extends z.ZodType, R extends z.ZodType>(
  path: string,
  body: B,
  response: R,
) =>
  defineOperation({
    service: "core",
    method: "POST",
    path,
    request: z.object({ params, body }).strict(),
    response,
    source,
  });

/** Sharing settings, dashboard designs and links of one Research Portfolio (signed-in users). */
export const researchShareOperations = {
  "research.sharing": read(
    "/research-portfolios/:id/sharing",
    s.researchShareSettings,
  ),
  "research.sharing.enable": post(
    "/research-portfolios/:id/sharing/enable",
    z.object({ pin: s.researchSharePin }).strict(),
    s.researchShareSettings,
  ),
  "research.sharing.pin": post(
    "/research-portfolios/:id/sharing/pin",
    z.object({ pin: s.researchSharePin }).strict(),
    s.researchShareSettings,
  ),
  "research.sharing.disable": post(
    "/research-portfolios/:id/sharing/disable",
    z.object({}).strict(),
    s.researchShareSettings,
  ),
  "research.designs": read(
    "/research-portfolios/:id/dashboard-designs",
    z.array(s.researchDashboardDesign),
  ),
  "research.designs.create": post(
    "/research-portfolios/:id/dashboard-designs",
    z
      .object({
        name: z.string().trim().min(1).max(200),
        layout: s.researchDashboardLayout,
      })
      .strict(),
    s.researchDashboardDesign,
  ),
  "research.designs.update": defineOperation({
    service: "core",
    method: "PUT",
    path: "/research-portfolios/:id/dashboard-designs/:designId",
    request: z
      .object({
        params: z.object({ id: z.uuid(), designId: z.uuid() }).strict(),
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            layout: s.researchDashboardLayout,
            expectedVersion: z.number().int().min(1),
          })
          .strict(),
      })
      .strict(),
    response: s.researchDashboardDesign,
    source,
  }),
  "research.shareLinks": read(
    "/research-portfolios/:id/share-links",
    z.array(s.researchShareLink),
  ),
  "research.shareLinks.publish": post(
    "/research-portfolios/:id/share-links",
    z
      .object({
        operationKey: z.string().min(1).max(128),
        snapshotId: z.uuid(),
        designId: z.uuid(),
        clientId: z.uuid(),
        branding: z.boolean(),
      })
      .strict(),
    s.researchShareLinkPublished,
  ),
  "research.shareLinks.revoke": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/share-links/:linkId/revoke",
    request: z
      .object({
        params: z.object({ id: z.uuid(), linkId: z.uuid() }).strict(),
        body: z.object({}).strict(),
      })
      .strict(),
    response: s.researchShareLink,
    source,
  }),
} as const;
