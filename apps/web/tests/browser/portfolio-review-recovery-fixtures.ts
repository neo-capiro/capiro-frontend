import type { Page } from "@playwright/test";
import type { CapabilityProposal } from "../../src/features/portfolio/capabilities/proposal-contracts";
import type {
  ProfileSnapshot,
  ProfileFact,
} from "../../src/features/portfolio/profile-build/fact-contracts";
import { portfolioStages } from "../../src/features/portfolio/prospects/contracts";
import { clientId, prospect, prospectId, json } from "./fixtures";

export const proposal = (): CapabilityProposal => ({
  id: "60000000-0000-4000-8000-000000000001",
  capabilityId: null,
  kind: "capability",
  status: "proposed",
  version: 1,
  evidence: [
    {
      title: "Synthetic original source",
      excerpt: "Synthetic original evidence passage",
      observedAt: "2026-01-01T00:00:00Z",
      sourceType: "company",
      url: "https://example.test/evidence",
    },
  ],
  payload: {
    name: "Synthetic sensor",
    type: "product",
    lifecycle: "in_service",
    description: "Synthetic capability for review recovery",
    tags: [],
    classification: "capability",
  },
});
export const snapshot = (
  kind: "client" | "prospect" = "prospect",
): ProfileSnapshot => ({
  subject: { kind, id: kind === "client" ? clientId : prospectId },
  version: "a".repeat(64),
  fields: { name: "Synthetic current A" },
  facts: [],
  conflicts: [],
  completeness: { completed: 0, total: 6, missing: [], sections: [] },
  sections: {
    company: [],
    registration: [],
    lobbying: [],
    federal_footprint: [],
    news: [],
    locations: [],
    leadership: [],
    capabilities: [],
    advocacy: null,
    notes: [],
    documents: [],
  },
});
export const factId = (index: number) =>
  `80000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
export function conflicts(): ProfileSnapshot {
  const facts = [1, 2, 3, 4].map(
    (index): ProfileFact => ({
      id: factId(index),
      fieldKey: index < 3 ? "name" : "description",
      value: `Synthetic fact ${index}`,
      origin: "person",
      sourceType: null,
      sourceUrl: null,
      attachmentId: null,
      evidence: [],
      observedAt: null,
      confidence: null,
      status: index % 2 ? "approved" : "pending",
      approvedBy: null,
      approvedAt: null,
      version: 1,
      isCurrent: Boolean(index % 2),
    }),
  );
  return {
    ...snapshot("client"),
    facts,
    conflicts: [1, 3].map((index) => ({
      id: factId(index + 10),
      fieldKey: index === 1 ? "name" : "description",
      currentFactId: factId(index),
      proposedFactId: factId(index + 1),
      status: "pending",
      version: index,
      resolution: null,
    })),
  };
}
export function recoveryState() {
  return {
    proposals: [proposal()],
    discoveryStatus: 200,
    depthStatus: 200,
    profile: snapshot(),
    refusal: 409,
    reads: 0,
    firstWrites: [] as {
      method: string;
      path: string;
      body: Record<string, unknown>;
    }[],
    profileWrites: [] as Record<string, unknown>[],
    factWrites: [] as { path: string; body: Record<string, unknown> }[],
    proposalWrites: [] as string[],
    unexpected: [] as string[],
  };
}

/** Install BEFORE navigation. Only local assets and explicitly mocked API routes can pass. */
export async function installRecovery(page: Page, baseURL: string) {
  let state = recoveryState();
  const origin = new URL(baseURL).origin;
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/backend/core/", "");
    const method = route.request().method();
    if (url.origin !== origin) {
      state.unexpected.push(`Blocked external ${method} ${url.origin}`);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) {
      if (
        method === "GET" &&
        !["fetch", "xhr"].includes(route.request().resourceType())
      )
        return route.continue();
      state.unexpected.push(`Blocked unmocked ${method} ${url.pathname}`);
      return route.abort();
    }
    if (method === "GET" && path === "me")
      return json(route, {
        user: { id: "synthetic-reviewer", email: "reviewer@example.test" },
        tenant: { id: "synthetic-tenant", name: "Synthetic tenant" },
        role: "user_admin",
      });
    if (method === "GET" && path === "client-account-owners/options")
      return json(route, []);
    if (method === "GET" && path === "business-development/prospect-stages")
      return json(route, {
        version: "portfolio-3.1",
        stages: portfolioStages.map((value) => ({ value, label: value })),
        createStage: "identified",
        legacyMapping: "pending",
        allowLegacyTransitions: false,
      });
    if (method === "GET" && path === `clients/${clientId}/portfolio/depth`)
      return json(
        route,
        state.depthStatus === 200
          ? {
              capabilities: [],
              proposals: [],
              terms: [],
              tracking: [],
              relationships: [],
              supports: [],
              memberView: { fields: [], gaps: [] },
              sectorAnchors: [],
              businessUnits: [],
            }
          : { message: "Synthetic denied depth" },
        state.depthStatus,
      );
    if (
      method === "GET" &&
      path === `clients/${clientId}/capabilities/discovery/results`
    )
      return json(
        route,
        state.discoveryStatus === 200
          ? { proposals: state.proposals, hasMore: false, nextCursor: null }
          : { message: "Synthetic denied discovery" },
        state.discoveryStatus,
      );
    if (
      method !== "GET" &&
      path.startsWith(`clients/${clientId}/capabilities/`)
    ) {
      state.proposalWrites.push(path);
      return json(route, { message: "Unexpected stale proposal write" }, 409);
    }
    if (method === "POST" && path === "clients/profile-build/identity-preview")
      return json(route, {
        status: "none",
        entity: null,
        candidates: [],
        duplicate: null,
      });
    if (
      (method === "POST" && path === "business-development/prospects") ||
      (method === "PATCH" &&
        path === `business-development/prospects/${prospectId}`)
    ) {
      const body = route.request().postDataJSON();
      state.firstWrites.push({ method, path, body });
      return json(route, { ...prospect, ...body });
    }
    const profilePath =
      state.profile.subject.kind === "client"
        ? `clients/${clientId}`
        : `business-development/prospects/${prospectId}`;
    if (path === `${profilePath}/profile-build/profile`) {
      if (method === "GET") {
        state.reads++;
        return json(route, state.profile);
      }
      if (method === "PUT") {
        state.profileWrites.push(route.request().postDataJSON());
        if (state.profileWrites.length === 1) {
          state.profile = {
            ...state.profile,
            version: "b".repeat(64),
            fields: { name: "Synthetic current B" },
          };
          return json(
            route,
            { message: "Synthetic profile refusal" },
            state.refusal,
          );
        }
        return json(route, state.profile);
      }
    }
    if (
      method === "POST" &&
      path.startsWith(`${profilePath}/profile-build/facts/`) &&
      path.endsWith("/resolve")
    ) {
      state.factWrites.push({ path, body: route.request().postDataJSON() });
      if (state.factWrites.length === 1) {
        if (state.refusal === 409)
          state.profile = {
            ...state.profile,
            conflicts: state.profile.conflicts.slice(1),
          };
        return json(
          route,
          { message: "Synthetic fact refusal" },
          state.refusal,
        );
      }
      state.profile = { ...state.profile, conflicts: [] };
      return json(route, state.profile);
    }
    state.unexpected.push(`${method} ${path}`);
    return json(route, { message: "Unmocked API blocked" }, 500);
  });
  return {
    get state() {
      return state;
    },
    reset() {
      state = recoveryState();
      return state;
    },
  };
}
