import { describe, expect, it, vi } from "vitest";
import { proxyOwnerMemoryReview } from "../src/features/meri/memory-review/owner-review-proxy.server";
import { receiveOwnerCorrectionPage } from "../src/features/meri/memory-review/owner-correction";
import {
  ownerCandidateTitle,
  receiveOwnerCandidates,
} from "../src/features/meri/memory-review/owner-review";

const origin = "https://frontend.synthetic.invalid";
const id = "11111111-1111-4111-8111-111111111111";
const env = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  CORE_API_BASE_URL: "https://core.synthetic.invalid/api",
  CAPIRO_REQUEST_ORIGIN: origin,
  MERI_MEMORY_OWNER_REVIEW_ENABLED: "true",
};
const candidate = {
  id,
  kind: "addition",
  key: "Preferred brief",
  value: "Use concise source references.",
  sourceType: "meri",
  createdAt: "2026-10-18T12:00:00.000Z",
};
const decisionRequest = (body: unknown = { decision: "approve" }) =>
  new Request(`${origin}/api/memory/owner/candidates/${id}/decision`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Authorization: "Bearer browser-token-must-not-forward",
      Cookie: "browser-cookie-must-not-forward=1",
    },
    body: JSON.stringify(body),
  });
const versionRequest = (body: unknown) =>
  new Request(`${origin}/api/memory/owner/candidates/${id}/version-decision`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const correctionRequest = (body: unknown) =>
  new Request(`${origin}/api/memory/owner/items/${id}/corrections`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Authorization: "Bearer browser-token-must-not-forward",
      Cookie: "browser-cookie-must-not-forward=1",
    },
    body: JSON.stringify(body),
  });
const updatedAt = "2026-10-18T12:34:56.123456Z";
const item = {
  id,
  title: "Personal memory title",
  value: "Current canonical text.",
  scope: "user_private",
  clientId: null,
  updatedAt,
};
const itemsRequest = (cursor?: string) =>
  new Request(
    `${origin}/api/memory/owner/items?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
  );

describe("Core-owned personal memory review proxy", () => {
  it("requires opt-in before any owner memory write", async () => {
    const token = vi.fn();
    const fetcher = vi.fn();
    const decision = await proxyOwnerMemoryReview(
      decisionRequest(),
      { kind: "decision", id },
      { ...env, MERI_MEMORY_OWNER_REVIEW_ENABLED: "false" },
      token,
      fetcher,
    );
    expect(decision.status).toBe(503);
    expect(await decision.json()).toMatchObject({
      error: { outcome: "NOT_DISPATCHED" },
    });
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not display Core's synthetic key as an unkeyed Meri proposal title", () => {
    const unkeyed = { ...candidate, key: `meri:${id}` };
    const [received] = receiveOwnerCandidates({ candidates: [unkeyed] });
    expect(ownerCandidateTitle(received!)).toBe("Unkeyed memory proposal");
    expect(received!.key).toBe(unkeyed.key);
    expect(ownerCandidateTitle({ ...received!, key: "Preferred brief" })).toBe(
      "Preferred brief",
    );
  });

  it("validates decision path, origin and closed body before acquiring a token", async () => {
    const token = vi.fn();
    const fetcher = vi.fn();
    const cases = [
      [decisionRequest({ decision: "approve", tenantId: "spoofed" }), id],
      [decisionRequest({ decision: "maybe" }), id],
      [
        new Request(`${origin}/api/memory/owner/candidates/${id}/decision`, {
          method: "POST",
          headers: {
            Origin: "https://foreign.invalid",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision: "approve" }),
        }),
        id,
      ],
      [decisionRequest(), "not-a-uuid"],
    ] as const;
    for (const [request, candidateId] of cases) {
      const response = await proxyOwnerMemoryReview(
        request,
        { kind: "decision", id: candidateId },
        env,
        token,
        fetcher,
      );
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards only the native bearer, and preserves the Core decision result", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        status: "approved",
        memoryId: "33333333-3333-4333-8333-333333333333",
      }),
    );
    const response = await proxyOwnerMemoryReview(
      decisionRequest(),
      { kind: "decision", id },
      env,
      async () => "native-clerk-session",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved" });
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/candidates/${id}/owner-decision`,
    );
    const options = fetcher.mock.calls[0]![1]!;
    expect(options.body).toBe('{"decision":"approve"}');
    const headers = new Headers(options.headers);
    expect(headers.get("authorization")).toBe("Bearer native-clerk-session");
    expect(headers.has("cookie")).toBe(false);
    expect(options.credentials).toBe("omit");
  });

  it("never retries a dispatched decision with uncertain transport outcome", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("connection reset after dispatch");
    });
    const response = await proxyOwnerMemoryReview(
      decisionRequest(),
      { kind: "decision", id },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "MEMORY_DECISION_UNCERTAIN", outcome: "UNKNOWN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("routes version approvals to Core and preserves an unresolved conflict outcome", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true, candidateId: id, outcome: "conflict" }),
    );
    const response = await proxyOwnerMemoryReview(
      versionRequest({ decision: "approve" }),
      { kind: "version-decision", id },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "conflict" });
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/version-candidates/${id}/approve`,
    );
    expect(fetcher.mock.calls[0]![1]!.body).toBeUndefined();
  });

  it("requires a version rejection reason and forwards only that reason to Core", async () => {
    const token = vi.fn(async () => "native");
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ok: true, candidateId: id, outcome: "rejected" }),
    );
    for (const body of [
      { decision: "reject" },
      { decision: "reject", reason: "  " },
      { decision: "reject", reason: "valid", ownerId: "spoof" },
    ]) {
      const response = await proxyOwnerMemoryReview(
        versionRequest(body),
        { kind: "version-decision", id },
        env,
        token,
        fetcher,
      );
      expect(response.status).toBe(400);
    }
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    const response = await proxyOwnerMemoryReview(
      versionRequest({ decision: "reject", reason: "  no longer accurate  " }),
      { kind: "version-decision", id },
      env,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "rejected" });
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/version-candidates/${id}/reject`,
    );
    expect(fetcher.mock.calls[0]![1]!.body).toBe(
      '{"reason":"no longer accurate"}',
    );
  });

  it("holds an uncertain version outcome without retrying", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("connection reset after dispatch");
    });
    const response = await proxyOwnerMemoryReview(
      versionRequest({ decision: "approve" }),
      { kind: "version-decision", id },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "MEMORY_DECISION_UNCERTAIN", outcome: "UNKNOWN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("submits an exact canonical correction to the review-only Core route", async () => {
    const candidateId = "33333333-3333-4333-8333-333333333333";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        status: "pending_review",
        candidateId,
        activeItemUnchanged: true,
      }),
    );
    const response = await proxyOwnerMemoryReview(
      correctionRequest({
        newContent: "  Correct current text.  ",
        expectedUpdatedAt: updatedAt,
      }),
      { kind: "correction", id },
      env,
      async () => "native-clerk-session",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "pending_review",
      candidateId,
      activeItemUnchanged: true,
    });
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/items/${id}/review-correction`,
    );
    const options = fetcher.mock.calls[0]![1]!;
    expect(options.body).toBe(
      `{"newContent":"Correct current text.","expectedUpdatedAt":"${updatedAt}"}`,
    );
    expect(new Headers(options.headers).get("authorization")).toBe(
      "Bearer native-clerk-session",
    );
    expect(new Headers(options.headers).has("cookie")).toBe(false);
  });

  it("refuses correction body spoofing before token acquisition", async () => {
    const token = vi.fn();
    const fetcher = vi.fn();
    for (const body of [
      { newContent: "", expectedUpdatedAt: updatedAt },
      {
        newContent: "valid",
        expectedUpdatedAt: updatedAt,
        tenantId: "spoofed",
      },
      { newContent: "x".repeat(8_001), expectedUpdatedAt: updatedAt },
      { newContent: "valid", expectedUpdatedAt: updatedAt.slice(0, -2) },
    ]) {
      const response = await proxyOwnerMemoryReview(
        correctionRequest(body),
        { kind: "correction", id },
        env,
        token,
        fetcher,
      );
      expect(response.status).toBe(400);
    }
    const foreign = new Request(
      correctionRequest({ newContent: "valid", expectedUpdatedAt: updatedAt }),
      {
        headers: {
          Origin: "https://foreign.invalid",
          "Content-Type": "application/json",
        },
      },
    );
    const response = await proxyOwnerMemoryReview(
      foreign,
      { kind: "correction", id },
      env,
      token,
      fetcher,
    );
    expect(response.status).toBe(403);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("holds an incompatible or lost correction outcome instead of claiming review", async () => {
    for (const remote of [
      Response.json({ found: true, status: "activated", memoryItemId: id }),
      Response.json({
        status: "pending_review",
        candidateId: id,
        activeItemUnchanged: false,
      }),
    ]) {
      const fetcher = vi.fn<typeof fetch>(async () => remote);
      const response = await proxyOwnerMemoryReview(
        correctionRequest({
          newContent: "Corrected text",
          expectedUpdatedAt: updatedAt,
        }),
        { kind: "correction", id },
        env,
        async () => "native",
        fetcher,
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { outcome: "UNKNOWN" },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("connection reset after dispatch");
    });
    const response = await proxyOwnerMemoryReview(
      correctionRequest({
        newContent: "Corrected text",
        expectedUpdatedAt: updatedAt,
      }),
      { kind: "correction", id },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { outcome: "UNKNOWN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "empty", items: [], nextCursor: null },
    { name: "populated", items: [item], nextCursor: "opaque_page_2" },
    {
      name: "canonical presentation",
      items: [
        {
          ...item,
          displayTitle: "Learning feedback",
          contentStatus: "metadata_only",
          contentLimitation:
            "This record contains capture metadata, not substantive memory content.",
        },
      ],
      nextCursor: null,
    },
  ])("delivers a $name items page to the browser decoder", async (page) => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: page.items.map((entry) => ({ ...entry, internalOnly: true })),
        nextCursor: page.nextCursor,
        internalOnly: true,
      }),
    );
    const response = await proxyOwnerMemoryReview(
      itemsRequest(),
      { kind: "items" },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const wire = await response.json();
    expect(receiveOwnerCorrectionPage(wire)).toEqual({
      ownerReadsVersion: 1,
      items: page.items.map((entry) => ({
        ...entry,
        reference: { kind: "item", id: entry.id },
      })),
      nextCursor: page.nextCursor,
    });
    expect(wire).toEqual({
      schemaVersion: 1,
      ownerReadsVersion: 1,
      items: page.items.map((entry) => ({
        ...entry,
        reference: { kind: "item", id: entry.id },
      })),
      nextCursor: page.nextCursor,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      new Headers(fetcher.mock.calls[0]![1]!.headers).get("authorization"),
    ).toBe("Bearer native");
  });

  it("pages only caller-owned canonical personal items from Core", async () => {
    const nextCursor = "opaque_page_2";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: [item],
        nextCursor,
      }),
    );
    const response = await proxyOwnerMemoryReview(
      itemsRequest(),
      { kind: "items" },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      ownerReadsVersion: 1,
      items: [{ ...item, reference: { kind: "item", id: item.id } }],
      nextCursor,
    });
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://core.synthetic.invalid/api/memory/owner/items?limit=25",
    );
    const second = await proxyOwnerMemoryReview(
      itemsRequest(nextCursor),
      { kind: "items" },
      env,
      async () => "native",
      fetcher,
    );
    expect(second.status).toBe(200);
    expect(fetcher.mock.calls[1]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/owner/items?limit=25&cursor=${nextCursor}`,
    );
  });

  it("does not present malformed or shared item pages as an empty personal picker", async () => {
    for (const page of [
      {
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: [{ ...item, scope: "firm_shared" }],
        nextCursor: null,
      },
      {
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: [{ ...item, updatedAt: "2026-10-18T12:34:56.123Z" }],
        nextCursor: null,
      },
      {
        schemaVersion: 1,
        ownerReadsVersion: 1,
        items: [],
        nextCursor: "not-exhausted",
      },
      { schemaVersion: 2, items: [], nextCursor: null },
    ]) {
      const response = await proxyOwnerMemoryReview(
        itemsRequest(),
        { kind: "items" },
        env,
        async () => "native",
        async () => Response.json(page),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toHaveProperty("error");
    }
    const token = vi.fn();
    const fetcher = vi.fn();
    const invalid = await proxyOwnerMemoryReview(
      new Request(`${origin}/api/memory/owner/items?limit=25&clientId=${id}`),
      { kind: "items" },
      env,
      token,
      fetcher,
    );
    expect(invalid.status).toBe(400);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("holds the separate preview Core target until the listener-compatible source is pinned", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const preview = {
      ...env,
      CAPIRO_PREVIEW_READ_ONLY: "true",
      CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL:
        "https://core-preview.synthetic.invalid/api",
      CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE:
        "96065aea7076fde961071ebce402b6b2a31ee60c",
      CAPIRO_PREVIEW_MEMORY_OWNER_ROUTES_ENABLED: "true",
      CAPIRO_EXISTING_APP_URL: origin,
    };
    const response = await proxyOwnerMemoryReview(
      itemsRequest(),
      { kind: "items" },
      preview,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
