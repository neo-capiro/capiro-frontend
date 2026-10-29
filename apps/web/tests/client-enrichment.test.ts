import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  assertReviewAccess,
  executeReviewAction,
} from "../src/features/portfolio/client-profile/enrichment/actions";
import {
  canSelectFinding,
  runSchema,
  safeEvidenceUrl,
} from "../src/features/portfolio/client-profile/enrichment/contracts";
import {
  loadRun,
  latestReviewKey,
  setupKey,
} from "../src/features/portfolio/client-profile/enrichment/queries";
const clientId = "10000000-0000-4000-8000-000000000001";
const runId = "10000000-0000-4000-8000-000000000002";
const findingId = "10000000-0000-4000-8000-000000000003";
const raw = {
  id: runId,
  clientId,
  clientRevision: "a".repeat(64),
  status: "completed",
  requestedSources: ["lda"],
  sourceStates: { lda: { status: "completed", count: 1 } },
  summary: {},
  error: null,
  startedAt: "2026-10-11T08:00:00Z",
  completedAt: "2026-10-11T08:01:00Z",
  findings: [
    {
      id: findingId,
      revision: "b".repeat(64),
      runId,
      clientId,
      kind: "profile_field",
      targetKey: "description",
      source: "lda",
      factKind: "fact",
      currentValue: "Old",
      proposedValue: "Proposed",
      evidence: [{ label: "Filing", url: "https://example.test/filing" }],
      confidence: 0.8,
      status: "pending",
      appliedAt: null,
      createdAt: "2026-10-11T08:01:00Z",
    },
  ],
};
const snapshot = (value = raw) => ({
  clientId: value.clientId,
  runId: value.id,
  clientRevision: value.clientRevision,
  findings: value.findings,
});
const review = () => runSchema.parse(raw);
const response = (value: unknown) =>
  new Response(JSON.stringify(value), { status: 200 });
describe("enrichment contracts and scoped actions", () => {
  it("rejects a finding bound to another client or run", () => {
    expect(
      runSchema.safeParse({
        ...raw,
        findings: [{ ...raw.findings[0], clientId: runId }],
      }).success,
    ).toBe(false);
    expect(
      runSchema.safeParse({
        ...raw,
        findings: [{ ...raw.findings[0], runId: clientId }],
      }).success,
    ).toBe(false);
    expect(
      runSchema.safeParse({
        ...raw,
        findings: [raw.findings[0], raw.findings[0]],
      }).success,
    ).toBe(false);
  });
  it("retains JSON financial/date values without coercion or calculations", () => {
    const run = runSchema.parse({
      ...raw,
      findings: [
        {
          ...raw.findings[0],
          proposedValue: {
            amount: "123.4500",
            date: "2026-10-11",
            items: [true, null, 2],
          },
        },
      ],
    });
    expect(run.findings[0]?.proposedValue).toEqual({
      amount: "123.4500",
      date: "2026-10-11",
      items: [true, null, 2],
    });
  });
  it("only selects known pending applyable kinds", () => {
    const f = review().findings[0]!;
    expect(canSelectFinding(f)).toBe(true);
    expect(canSelectFinding({ ...f, kind: "district_nexus" })).toBe(false);
    for (const kind of [
      "lda_history",
      "program_element",
      "bill_recommendation",
    ])
      expect(canSelectFinding({ ...f, kind })).toBe(false);
    expect(canSelectFinding({ ...f, kind: "future_kind" })).toBe(false);
    expect(canSelectFinding({ ...f, status: "informational" })).toBe(false);
  });
  it("permits safe source URLs only", () => {
    expect(safeEvidenceUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      safeEvidenceUrl("https://secret:token@example.test"),
    ).toBeUndefined();
    expect(safeEvidenceUrl("https://example.test/filing")).toBe(
      "https://example.test/filing",
    );
  });
  it("validates run receipt client and requested run identity", async () => {
    const api = createApiClient(
      vi.fn().mockResolvedValue(
        response({
          ...raw,
          clientId: runId,
          findings: raw.findings.map((f) => ({ ...f, clientId: runId })),
        }),
      ),
    );
    await expect(loadRun(api, clientId, runId)).rejects.toThrow(
      "different client",
    );
  });
  it("freshly rechecks changed values and makes zero writes", async () => {
    const changed = {
      ...raw,
      findings: [{ ...raw.findings[0]!, proposedValue: "Changed" }],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(changed))
      .mockResolvedValueOnce(response(snapshot(changed)));
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "apply", findingIds: [findingId] },
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("Findings changed");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
      true,
    );
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("GET");
  });
  it("aborts unmounted preflight before POST", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return response(raw);
    });
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "apply", findingIds: [findingId] },
        () => {},
        controller.signal,
        () => {},
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("uses the original review revisions and returns the exact application result", async () => {
    const fetcher = vi.fn(
      async (url: RequestInfo | URL, options?: RequestInit) => {
        if (options?.method === "POST") {
          const command = JSON.parse(String(options.body));
          return response({
            requestId: command.requestId,
            status: "refused",
            applied: [],
            alreadyApplied: [],
            errors: [{ findingId, message: "Client changed" }],
            replayed: false,
          });
        }
        return response(String(url).endsWith("/review") ? snapshot() : raw);
      },
    );
    const dispatched = vi.fn();
    const result = await executeReviewAction(
      createApiClient(fetcher),
      clientId,
      review(),
      { kind: "apply", findingIds: [findingId] },
      () => {},
      new AbortController().signal,
      dispatched,
    );
    expect(result.application?.status).toBe("refused");
    expect(result.findings[0]?.status).toBe("pending");
    expect(dispatched).toHaveBeenCalledOnce();
    const post = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      requestId: expect.any(String),
      expectedClientRevision: raw.clientRevision,
      findings: [{ id: findingId, revision: "b".repeat(64) }],
    });
  });
  it("reject/restore acknowledgments require ok:true followed by scoped readback", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(snapshot()))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(
        response({
          ...raw,
          findings: [{ ...raw.findings[0], status: "rejected" }],
        }),
      )
      .mockResolvedValueOnce(
        response(
          snapshot({
            ...raw,
            findings: [{ ...raw.findings[0]!, status: "rejected" }],
          }),
        ),
      );
    const result = await executeReviewAction(
      createApiClient(fetcher),
      clientId,
      review(),
      { kind: "reject", findingId, reason: " Wrong source " },
      () => {},
      new AbortController().signal,
      () => {},
    );
    expect(result.findings[0]?.status).toBe("rejected");
    expect(JSON.parse(fetcher.mock.calls[2]?.[1]?.body ?? "{}")).toEqual({
      reason: "Wrong source",
    });
  });
  it("never automatically repeats a failed dispatch", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(snapshot()))
      .mockRejectedValueOnce(new Error("lost response"));
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "apply", findingIds: [findingId] },
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("lost response");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("fails closed for stale, invalidated, role-changed and different actor cache", () => {
    const cache = new QueryClient();
    const actor = { userId: "reviewer", tenantId: "tenant" };
    cache.setQueryData(["identity"], {
      user: { id: actor.userId, email: null },
      tenant: { id: actor.tenantId, name: "Test" },
      role: "user_admin",
    });
    expect(() => assertReviewAccess(cache, actor, true)).not.toThrow();
    expect(() =>
      assertReviewAccess(cache, { ...actor, userId: "other" }, true),
    ).toThrow();
    void cache.invalidateQueries({ queryKey: ["identity"] });
    expect(() => assertReviewAccess(cache, actor, true)).toThrow();
    cache.setQueryData(["identity"], {
      user: { id: actor.userId, email: null },
      tenant: { id: actor.tenantId, name: "Test" },
      role: "standard_user",
    });
    expect(() => assertReviewAccess(cache, actor, true)).toThrow();
    expect(() => assertReviewAccess(cache, actor, false)).not.toThrow();
  });
  it("keeps latest/setup cache data separate across users and tenants", () => {
    const cache = new QueryClient();
    const first = { tenantId: "tenant-a", userId: "user-a" };
    const second = { tenantId: "tenant-a", userId: "user-b" };
    const other = { tenantId: "tenant-b", userId: "user-a" };
    cache.setQueryData(latestReviewKey(clientId, first), review());
    cache.setQueryData(setupKey(clientId, first), { clientId });
    expect(
      cache.getQueryData(latestReviewKey(clientId, second)),
    ).toBeUndefined();
    expect(
      cache.getQueryData(latestReviewKey(clientId, other)),
    ).toBeUndefined();
    expect(cache.getQueryData(setupKey(clientId, second))).toBeUndefined();
  });
  it("refuses an actor switch while preflight is in flight with zero POST", async () => {
    const cache = new QueryClient();
    const actor = { tenantId: "tenant", userId: "first" };
    cache.setQueryData(["identity"], {
      user: { id: "first", email: null },
      tenant: { id: "tenant", name: "Test" },
      role: "user_admin",
    });
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      cache.setQueryData(["identity"], {
        user: { id: "second", email: null },
        tenant: { id: "tenant", name: "Test" },
        role: "user_admin",
      });
      return response(String(url).endsWith("/review") ? snapshot() : raw);
    });
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "apply", findingIds: [findingId] },
        () => assertReviewAccess(cache, actor, true),
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("current session");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("refuses identity state carrying a current error even with stale success data", () => {
    const cache = new QueryClient();
    const actor = { tenantId: "tenant", userId: "first" };
    cache.setQueryData(["identity"], {
      user: { id: "first", email: null },
      tenant: { id: "tenant", name: "Test" },
      role: "user_admin",
    });
    cache
      .getQueryCache()
      .find({ queryKey: ["identity"] })
      ?.setState({
        status: "success",
        error: new Error("Identity refresh failed"),
      });
    expect(() => assertReviewAccess(cache, actor, true)).toThrow(
      "current session",
    );
  });
  it("rejects cancellation receipt which still reports running", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      response(
        String(url).endsWith("/review")
          ? snapshot()
          : { ...raw, status: "running" },
      ),
    );
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "cancel" },
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("Cancellation was not confirmed");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("rejects ignore acknowledgment without a rejected saved finding", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(snapshot()))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(snapshot()));
    await expect(
      executeReviewAction(
        createApiClient(fetcher),
        clientId,
        review(),
        { kind: "reject", findingId, reason: "" },
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("did not confirm");
  });
});
