import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import * as core from "../src/app/api/backend/[service]/[...path]/route";
import * as capiro from "../src/app/api/capiro/[operation]/route";
import proxy from "../src/proxy";
import { capiroOperations } from "../src/shared/capiro/registry";

const clerk = vi.hoisted(() => ({ auth: vi.fn(), middleware: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: clerk.auth,
  clerkMiddleware: () => clerk.middleware,
}));
const origin = "https://frontend.synthetic.invalid";
const target = "https://preview-api.synthetic.invalid/api";
const source = "111f269d749cae0249c2141779bd6d7deb93f45c";
const id = "10000000-0000-4000-8000-000000000001";
const client = {
  id,
  name: "Synthetic",
  profileStatus: "draft",
  status: "active",
  logoUrl: null,
};
const me = {
  user: {
    id,
    clerkUserId: "synthetic",
    email: null,
    firstName: null,
    lastName: null,
    title: null,
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: false,
    legiwatchIntroSeen: false,
  },
  tenant: { id, slug: "capiro-internal", name: "Synthetic" },
  role: "standard_user",
  billingAdmin: false,
  entitlements: {
    memoryGovernance: false,
    peWatch: false,
    defenseBudgetIntel: false,
    complianceModule: false,
    dataExport: false,
    customConnectors: false,
  },
  features: {},
};
const fetcher = vi.fn<typeof fetch>();
const getToken = vi.fn(
  async (): Promise<string | null> => "native-synthetic-token",
);
const request = (path: string, init?: RequestInit) =>
  new Request(`${origin}/api/${path}`, init);
function receive(path: string, init?: RequestInit) {
  const req = request(path, init);
  const pathname = new URL(req.url).pathname;
  return pathname.startsWith("/api/capiro/")
    ? capiro.GET(req, {
        params: Promise.resolve({ operation: pathname.slice(12) }),
      })
    : core.GET(req, {
        params: Promise.resolve({
          service: "core",
          path: pathname.slice(18).split("/"),
        }),
      });
}
beforeEach(() => {
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  vi.stubEnv("CAPIRO_PREVIEW_READ_API_BASE_URL", target);
  vi.stubEnv("CAPIRO_PREVIEW_READ_BACKEND_SOURCE", source);
  vi.stubEnv("CORE_API_BASE_URL", "https://ordinary.synthetic.invalid/api");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_c3ludGhldGljJA==");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_synthetic");
  getToken.mockResolvedValue("native-synthetic-token");
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  clerk.middleware.mockReturnValue(new Response("native Clerk boundary"));
  fetcher.mockImplementation(async () => Response.json([client]));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});
async function denied(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
}

it.each([
  ["backend/core/me", "/me"],
  ["backend/core/clients", "/clients"],
  [`backend/core/clients/${id}`, `/clients/${id}`],
  ["capiro/clients.list", "/clients"],
])("receives only the dedicated contract for %s", async (path, suffix) => {
  const payload =
    suffix === "/me" ? me : suffix === "/clients" ? [client] : client;
  fetcher.mockResolvedValue(Response.json(payload));
  const response = await receive(path!, {
    headers: {
      Authorization: "Bearer browser-forged",
      Cookie: "__session=synthetic",
      "X-Forwarded-Host": "os.capiro.ai",
    },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(payload);
  expect(String(fetcher.mock.lastCall?.[0])).toBe(target + suffix);
  expect(fetcher.mock.lastCall?.[1]).toMatchObject({
    method: "GET",
    cache: "no-store",
    redirect: "error",
    credentials: "omit",
    headers: {
      Authorization: "Bearer native-synthetic-token",
      Accept: "application/json",
      "X-Capiro-Tenant": "capiro-internal",
    },
  });
  expect(Object.keys(fetcher.mock.lastCall![1]!.headers!)).toHaveLength(3);
  expect(getToken).toHaveBeenCalledWith({ template: "capiro" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("uses the existing me schema and keeps native Clerk middleware", async () => {
  fetcher.mockResolvedValue(Response.json(me));
  expect(await (await receive("capiro/me.read")).json()).toEqual(me);
  expect(String(fetcher.mock.lastCall?.[0])).toBe(target + "/me");
  expect(
    await (
      (await proxy(
        new NextRequest(`${origin}/api/capiro/me.read`),
        {} as NextFetchEvent,
      )) as Response
    ).text(),
  ).toBe("native Clerk boundary");
});

it.each([
  "backend/core/clients?profileStatus=draft&sectorTag=health&includeArchived=true",
  `capiro/clients.list?input=${encodeURIComponent(JSON.stringify({ query: { profileStatus: "draft", sectorTag: "health", includeArchived: true } }))}`,
])("normalizes only existing list filters from %s", async (path) => {
  expect((await receive(path)).status).toBe(200);
  const url = new URL(String(fetcher.mock.lastCall?.[0]));
  expect(Object.fromEntries(url.searchParams)).toEqual({
    profileStatus: "draft",
    sectorTag: "health",
    includeArchived: "true",
  });
});

it.each([undefined, "", "wrong-source"])(
  "holds an absent or wrong backend source %s",
  async (value) => {
    vi.stubEnv("CAPIRO_PREVIEW_READ_BACKEND_SOURCE", value);
    await denied(await receive("backend/core/clients"));
  },
);
it.each([
  undefined,
  "",
  "https://ordinary.synthetic.invalid/api",
  "https://os.capiro.ai/api",
  "https://OS.CAPIRO.AI./api",
  `${origin}/api`,
  "http://preview-api.synthetic.invalid/api",
  `${target}/`,
  `${target}?x=y`,
  `${target}#fragment`,
  "https://user:pass@preview-api.synthetic.invalid/api",
  "https://preview-api.synthetic.invalid/other",
])("never falls back for rejected target %s", async (value) => {
  vi.stubEnv("CAPIRO_PREVIEW_READ_API_BASE_URL", value);
  await denied(await receive("backend/core/clients"));
});

it.each(["HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE", "PROPFIND"])(
  "holds %s even for admitted routes",
  async (method) => {
    await denied(await receive("backend/core/clients", { method }));
    await denied(
      (await proxy(
        new NextRequest(`${origin}/api/backend/core/clients`, { method }),
        {} as NextFetchEvent,
      )) as Response,
    );
    expect(clerk.middleware).not.toHaveBeenCalled();
  },
);

it.each([
  "backend/intelligence/clients",
  "backend/core/me/memberships",
  "backend/core/clients/",
  "backend/core/%63lients",
  `backend/core/clients/${id.toUpperCase().replace("1000", "A000")}`,
  "backend/core/clients/not-a-uuid",
  "backend/core/healthz",
  "backend/core/clients?tenantId=forged",
  "backend/core/clients?__proto__=forged",
  "backend/core/clients?constructor=forged",
  "backend/core/clients?_method=GET",
  "backend/core/clients?includeArchived=1",
  "backend/core/clients?sectorTag=a&sectorTag=b",
  "backend/core/me?sectorTag=a",
  `backend/core/clients/${id}?sectorTag=a`,
  "capiro/me.update",
  "capiro/me.memberships",
  "capiro/public-onboard.pricing",
  "capiro/clients.list?input=%7B%22query%22:%7B%22tenantId%22:%22forged%22%7D%7D",
  "capiro/clients.list?input=%7B%22query%22:%7B%22includeArchived%22:%22true%22%7D%7D",
  "capiro/clients.list?input={}&input={}",
  "capiro/clients.list?input=null",
  "capiro/me.read?input={bad",
  "capiro/me.read?input=%7B%22body%22:%7B%7D%7D",
])("holds unallocated request %s before identity", async (path) => {
  await denied(await receive(path));
});

it.each([
  "x-http-method-override",
  "x-method-override",
  "x-http-method",
  "x-capiro-tenant",
  "x-capiro-impersonate-tenant",
  "x-tenant-id",
  "x-client-id",
])("holds browser-supplied %s, including empty values", async (header) => {
  for (const value of ["", "capiro-internal"])
    await denied(
      await receive("backend/core/clients", { headers: { [header]: value } }),
    );
});

it("rejects resolved route parameter mismatches", async () => {
  await denied(
    await core.GET(request("backend/core/clients"), {
      params: Promise.resolve({ service: "intelligence", path: ["clients"] }),
    }),
  );
  await denied(
    await capiro.GET(request("capiro/me.read"), {
      params: Promise.resolve({ operation: "me.update" }),
    }),
  );
});
it("rejects expired identity before dispatch", async () => {
  getToken.mockResolvedValue(null);
  expect((await receive("backend/core/clients")).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("keeps every other registered operation held with candidate bindings present", async () => {
  for (const [operation, descriptor] of Object.entries(capiroOperations)) {
    if (["me.read", "clients.list"].includes(operation)) continue;
    await denied(
      await receive(`capiro/${operation}`, { method: descriptor.method }),
    );
  }
});
it.each([401, 403, 404, 429, 500, 302])(
  "contains upstream %s without redirects or response secrets",
  async (status) => {
    fetcher.mockResolvedValue(
      new Response("sensitive upstream detail", {
        status,
        headers: {
          Location: "https://os.capiro.ai/api",
          "Set-Cookie": "secret=value",
        },
      }),
    );
    const response = await receive("backend/core/clients");
    expect(response.status).toBe(
      [401, 403, 404, 429].includes(status) ? status : 502,
    );
    expect(await response.text()).not.toContain("sensitive");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
  },
);
it.each([
  "non-json",
  "invalid-json",
  "declared-oversize",
  "stream-oversize",
  "schema",
])("bounds or rejects %s responses", async (kind) => {
  const response =
    kind === "non-json"
      ? new Response("ok")
      : kind === "invalid-json"
        ? new Response("{", { headers: { "Content-Type": "application/json" } })
        : kind === "declared-oversize"
          ? Response.json([], { headers: { "Content-Length": "8000001" } })
          : kind === "stream-oversize"
            ? new Response(new Uint8Array(8000001), {
                headers: { "Content-Type": "application/json" },
              })
            : Response.json({ unexpected: true });
  fetcher.mockResolvedValue(response);
  expect((await receive("capiro/clients.list")).status).toBe(502);
});
it("cancels before dispatch when token acquisition finishes late", async () => {
  const controller = new AbortController();
  getToken.mockImplementation(async () => {
    controller.abort();
    return "late-token";
  });
  expect(
    (await receive("backend/core/clients", { signal: controller.signal }))
      .status,
  ).toBe(408);
  expect(fetcher).not.toHaveBeenCalled();
});
it("discards a response interrupted during receipt", async () => {
  const controller = new AbortController();
  fetcher.mockResolvedValue(
    new Response(
      new ReadableStream({
        pull(stream) {
          stream.enqueue(new TextEncoder().encode("["));
          controller.abort();
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  const response = await receive("backend/core/clients", {
    signal: controller.signal,
  });
  expect(response.status).toBe(408);
  expect(await response.text()).not.toContain("Synthetic");
});
it("ends a stalled token read at the overall deadline without dispatch", async () => {
  vi.useFakeTimers();
  getToken.mockImplementation(() => new Promise(() => undefined));
  const pending = receive("backend/core/clients");
  await vi.advanceTimersByTimeAsync(30_001);
  expect((await pending).status).toBe(502);
  expect(fetcher).not.toHaveBeenCalled();
});
it("cancels and closes a fetch response that arrives after abandonment", async () => {
  const controller = new AbortController();
  const cancel = vi.fn();
  fetcher.mockImplementation(async () => {
    controller.abort();
    return new Response(new ReadableStream({ cancel }), {
      headers: { "Content-Type": "application/json" },
    });
  });
  expect(
    (await receive("backend/core/clients", { signal: controller.signal }))
      .status,
  ).toBe(408);
  expect(cancel).toHaveBeenCalledOnce();
});
