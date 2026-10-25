import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as backend from "../src/app/api/backend/[service]/[...path]/route";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "http://localhost:5199";
const localCore = "http://127.0.0.1:5208/api";
const getToken = vi.fn<
  (options?: { template: string }) => Promise<string | null>
>(async (options) => (options ? "synthetic-template" : "synthetic-session"));
const fetcher = vi.fn<typeof fetch>();

beforeEach(() => {
  for (const [key, value] of Object.entries({
    CAPIRO_PREVIEW_READ_ONLY: "false",
    CORE_API_BASE_URL: localCore,
    CAPIRO_REQUEST_ORIGIN: origin,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  }))
    vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  fetcher.mockImplementation(async () =>
    Response.json(
      { message: "Synthetic current-scope refusal" },
      { status: 403 },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function layoutRequest(method: "GET" | "PUT", requestOrigin = origin) {
  return backend[method](
    new Request(`${origin}/api/backend/core/me/portfolio-layout`, {
      method,
      headers: { Origin: requestOrigin },
      ...(method === "PUT" ? { body: "{}" } : {}),
    }),
    {
      params: Promise.resolve({
        service: "core",
        path: ["me", "portfolio-layout"],
      }),
    },
  );
}

it.each([
  [localCore, "GET"],
  [localCore, "PUT"],
  ["http://localhost:5208/api", "GET"],
  ["http://localhost:5208/api", "PUT"],
  ["https://first-chat-preview.app-dev.capiro.ai/api", "GET"],
  ["https://first-chat-preview.app-dev.capiro.ai/api", "PUT"],
  ["https://core.example.test/api", "GET"],
  ["https://core.example.test/api", "PUT"],
] as const)(
  "configured Core %s layout %s forwards the native session and preserves its refusal",
  async (base, method) => {
    vi.stubEnv("CORE_API_BASE_URL", base);
    const response = await layoutRequest(method);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Synthetic current-scope refusal",
    });
    expect(getToken).toHaveBeenCalledExactlyOnceWith();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(`${base}/me/portfolio-layout`);
    expect(init?.method).toBe(method);
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer synthetic-session",
    );
  },
);

it.each([
  ["GET", ["me"]],
  ["GET", ["me", "memberships"]],
  ["GET", ["me", "portfolio-layout", "items"]],
  ["GET", ["me", "portfolio-layout-extra"]],
  ["POST", ["me", "portfolio-layout"]],
  ["PATCH", ["me", "portfolio-layout"]],
  ["DELETE", ["me", "portfolio-layout"]],
] as const)(
  "local Core %s /%s keeps template authentication",
  async (method, path) => {
    const response = await backend[method](
      new Request(`${origin}/api/backend/core/${path.join("/")}`, {
        method,
        headers: { Origin: origin },
        ...(method === "GET" ? {} : { body: "{}" }),
      }),
      { params: Promise.resolve({ service: "core", path: [...path] }) },
    );
    expect(response.status).toBe(403);
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "capiro" });
  },
);

it.each(["GET", "PUT"] as const)(
  "unsigned layout %s stops before token retrieval",
  async (method) => {
    clerk.auth.mockResolvedValueOnce({ userId: null, getToken });
    expect((await layoutRequest(method)).status).toBe(401);
    expect(getToken).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("refuses a cross-origin layout PUT before asking Clerk for a session", async () => {
  expect(
    (await layoutRequest("PUT", "https://foreign.example.test")).status,
  ).toBe(403);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(["", "http://untrusted.example.test/api"])(
  "refuses incomplete or invalid Core configuration %s before authentication",
  async (base) => {
    vi.stubEnv("CORE_API_BASE_URL", base);
    expect((await layoutRequest("GET")).status).toBe(503);
    expect(clerk.auth).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(["missing", "failed"] as const)(
  "does not fall back to a template when the native session is %s",
  async (failure) => {
    if (failure === "missing") getToken.mockResolvedValueOnce(null);
    else getToken.mockRejectedValueOnce(new Error("Synthetic session failure"));
    expect((await layoutRequest("GET")).status).toBe(401);
    expect(getToken).toHaveBeenCalledExactlyOnceWith();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("preserves an upstream layout 401 without retrying another credential", async () => {
  fetcher.mockImplementationOnce(async () =>
    Response.json(
      { message: "Application authority unavailable" },
      { status: 401 },
    ),
  );
  const response = await layoutRequest("GET");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    message: "Application authority unavailable",
  });
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
