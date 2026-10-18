import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_PAGE } from "../src/app/api/memory/owner/candidates/route";
import { GET as GET_STATUS } from "../src/app/api/memory/owner/candidates/[id]/status/route";
import { proxyOwnerMemoryInbox } from "../src/features/meri/memory-review/owner-inbox-proxy.server";
import {
  receiveOwnerCandidatePage,
  receiveOwnerCandidateStatus,
} from "../src/features/meri/memory-review/owner-review";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);

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
  value: "Use concise references.",
  sourceType: "meri",
  createdAt: "2026-10-18T12:00:00.000Z",
};
const page = {
  version: 1,
  candidates: [candidate],
  nextCursor: "opaque+cursor=",
};
const status = {
  version: 1,
  id,
  status: "approved",
  terminal: true,
  decidedAt: "2026-10-18T12:05:00.000Z",
  committedMemoryId: null,
  committedMemoryItemId: "22222222-2222-4222-8222-222222222222",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Core owner inbox pagination and status receipts", () => {
  it("forwards a bounded opaque cursor with only the native session bearer", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(page));
    const response = await proxyOwnerMemoryInbox(
      new Request(
        `${origin}/api/memory/owner/candidates?limit=50&cursor=opaque%2Bcursor%3D`,
        {
          headers: {
            Cookie: "browser=forbidden",
            Authorization: "Bearer spoof",
          },
        },
      ),
      { kind: "page" },
      env,
      async () => "native-session",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(page);
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://core.synthetic.invalid/api/memory/candidates/mine?limit=50&cursor=opaque%2Bcursor%3D",
    );
    const options = fetcher.mock.calls[0]![1]!;
    const headers = new Headers(options.headers);
    expect(headers.get("authorization")).toBe("Bearer native-session");
    expect(headers.has("cookie")).toBe(false);
    expect(options.credentials).toBe("omit");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects unknown and duplicate page parameters before token acquisition", async () => {
    const getToken = vi.fn();
    const fetcher = vi.fn();
    for (const query of [
      "?limit=101",
      "?limit=0",
      "?limit=50&limit=50",
      "?cursor=",
      "?tenantId=spoofed",
    ]) {
      const response = await proxyOwnerMemoryInbox(
        new Request(`${origin}/api/memory/owner/candidates${query}`),
        { kind: "page" },
        env,
        getToken,
        fetcher,
      );
      expect(response.status).toBe(400);
    }
    expect(getToken).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps a failed or malformed Core page distinct from an empty inbox", async () => {
    expect(
      receiveOwnerCandidatePage({
        version: 1,
        candidates: [],
        nextCursor: null,
      }),
    ).toEqual({ version: 1, candidates: [], nextCursor: null });
    for (const remote of [
      Response.json({ candidates: [] }),
      Response.json({ ...page, nextCursor: 3 }),
      Response.json({ error: "down" }, { status: 503 }),
    ]) {
      const response = await proxyOwnerMemoryInbox(
        new Request(`${origin}/api/memory/owner/candidates`),
        { kind: "page" },
        env,
        async () => "native",
        async () => remote,
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toHaveProperty("error");
    }
  });

  it("accepts only an exact, internally consistent owner status receipt", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(status));
    const response = await proxyOwnerMemoryInbox(
      new Request(`${origin}/api/memory/owner/candidates/${id}/status`),
      { kind: "status", id },
      env,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(status);
    expect(fetcher.mock.calls[0]![0]).toBe(
      `https://core.synthetic.invalid/api/memory/candidates/mine/${id}/status`,
    );
    expect(() =>
      receiveOwnerCandidateStatus(
        { ...status, id: "33333333-3333-4333-8333-333333333333" },
        id,
      ),
    ).toThrow();
    expect(() =>
      receiveOwnerCandidateStatus({ ...status, terminal: false }, id),
    ).toThrow();
    expect(
      receiveOwnerCandidateStatus(
        {
          ...status,
          status: "pending",
          terminal: false,
          decidedAt: null,
          committedMemoryItemId: null,
        },
        id,
      ).terminal,
    ).toBe(false);
  });

  it("preserves missing status as 404 and keeps review disabled without a qualified target", async () => {
    const missing = await proxyOwnerMemoryInbox(
      new Request(`${origin}/api/memory/owner/candidates/${id}/status`),
      { kind: "status", id },
      env,
      async () => "native",
      async () => Response.json({}, { status: 404 }),
    );
    expect(missing.status).toBe(404);
    const token = vi.fn();
    const fetcher = vi.fn();
    const held = await proxyOwnerMemoryInbox(
      new Request(`${origin}/api/memory/owner/candidates`),
      { kind: "page" },
      { ...env, MERI_MEMORY_OWNER_REVIEW_ENABLED: "false" },
      token,
      fetcher,
    );
    expect(held.status).toBe(503);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("route handlers use Clerk bearer and remain held by preview policy", async () => {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    clerk.auth.mockResolvedValue({
      userId: "synthetic-user",
      getToken: async () => "native-session",
    });
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url).includes("/status")
        ? Response.json(status)
        : Response.json(page),
    );
    vi.stubGlobal("fetch", fetcher);
    const list = await GET_PAGE(
      new Request(`${origin}/api/memory/owner/candidates?limit=50`),
    );
    expect(await list.json()).toEqual(page);
    const receipt = await GET_STATUS(
      new Request(`${origin}/api/memory/owner/candidates/${id}/status`),
      { params: Promise.resolve({ id }) },
    );
    expect(await receipt.json()).toEqual(status);
    vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
    const held = await GET_STATUS(
      new Request(`${origin}/api/memory/owner/candidates/${id}/status`),
      { params: Promise.resolve({ id }) },
    );
    expect(held.status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
