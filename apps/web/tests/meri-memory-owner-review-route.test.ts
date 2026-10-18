import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/memory/owner/candidates/route";
import { POST } from "../src/app/api/memory/owner/candidates/[id]/decision/route";
import { POST as POST_VERSION } from "../src/app/api/memory/owner/candidates/[id]/version-decision/route";

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("the owner list route uses the native Clerk session bearer", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const getToken = vi.fn(async () => "native-session");
  clerk.auth.mockResolvedValue({ userId: "synthetic-user", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ version: 1, candidates: [], nextCursor: null }),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(
    new Request(`${origin}/api/memory/owner/candidates`),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    version: 1,
    candidates: [],
    nextCursor: null,
  });
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher.mock.calls[0]![0]).toBe(
    "https://core.synthetic.invalid/api/memory/candidates/mine?limit=50",
  );
});

it("the decision route obtains its candidate id from the route, not the body", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({
    userId: "synthetic-user",
    getToken: async () => "native-session",
  });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ status: "rejected" }),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(
    new Request(`${origin}/api/memory/owner/candidates/${id}/decision`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: '{"decision":"reject"}',
    }),
    { params: Promise.resolve({ id }) },
  );
  expect(response.status).toBe(200);
  expect(fetcher.mock.calls[0]![0]).toBe(
    `https://core.synthetic.invalid/api/memory/candidates/${id}/owner-decision`,
  );
});

it("the version route uses the native bearer and the governed Core endpoint", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({
    userId: "synthetic-user",
    getToken: async () => "native-session",
  });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ ok: true, candidateId: id, outcome: "activated" }),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST_VERSION(
    new Request(
      `${origin}/api/memory/owner/candidates/${id}/version-decision`,
      {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: '{"decision":"approve"}',
      },
    ),
    { params: Promise.resolve({ id }) },
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "activated" });
  expect(fetcher.mock.calls[0]![0]).toBe(
    `https://core.synthetic.invalid/api/memory/version-candidates/${id}/approve`,
  );
});

it("the current preview policy holds this route until the shared owner admits it", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(
    new Request(`${origin}/api/memory/owner/candidates`),
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({
    error: { code: "PREVIEW_BACKEND_HELD" },
  });
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  const version = await POST_VERSION(
    new Request(
      `${origin}/api/memory/owner/candidates/${id}/version-decision`,
      {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: '{"decision":"approve"}',
      },
    ),
    { params: Promise.resolve({ id }) },
  );
  expect(version.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
