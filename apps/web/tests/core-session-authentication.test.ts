import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as backend from "../src/app/api/backend/[service]/[...path]/route";
import * as gateway from "../src/app/api/capiro/[operation]/route";
import { coreSessionAuthentication } from "../src/shared/preview/core-session-authentication";
import { testIdentity } from "../test/browser/fixtures";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://app.example.test";
const base = "https://first-chat-preview.app-dev.capiro.ai/api";
const id = "33333333-3333-4333-8333-333333333333";
const getToken = vi.fn(async (options?: { template: string }) =>
  options ? "synthetic-template" : "synthetic-session",
);
const fetcher = vi.fn<typeof fetch>(async () => Response.json(testIdentity));
beforeEach(() => {
  for (const [key, value] of Object.entries({
    CAPIRO_PREVIEW_READ_ONLY: "false",
    CORE_API_BASE_URL: base,
    CAPIRO_REQUEST_ORIGIN: origin,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  }))
    vi.stubEnv(key, value);
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([
  ["GET", "me"],
  ["GET", "clients"],
  ["GET", `clients/${id}`],
  ["GET", `clients/${id}/account-owners`],
  ["GET", "client-account-owners"],
  ["GET", "client-account-owners/options"],
  ["GET", "billing/state"],
  ["POST", "clients"],
  ["PUT", `clients/${id}`],
  ["PUT", `clients/${id}/account-owners`],
  ["DELETE", `clients/${id}`],
] as const)(
  "ordinary backend %s /%s preserves native Clerk session on current Core target",
  async (method, path) => {
    const response = await backend[method](
      new Request(`${origin}/api/backend/core/${path}`, {
        method,
        headers: { Origin: origin },
        ...(method === "GET" ? {} : { body: "{}" }),
      }),
      { params: Promise.resolve({ service: "core", path: path.split("/") }) },
    );
    expect(response.status).toBe(200);
    expect(getToken).toHaveBeenCalledExactlyOnceWith();
    expect(
      new Headers(fetcher.mock.calls[0]![1]?.headers).get("authorization"),
    ).toBe("Bearer synthetic-session");
  },
);

it.each([
  ["GET", `clients/${id}/people`],
  ["POST", `clients/${id}/people`],
  ["PATCH", "me"],
  ["GET", "me/memberships"],
  ["GET", "billing/summary"],
] as const)(
  "ordinary backend %s /%s keeps existing template authentication",
  async (method, path) => {
    const response = await backend[method](
      new Request(`${origin}/api/backend/core/${path}`, {
        method,
        headers: { Origin: origin },
        ...(method === "GET" ? {} : { body: "{}" }),
      }),
      { params: Promise.resolve({ service: "core", path: path.split("/") }) },
    );
    expect(response.status).toBe(200);
    expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "capiro" });
  },
);

it.each([
  "me.read",
  "clients.list",
  "settings.profiles.accountOwners",
  "settings.billing.state",
])("registered %s chooses the same native session", async (operation) => {
  // A refusal after authentication avoids substituting a fake contract-specific success.
  fetcher.mockImplementationOnce(async () =>
    Response.json(
      { message: "Synthetic current-scope refusal" },
      { status: 403 },
    ),
  );
  const response = await gateway.GET(
    new Request(`${origin}/api/capiro/${operation}`),
    { params: Promise.resolve({ operation }) },
  );
  expect(response.status).toBe(403);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(
    new Headers(fetcher.mock.calls[0]![1]?.headers).get("authorization"),
  ).toBe("Bearer synthetic-session");
});

it("keeps ordinary local/other-host, other service, malformed and non-native handlers unchanged", () => {
  for (const [service, target, method, path] of [
    ["core", "http://127.0.0.1:5208/api", "GET", "/me"],
    ["core", "https://core.example.test/api", "GET", "/me"],
    ["strategy", base, "GET", "/clients"],
    ["core", base, "GET", "/clients/not-a-uuid"],
    ["core", base, "PUT", `/clients/${id}/people`],
    ["core", base, "DELETE", `/clients/${id}/account-owners`],
  ])
    expect(
      coreSessionAuthentication(service!, target!, method!, path!),
    ).toBeUndefined();
  expect(
    coreSessionAuthentication("core", base, "GET", "/memory/owner/items"),
  ).toBe("clerk-session");
  expect(
    coreSessionAuthentication("core", base, "GET", "/memory/candidates/mine"),
  ).toBe("clerk-session");
  expect(
    coreSessionAuthentication(
      "core",
      base,
      "GET",
      `/memory/candidates/mine/${id}/status`,
    ),
  ).toBe("clerk-session");
});

it("keeps unsigned native requests and cross-origin client writes refused", async () => {
  clerk.auth.mockResolvedValueOnce({ userId: null, getToken });
  expect(
    (
      await backend.GET(new Request(`${origin}/api/backend/core/me`), {
        params: Promise.resolve({ service: "core", path: ["me"] }),
      })
    ).status,
  ).toBe(401);
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await backend.POST(
        new Request(`${origin}/api/backend/core/clients`, {
          method: "POST",
          headers: { Origin: "https://foreign.example.test" },
          body: "{}",
        }),
        { params: Promise.resolve({ service: "core", path: ["clients"] }) },
      )
    ).status,
  ).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
