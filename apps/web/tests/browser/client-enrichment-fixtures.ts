import type { Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
import {
  runSchema,
  type FillRun,
} from "../../src/features/portfolio/client-profile/enrichment/contracts";
import {
  applicationResultSchema,
  type ApplicationResult,
} from "../../src/features/portfolio/client-profile/enrichment/review-contracts";
export const runId = "e0000000-0000-4000-8000-000000000001";
export const findingId = "e0000000-0000-4000-8000-000000000002";
export const advocacyId = "e0000000-0000-4000-8000-000000000003";
export const matterId = "e0000000-0000-4000-8000-000000000004";
export function syntheticRun(): FillRun {
  const finding = {
    id: findingId,
    revision: "b".repeat(64),
    runId,
    clientId,
    kind: "profile_field",
    targetKey: "description",
    source: "public_web",
    factKind: "fact",
    currentValue: "Saved company description",
    proposedValue: "Synthetic reviewed company description",
    evidence: [
      {
        label: "Synthetic company source",
        source: "Company website",
        url: "https://example.test/source",
        excerpt: "Synthetic evidence for component qualification.",
      },
    ],
    confidence: 0.85,
    status: "pending",
    appliedAt: null,
    createdAt: "2026-10-11T07:00:00Z",
  };
  return runSchema.parse({
    id: runId,
    clientRevision: "a".repeat(64),
    clientId,
    status: "completed",
    stage: "review_ready",
    requestedSources: ["public_web", "lda"],
    sourceStates: {
      public_web: { status: "completed", count: 1 },
      lda: { status: "completed", count: 1 },
    },
    summary: {},
    workflowVersion: 2,
    attachmentIds: [],
    selectedLdaIds: [12],
    setup: {
      website: "https://example.test",
      sources: ["public_web", "lda"],
      attachmentIds: [],
      selectedLdaIds: [12],
    },
    error: null,
    startedAt: "2026-10-11T07:00:00Z",
    completedAt: "2026-10-11T07:01:00Z",
    tasks: [
      {
        id: "e0000000-0000-4000-8000-000000000005",
        runId,
        clientId,
        taskType: "public_web",
        taskKey: "public_web",
        status: "completed",
        attempt: 1,
        maxAttempts: 3,
        errorCode: null,
        errorMessage: null,
        outputSummary: { count: 1 },
        nextAttemptAt: null,
      },
    ],
    findings: [
      finding,
      {
        ...finding,
        id: advocacyId,
        kind: "advocacy_record",
        targetKey: "Synthetic advocacy matter",
        source: "advocacy_history",
        currentValue: null,
        proposedValue: {
          title: "Synthetic advocacy evidence",
          recordType: "lobbying",
          activityDate: "2026-08-01",
          sourceType: "lda",
          sourceId: "synthetic-filing",
          externalKey: "lda:synthetic",
          summary: "Synthetic saved filing evidence",
        },
      },
      {
        ...finding,
        id: "e0000000-0000-4000-8000-000000000006",
        kind: "profile_completion",
        targetKey: "Profile completion",
        status: "informational",
        currentValue: null,
        proposedValue: { missing: ["facilities"], score: 70 },
      },
      {
        ...finding,
        id: "e0000000-0000-4000-8000-000000000007",
        targetKey: "Ignored synthetic finding",
        status: "rejected",
        rejectionReason: "Duplicate evidence",
      },
    ],
  });
}
export async function installEnrichment(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    run: syntheticRun() as FillRun | null,
    posts: [] as { path: string; body: Record<string, unknown> }[],
    mode: "normal" as
      | "normal"
      | "lost"
      | "partial"
      | "wrong-client"
      | "wrong-assignment"
      | "drift"
      | "load-fail",
    runGate: null as Promise<void> | null,
    runGets: 0,
    latestGets: 0,
    role: "user_admin",
    receipts: new Map<string, ApplicationResult>(),
    starts: new Map<string, FillRun>(),
    dropStartOnce: false,
  };
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: {
        id: "90000000-0000-4000-8000-000000000002",
        email: "test@example.test",
      },
      tenant: { id: "90000000-0000-4000-8000-000000000001", name: "UI tests" },
      role: state.role,
    }),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/advocacy-matters`,
    (route) =>
      json(route, [
        {
          id: matterId,
          title: "Synthetic saved matter",
          matterType: "legislative",
          status: "active",
          summary: null,
          openedAt: null,
          lastActivityAt: null,
          recordCount: 0,
          outcomeCount: 0,
          linkCount: 0,
        },
      ]),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/fill-with-meri/**`,
    async (route) => {
      const path =
        new URL(route.request().url()).pathname.split("/fill-with-meri/")[1] ??
        "";
      if (route.request().method() === "GET") {
        if (path === "latest") state.latestGets++;
        if (path === "setup")
          return json(route, {
            clientId,
            clientName: "Test Aerospace",
            website: "https://example.test",
            selectedIdentities: [
              {
                id: 12,
                name: "Synthetic imported identity",
                selected: true,
                origin: "imported",
              },
            ],
            suggestedIdentities: [
              {
                id: 73,
                name: "Synthetic suggested identity",
                selected: false,
                origin: "suggested",
              },
            ],
            taskPreview: ["Public web", "LDA"],
          });
        if (state.mode === "load-fail")
          return json(route, { message: "Synthetic unavailable review" }, 503);
        if (path === `runs/${runId}`) {
          state.runGets++;
          if (state.runGate) await state.runGate;
        }
        const run = structuredClone(state.run);
        if (run && state.mode === "wrong-client") {
          run.clientId = runId;
          run.findings = run.findings.map((f) => ({ ...f, clientId: runId }));
          run.tasks = run.tasks?.map((t) => ({ ...t, clientId: runId }));
        }
        if (run && state.mode === "drift" && path.startsWith("runs/"))
          run.findings[0]!.proposedValue = "Changed after review";
        if (run && path.endsWith("/review"))
          return json(route, {
            clientId: run.clientId,
            runId: run.id,
            clientRevision: run.clientRevision,
            findings: run.findings,
          });
        return json(route, run).catch(() => {});
      }
      const body = route.request().postDataJSON() as Record<string, unknown>;
      state.posts.push({ path, body });
      if (path === "runs") {
        const id = String(body.requestId);
        const previous = state.starts.get(id);
        if (previous) return json(route, previous);
        state.run = runSchema.parse({
          ...syntheticRun(),
          id,
          status: "running",
          stage: "research",
          completedAt: null,
          requestedSources: body.sources,
          attachmentIds: body.attachmentIds,
          selectedLdaIds: [12, ...(body.ldaClientIds as number[])],
          setup: {
            website: body.website,
            sources: body.sources,
            attachmentIds: body.attachmentIds,
          },
          tasks: [],
          findings: [],
        });
        state.starts.set(id, structuredClone(state.run));
        if (state.dropStartOnce) {
          state.dropStartOnce = false;
          return route.abort("failed");
        }
        return json(route, state.run);
      }
      if (!state.run) return json(route, { message: "Run unavailable" }, 404);
      if (path.endsWith("/apply") || path.endsWith("/assign-matter")) {
        const requestId = String(body.requestId);
        const saved = state.receipts.get(requestId);
        if (saved) return json(route, { ...saved, replayed: true });
        const result: ApplicationResult = {
          requestId,
          status: "completed",
          applied: [],
          alreadyApplied: [],
          errors: [],
          replayed: false,
        };
        for (const selected of body.findings as {
          id: string;
          revision: string;
        }[]) {
          const finding = state.run.findings.find((f) => f.id === selected.id);
          if (
            !finding ||
            (state.mode === "partial" && finding.id === advocacyId)
          ) {
            result.errors.push({
              findingId: selected.id,
              message: "The source evidence could not be applied.",
            });
          } else {
            finding.status = "accepted";
            result.applied.push(finding.id);
          }
        }
        result.status = result.errors.length
          ? result.applied.length
            ? "partial"
            : "refused"
          : "completed";
        state.receipts.set(requestId, applicationResultSchema.parse(result));
        if (state.mode === "lost") return route.abort("failed");
        return json(
          route,
          state.mode === "wrong-assignment"
            ? { ...result, requestId: runId }
            : result,
        );
      }
      if (path.endsWith("/cancel")) state.run.status = "cancelled";
      if (path.endsWith("/reject")) {
        const f = state.run.findings.find((f) => path.includes(f.id));
        if (f) f.status = "rejected";
      }
      if (path.endsWith("/restore")) {
        const f = state.run.findings.find((f) => path.includes(f.id));
        if (f) f.status = "pending";
      }
      if (state.mode === "lost") return route.abort("failed");
      return json(
        route,
        path.endsWith("/reject") || path.endsWith("/restore")
          ? { ok: true }
          : state.run,
      );
    },
  );
  return { state, unexpected };
}
