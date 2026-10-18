import { afterEach, expect, it, vi } from "vitest";
import {
  GET,
  POST,
  HEAD,
  OPTIONS,
  PUT,
  PATCH,
  DELETE,
} from "../src/app/api/conversations/[...path]/route";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://frontend.example.test";
const credential = `action_session_${"a".repeat(43)}`;
const authorization = `Bearer ${credential}`;
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  CAPIRO_REQUEST_ORIGIN: origin,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
};
const request = (method = "POST", path = "history") =>
  new Request(`${origin}/api/conversations/${path}`, {
    method,
    ...(method === "POST" ? { body: "{}" } : {}),
    headers: {
      "x-meri-action-session": credential,
      Origin: origin,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
  });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("actual public conversation route gates with a native Clerk session token and forwards only opaque credential", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const getToken = vi.fn(async () => "synthetic-native-bearer");
  clerk.auth.mockResolvedValue({ userId: "synthetic-user", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "SESSION_CHANGED" } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request(), {
    params: Promise.resolve({ path: ["history"] }),
  });
  expect(response.status).toBe(403);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher.mock.calls[0]![0]).toBe(
    `${env.MERI_API_BASE_URL}/api/conversations/history`,
  );
  expect(
    new Headers(fetcher.mock.calls[0]![1]!.headers).get("authorization"),
  ).toBe(authorization);
  expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
    origin,
  );
  expect(fetcher).toHaveBeenCalledOnce();
});

it("preview containment refuses before Clerk or owner dispatch", async () => {
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request(), {
    params: Promise.resolve({ path: ["history"] }),
  });
  expect(response.status).toBe(503);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("a browser bearer is refused before Clerk sees a request it would read as signed out", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const forged = new Request(`${origin}/api/conversations/history`, {
    method: "POST",
    body: "{}",
    headers: {
      authorization,
      Origin: origin,
      "Content-Type": "application/json",
    },
  });
  expect(
    (await POST(forged, { params: Promise.resolve({ path: ["history"] }) }))
      .status,
  ).toBe(400);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("signed out route cannot dispatch despite a supplied opaque credential", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({ userId: null, getToken: vi.fn() });
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await POST(request(), { params: Promise.resolve({ path: ["history"] }) }))
      .status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

for (const method of [HEAD, OPTIONS, PUT, PATCH, DELETE])
  it("unsupported exported method never opens the proxy or issuer", async () => {
    const response = await method(request("PUT"), {
      params: Promise.resolve({ path: ["history"] }),
    });
    expect(response.status).toBe(405);
    expect(clerk.auth).not.toHaveBeenCalled();
  });

it("actual catchall reconnect preserves GET and default resume sequence", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({
    userId: "synthetic-user",
    getToken: vi.fn(async () => "native"),
  });
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 204 }),
  );
  vi.stubGlobal("fetch", fetcher);
  const path = ["events", "10000000-0000-4000-8000-000000000001", "stream"];
  expect(
    (
      await GET(request("GET", path.join("/")), {
        params: Promise.resolve({ path }),
      })
    ).status,
  ).toBe(204);
  expect(
    new Headers(fetcher.mock.calls[0]![1]!.headers).get(
      "x-meri-resume-sequence",
    ),
  ).toBe("0");
  expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
    origin,
  );
  expect(fetcher.mock.calls[0]![1]!.body).toBeUndefined();
});
