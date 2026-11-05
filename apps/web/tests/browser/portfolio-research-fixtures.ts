import { expect, type Page } from "@playwright/test";
import { capability, capabilityId, clientId, json } from "./fixtures";
import { installEnrichment, syntheticRun } from "./client-enrichment-fixtures";
import { runSchema } from "../../src/features/portfolio/profile-build/contracts";
import {
  portfolioProposalSchema,
  type PortfolioProposal,
} from "../../src/features/portfolio/capabilities/proposal-contracts";

export const discoveredId = "60000000-0000-4000-8000-000000000008";
const evidence = [
  {
    title: "Synthetic annual report",
    excerpt: "Synthetic recorded test evidence; not a real-world claim.",
    observedAt: "2026-01-01T00:00:00Z",
    sourceType: "company",
    url: "https://example.test/annual-report",
  },
];
export async function installPortfolioResearch(
  page: Page,
  purpose: "alignment" | "business_units",
) {
  const fixture = await installEnrichment(page);
  fixture.state.run = null;
  let proposals: PortfolioProposal[] = [];
  await page.route(`**/clients/${clientId}/portfolio/depth`, (route) =>
    json(route, {
      capabilities: [capability],
      proposals,
      terms: [],
      tracking: [],
      relationships: [],
      supports: [],
      memberView: { fields: [], gaps: [] },
      sectorAnchors: [],
      businessUnits: proposals.filter((row) => row.kind === "business_unit"),
    }),
  );
  await page.route(
    `**/clients/${clientId}/capabilities/discovery/results?**`,
    (route) => json(route, { proposals: [], hasMore: false, nextCursor: null }),
  );
  await page.route(
    `**/clients/${clientId}/profile-build/runs`,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON() as Record<string, unknown>;
      fixture.state.posts.push({ path: "runs", body });
      const id = String(body.requestId);
      const template = syntheticRun();
      fixture.state.run = runSchema.parse({
        ...template,
        id,
        status: "running",
        stage: "research",
        completedAt: null,
        requestedSources: body.sources,
        attachmentIds: body.attachmentIds,
        selectedLdaIds: [],
        setup: {
          purpose: body.purpose,
          capabilityId: body.capabilityId,
          ...(body.businessUnitId
            ? {
                businessUnit: {
                  id: body.businessUnitId,
                  name: "Synthetic unit",
                },
              }
            : {}),
          website: body.website,
          attachmentIds: body.attachmentIds,
        },
        sourceStates: { public_web: { status: "running" } },
        tasks: template.tasks?.map((task) => ({
          ...task,
          runId: id,
          status: "running",
          outputSummary: null,
        })),
        findings: [],
      });
      return json(route, fixture.state.run);
    },
  );
  await page.route(
    `**/clients/${clientId}/capabilities/discovery/proposals/${discoveredId}/review`,
    async (route) => {
      const body = route.request().postDataJSON();
      const proposal = proposals[0];
      if (!proposal) throw Error("Synthetic proposal missing");
      expect(body).toEqual({
        expectedVersion: proposal.version,
        action: "approve",
      });
      proposals = [
        portfolioProposalSchema.parse({
          ...proposal,
          status: "approved",
          version: proposal.version + 1,
        }),
      ];
      return json(route, proposals[0]);
    },
  );
  return {
    ...fixture,
    finish() {
      const run = fixture.state.run;
      if (!run)
        throw Error("Start the synthetic durable run before finishing it");
      proposals = [
        portfolioProposalSchema.parse({
          id: discoveredId,
          kind: purpose === "alignment" ? "alignment" : "business_unit",
          capabilityId: purpose === "alignment" ? capabilityId : null,
          status: "proposed",
          version: 1,
          evidence,
          payload:
            purpose === "alignment"
              ? {
                  targetType: "keyword",
                  value: "Synthetic discovered alignment",
                  rationale: "Supported by the selected synthetic document.",
                  score: 92,
                }
              : { name: "Synthetic unit", annualReportYear: 2025 },
        }),
      ];
      fixture.state.run = {
        ...run,
        status: "completed",
        stage: "review_ready",
        completedAt: "2026-01-01T00:01:00Z",
        sourceStates: { public_web: { status: "completed", count: 1 } },
        tasks: run.tasks?.map((task) => ({ ...task, status: "completed" })),
      };
    },
  };
}
