import { describe, expect, it, vi } from "vitest";
import { proxyOwnerMemoryReview } from "../src/features/meri/memory-review/owner-review-proxy.server";
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
const listRequest = () => new Request(`${origin}/api/memory/owner/candidates`);
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

describe("Core-owned personal memory review proxy", () => {
  it("requires opt-in and does not convert a disabled connection into an empty list", async () => {
    const token = vi.fn();
    const fetcher = vi.fn();
    const response = await proxyOwnerMemoryReview(
      listRequest(),
      { kind: "list" },
      { ...env, MERI_MEMORY_OWNER_REVIEW_ENABLED: "false" },
      token,
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "MEMORY_REVIEW_UNAVAILABLE", outcome: "NOT_DISPATCHED" },
    });
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
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
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reads all owner pending candidates, including Core and Meri additions, through one Core list", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        candidates: [
          candidate,
          {
            ...candidate,
            id: "22222222-2222-4222-8222-222222222222",
            sourceType: "settings",
          },
        ],
      }),
    );
    const response = await proxyOwnerMemoryReview(
      listRequest(),
      { kind: "list" },
      env,
      async () => "native-clerk-session",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      candidates: [candidate, { sourceType: "settings" }],
    });
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://core.synthetic.invalid/api/memory/candidates/mine",
    );
    const options = fetcher.mock.calls[0]![1]!;
    expect(options.method).toBe("GET");
    expect(new Headers(options.headers).get("authorization")).toBe(
      "Bearer native-clerk-session",
    );
    expect(new Headers(options.headers).has("cookie")).toBe(false);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps Core outage and malformed data distinct from a confirmed empty inbox", async () => {
    for (const remote of [
      Response.json({ message: "Core unavailable" }, { status: 503 }),
      Response.json({ candidates: [{ id, value: "missing fields" }] }),
    ]) {
      const response = await proxyOwnerMemoryReview(
        listRequest(),
        { kind: "list" },
        env,
        async () => "native",
        async () => remote,
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toHaveProperty("error");
    }
    expect(receiveOwnerCandidates({ candidates: [] })).toEqual([]);
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

  it("uses a separate validated preview Core target when preview mode is active", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ candidates: [] }),
    );
    const preview = {
      ...env,
      CAPIRO_PREVIEW_READ_ONLY: "true",
      CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL:
        "https://core-preview.synthetic.invalid/api",
    };
    const response = await proxyOwnerMemoryReview(
      listRequest(),
      { kind: "list" },
      preview,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://core-preview.synthetic.invalid/api/memory/candidates/mine",
    );
  });
});
