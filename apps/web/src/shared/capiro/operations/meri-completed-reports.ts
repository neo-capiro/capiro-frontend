import { z } from "zod";
import { defineOperation } from "../contracts";

const source =
  "capiro-backend@4430a8681daebb6de51912391deee4d5ce5a960b apps/api/src/meri/meri-completed-reports.controller.ts + meri-research.service.ts readCompletedReports/readCompletedReport; source only, deployment pending";
const cursor = z.string().regex(/^[A-Za-z0-9_-]{40,2048}$/);
export const completedReportSummary = z.strictObject({
  id: z.uuid(),
  artifactId: z.uuid(),
  title: z.string(),
  kind: z.string(),
  clientId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const completedReport = completedReportSummary.extend({
  markdown: z.string(),
});
export const completedReportPage = z.strictObject({
  reports: z.array(completedReportSummary).max(25),
  nextCursor: cursor.nullable(),
});
export type CompletedReport = z.infer<typeof completedReport>;
export type CompletedReportSummary = z.infer<typeof completedReportSummary>;
export type CompletedReportPage = z.infer<typeof completedReportPage>;

/** Core reads, through the existing typed gateway and current session owner.
 * They never enter legacy research create/resume/export/filing endpoints. */
export const completedReportOperations = {
  "meri.reports.completed.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/completed-reports",
    request: z.strictObject({
      query: z.strictObject({
        clientId: z.union([z.uuid(), z.literal("general")]).optional(),
        limit: z.number().int().min(1).max(25),
        cursor: cursor.optional(),
      }),
    }),
    response: completedReportPage,
    source,
  }),
  "meri.reports.completed.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/completed-reports/:id",
    request: z.strictObject({ params: z.strictObject({ id: z.uuid() }) }),
    response: completedReport,
    source,
  }),
} as const;
