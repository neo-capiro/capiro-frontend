import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import * as portfolio from "../src/app/api/backend/[service]/[...path]/route";
import * as capiro from "../src/app/api/capiro/[operation]/route";
import * as actions from "../src/app/api/action-followthrough/[operation]/route";
import * as documents from "../src/app/api/documents/[operation]/route";
import proxy from "../src/proxy";
import { capiroOperations } from "../src/shared/capiro/registry";

const clerk = vi.hoisted(() => ({ auth: vi.fn(), middleware: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: clerk.auth,
  clerkMiddleware: () => clerk.middleware,
}));
const origin = "https://preview.synthetic.invalid";
const params = {
  service: "core",
  path: ["clients"],
  operation: "settings.personal.get",
};
type Context = { params: Promise<typeof params> };
type Handler = (request: Request, context: Context) => Promise<Response>;
const routes = [
  ["backend/core/clients", portfolio],
  ["capiro/settings.personal.get", capiro],
  ["action-followthrough/session", actions],
  ["documents/create", documents],
] as const;
const entries = routes.flatMap(([path, handlers]) =>
  Object.entries(handlers).map(([method, handler]) => ({
    path,
    method,
    handler: handler as Handler,
  })),
);
const fetcher = vi.fn<typeof fetch>();
const getToken = vi.fn(async (options?: { template: string }) =>
  options ? "template-synthetic-token" : "native-synthetic-token",
);

beforeEach(() => {
  for (const key of [
    "CORE_API_BASE_URL",
    "STRATEGY_API_BASE_URL",
    "WORKSPACE_API_BASE_URL",
    "INTELLIGENCE_API_BASE_URL",
    "ONBOARD_API_BASE_URL",
    "MERI_API_BASE_URL",
  ])
    vi.stubEnv(key, "https://backend.synthetic.invalid/api");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_c3ludGhldGljJA==");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("MERI_ACTION_WORKFLOW_ENABLED", "true");
  vi.stubEnv("MERI_DOCUMENT_WORKFLOW_ENABLED", "true");
  vi.stubEnv("MERI_DOCUMENT_OPERATION", "create_word");
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  getToken.mockImplementation(async (options) =>
    options ? "template-synthetic-token" : "native-synthetic-token",
  );
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  clerk.middleware.mockImplementation(
    () => new Response("ordinary Clerk path"),
  );
  fetcher.mockImplementation(async () => Response.json({ synthetic: true }));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function held(response: Response) {
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: { code: "PREVIEW_BACKEND_HELD" },
    message: "Backend access is held for read-only preview review.",
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.has("location")).toBe(false);
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(clerk.middleware).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
}

it.each(entries)(
  "holds actual $method /api/$path before auth or body",
  async ({ path, method, handler }) => {
    const request = new Request(`${origin}/api/${path}`, {
      method,
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: "{}" }),
    });
    const read = vi.spyOn(request, "text");
    await held(await handler(request, { params: Promise.resolve(params) }));
    expect(read).not.toHaveBeenCalled();
    expect(request.bodyUsed).toBe(false);
  },
);

it.each([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "PROPFIND",
])(
  "cannot turn %s into a reviewed read by spoofing route or headers",
  async (method) => {
    for (const { handler } of entries) {
      const request = new Request(
        `${origin}/api/backend/core/%2e%2e/clients?readonly=false&_method=GET`,
        {
          method,
          headers: {
            Origin: origin,
            Host: "os.capiro.ai",
            "X-Forwarded-Host": "os.capiro.ai",
            "X-Original-URL": "/healthz",
            "X-Rewrite-URL": "/healthz",
            "X-HTTP-Method-Override": "GET",
            "X-Method-Override": "GET",
            "X-Tenant-Id": "capiro-internal",
            "X-Preview-Read-Only": "false",
            "X-Middleware-Subrequest": "src/proxy:src/proxy:src/proxy",
            Authorization: "Bearer forged",
            Cookie: "__session=forged; CAPIRO_PREVIEW_READ_ONLY=false",
          },
        },
      );
      const context = {
        get params(): Promise<typeof params> {
          throw new Error(
            "Preview must reject before resolving route parameters",
          );
        },
      };
      await held(await handler(request, context));
    }
  },
);

it.each(["", "TRUE", "1", " true ", "FALSE", " false ", "0", "garbage"])(
  "malformed server preview setting %j fails closed",
  async (flag) => {
    vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", flag);
    for (const { handler, path } of entries)
      await held(
        await handler(new Request(`${origin}/api/${path}`), {
          params: Promise.resolve(params),
        }),
      );
  },
);

it("admits none of the existing fixed operations, including GET", async () => {
  for (const [operation, descriptor] of Object.entries(capiroOperations)) {
    const request = new Request(`${origin}/api/capiro/${operation}`, {
      method: descriptor.method,
    });
    await held(
      await capiro.GET(request, { params: Promise.resolve({ operation }) }),
    );
  }
  for (const operation of [
    "public-form.get",
    "public-form.submit",
    "public-onboard.pricing",
    "public-onboard.verify",
    "unknown",
    "../healthz",
    "%2fhealthz",
  ])
    await held(
      await capiro.GET(new Request(`${origin}/api/capiro/${operation}`), {
        params: Promise.resolve({ operation }),
      }),
    );
});

it.each(routes)(
  "holds %s in the Next proxy before Clerk/public bypass",
  async (path) => {
    for (const suffix of [path, "capiro/public-onboard.pricing"])
      await held(
        (await proxy(
          new NextRequest(`${origin}/api/${suffix}`),
          {} as NextFetchEvent,
        )) as Response,
      );
  },
);

it.each([undefined, "false"])(
  "ordinary server setting %s preserves real Core transport behavior",
  async (flag) => {
    vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", flag);
    for (const method of ["GET", "POST"] as const) {
      const response = await portfolio[method](
        new Request(`${origin}/api/backend/core/clients`, {
          method,
          headers: { Origin: origin },
          ...(method === "POST" ? { body: "{}" } : {}),
        }),
        { params: Promise.resolve(params) },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ synthetic: true });
      expect(fetcher.mock.lastCall?.[1]?.method).toBe(method);
      expect(fetcher.mock.lastCall?.[1]?.headers).toMatchObject({
        Authorization: "Bearer template-synthetic-token",
      });
    }
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenCalledWith({ template: "capiro" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);

it("preview leaves non-API rendering and sign-in routing with existing Clerk", async () => {
  for (const path of ["/", "/portfolio", "/meri", "/modules", "/sign-in"])
    expect(
      await (
        (await proxy(
          new NextRequest(`${origin}${path}`),
          {} as NextFetchEvent,
        )) as Response
      ).text(),
    ).toBe("ordinary Clerk path");
  expect(clerk.middleware).toHaveBeenCalledTimes(5);
  expect(fetcher).not.toHaveBeenCalled();
});
