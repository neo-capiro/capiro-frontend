import "./command-recovery-platform";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import {
  resetDeniedProfileReads,
  profileBuildKey,
} from "../src/features/portfolio/profile-build/queries";
import { beforeEach, expect, it, vi } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import { ProfileBuildPanel } from "../src/features/portfolio/profile-build/ProfileBuildPanel";
import { executeReviewAction } from "../src/features/portfolio/profile-build/actions";
import { sendApplication } from "../src/features/portfolio/profile-build/application-api";
import { reviewRecovery } from "../src/features/portfolio/profile-build/review-recovery";
import { applicationAttemptSchema } from "../src/features/portfolio/profile-build/review-contracts";
import { runSchema } from "../src/features/portfolio/profile-build/contracts";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
const state = vi.hoisted(() => ({
  run: undefined as unknown,
  mutationError: null as Error | null,
  researchError: null as Error | null,
  setupError: null as Error | null,
  uncertain: false,
}));
vi.mock(
  "../src/features/portfolio/profile-build/queries",
  async (original) => ({
    ...(await original<Record<string, unknown>>()),
    useProfileBuildAccess: () => ({
      canRead: true,
      canEdit: true,
      identity: {
        data: { user: { id: "reviewer" }, tenant: { id: "tenant" } },
        isPending: false,
        error: null,
        refetch: vi.fn(),
      },
    }),
    useLatestReview: () => ({
      data: state.run,
      isSuccess: true,
      isPending: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }),
    useProfileBuildSetup: () => ({
      data: { website: "https://private.example/" },
      error: state.setupError,
      isSuccess: !state.setupError,
      refetch: vi.fn(),
    }),
  }),
);
vi.mock("../src/features/portfolio/profile-build/useReviewAction", () => ({
  useReviewAction: () => ({
    mutation: { error: state.mutationError, isPending: false, reset: vi.fn() },
    recovery: { error: null, isPending: false, reset: vi.fn() },
    checkingRecovery: false,
    uncertain: state.uncertain,
    recoverable: state.uncertain,
    uncertainReview: state.run,
  }),
}));
vi.mock("../src/features/portfolio/profile-build/useResearchCommands", () => ({
  useResearchCommands: () => ({
    mutation: { isPending: false, reset: vi.fn() },
    recover: { reset: vi.fn() },
    retained: { ready: true, record: null },
    error: state.researchError,
    busy: false,
    blocked: false,
  }),
}));
vi.mock("../src/features/portfolio/profile-build/RunLedger", () => ({
  RunLedger: () => "Private source ledger",
}));
vi.mock("../src/features/portfolio/profile-build/FindingReview", () => ({
  FindingReview: () => "Restricted proposal and source excerpt",
}));
installPlatform();
const subject = {
  kind: "client" as const,
  id: "10000000-0000-4000-8000-000000000001",
};
const runId = "10000000-0000-4000-8000-000000000002";
const findingId = "10000000-0000-4000-8000-000000000003";
const run = runSchema.parse({
  subject,
  id: runId,
  clientId: subject.id,
  clientRevision: "a".repeat(64),
  status: "completed",
  requestedSources: ["lda"],
  sourceStates: {},
  summary: {},
  error: null,
  startedAt: "2026-10-11T08:00:00Z",
  completedAt: "2026-10-11T08:01:00Z",
  findings: [
    {
      id: findingId,
      revision: "b".repeat(64),
      runId,
      clientId: subject.id,
      kind: "profile_field",
      targetKey: "description",
      source: "lda",
      factKind: "fact",
      currentValue: "Old",
      proposedValue: "Restricted proposal",
      evidence: [{ label: "Private source", excerpt: "Sensitive excerpt" }],
      confidence: 0.8,
      status: "pending",
      appliedAt: null,
      createdAt: "2026-10-11T08:01:00Z",
    },
  ],
});
const guard = () => {};
const journal = () =>
  reviewRecovery(subject, { tenantId: "tenant", userId: "reviewer" }, guard);
const html = () =>
  renderToStaticMarkup(createElement(ProfileBuildPanel, { subject }));
const noSources = (value: string) => {
  expect(value).not.toContain("Restricted proposal");
  expect(value).not.toContain("Private source ledger");
  expect(value).not.toContain("Approve ");
  expect(value).not.toContain("Start selected research");
  expect(value).toMatch(/disabled=""[^>]*>Upload/);
};
beforeEach(() => {
  state.run = run;
  state.mutationError = null;
  state.researchError = null;
  state.setupError = null;
  state.uncertain = false;
});
it("hides a cached completed review when approval preflight is denied before any write", async () => {
  expect(html()).toContain("Restricted proposal");
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ message: "Profile access denied" }, { status: 403 }),
  );
  const dispatched = vi.fn();
  try {
    await executeReviewAction(
      createApiClient(fetcher),
      subject,
      run,
      { kind: "apply", findingIds: [findingId] },
      guard,
      new AbortController().signal,
      dispatched,
    );
    throw new Error("Expected denied preflight");
  } catch (error) {
    state.mutationError = error as Error;
  }
  expect(state.mutationError).toMatchObject({ status: 403 });
  expect(dispatched).not.toHaveBeenCalled();
  expect(fetcher.mock.calls).toHaveLength(1);
  expect(fetcher.mock.calls[0]?.[1]?.method).toBe("GET");
  noSources(html());
  expect(await journal().load()).toBeNull();
  expect(state.run).toBe(run);
});
it("retains the exact encrypted command after uncertain503 and later access denial", async () => {
  const attempt = applicationAttemptSchema.parse({
    kind: "apply",
    runId,
    command: {
      requestId: "10000000-0000-4000-8000-000000000004",
      expectedClientRevision: run.clientRevision,
      findings: [{ id: findingId, revision: "b".repeat(64) }],
    },
  });
  await journal().reserve(attempt);
  try {
    await sendApplication(
      createApiClient(async () =>
        Response.json({ message: "Unavailable" }, { status: 503 }),
      ),
      subject,
      attempt,
      guard,
      new AbortController().signal,
      journal().received,
    );
  } catch (error) {
    state.mutationError = error as Error;
  }
  state.uncertain = true;
  expect(state.mutationError).toMatchObject({ status: 503 });
  expect(html()).toContain("Restricted proposal");
  expect(await journal().load()).toEqual({ attempt });
  state.mutationError = new ApiError(403, "Profile access denied");
  noSources(html());
  expect(await journal().load()).toEqual({ attempt });
  for (const records of [db.records, local])
    expect(JSON.stringify([...records.values()])).not.toContain(
      attempt.command.expectedClientRevision,
    );
});
it.each(["research", "setup"])(
  "hides cached source content after %s access denial",
  (source) => {
    if (source === "research")
      state.researchError = new ApiError(403, "Sources denied");
    else state.setupError = new ApiError(403, "Sources denied");
    noSources(html());
  },
);

it("a denied operation clears sibling source reads while503 preserves reads and the journal", async () => {
  const cache = new QueryClient();
  const keys = ["profile", "latest", "documents"].map((kind) => [
    ...profileBuildKey(subject),
    kind,
    "tenant",
    "reviewer",
  ]);
  for (const key of keys)
    cache.setQueryData(key, { source: "Restricted source excerpt" });
  const attempt = applicationAttemptSchema.parse({
    kind: "apply",
    runId,
    command: {
      requestId: "10000000-0000-4000-8000-000000000004",
      expectedClientRevision: run.clientRevision,
      findings: [{ id: findingId, revision: "b".repeat(64) }],
    },
  });
  await journal().reserve(attempt);
  await resetDeniedProfileReads(cache, subject, new ApiError(503, "Uncertain"));
  for (const key of keys)
    expect(cache.getQueryData(key)).toEqual({
      source: "Restricted source excerpt",
    });
  await resetDeniedProfileReads(cache, subject, new ApiError(403, "Denied"));
  for (const key of keys) expect(cache.getQueryData(key)).toBeUndefined();
  expect(await journal().load()).toEqual({ attempt });
  cache.clear();
});
