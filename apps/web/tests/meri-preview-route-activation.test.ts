import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import proxy, { config as proxyConfig } from "../src/proxy";
import { POST as actionPost } from "../src/app/api/action-followthrough/[operation]/route";
import { POST as conversationPost } from "../src/app/api/conversations/[...path]/route";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import {
  previewMeriBackendSource,
  previewMeriConversationRoute,
} from "../src/shared/preview/meri-conversation-route.server";

const clerk = vi.hoisted(() => ({ auth: vi.fn(), middleware: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: clerk.auth,
  clerkMiddleware: () => clerk.middleware,
}));

const origin = "https://preview.synthetic.invalid";
const meriOrigin = "https://meri-preview.synthetic.invalid";
const conversationId = "11111111-1111-4111-8111-111111111111";
const actionBearer = `Bearer action_session_${"a".repeat(43)}`;
const allowedPostPaths = [
  "/api/action-followthrough/session",
  "/api/conversations/submit",
  "/api/conversations/history",
  "/api/conversations/cancel",
  "/api/conversations/events",
  "/api/conversations/list",
  "/api/conversations/transcript",
  "/api/conversations/next-turn",
  "/api/conversations/input/allocate",
  "/api/conversations/input/admit",
];
const reconnectPath = `/api/conversations/events/${conversationId}/stream`;
const environment = {
  CAPIRO_PREVIEW_READ_ONLY: "true",
  CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED: "true",
  CAPIRO_PREVIEW_MERI_BACKEND_SOURCE: previewMeriBackendSource,
  MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
  MERI_API_BASE_URL: meriOrigin,
  CORE_API_BASE_URL: "https://ordinary.synthetic.invalid/api",
  CAPIRO_REQUEST_ORIGIN: origin,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
};
const getToken = vi.fn(async () => "native-capiro-token");
const fetcher = vi.fn<typeof fetch>();

function request(path: string, method = "POST", body = "{}") {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(method === "POST"
        ? { "Content-Type": "application/json", Authorization: actionBearer }
        : {}),
    },
    ...(method === "POST" ? { body } : {}),
  });
}

beforeEach(() => {
  for (const [key, value] of Object.entries(environment))
    vi.stubEnv(key, value);
  getToken.mockResolvedValue("native-capiro-token");
  clerk.auth.mockResolvedValue({ userId: "clerk-subject", getToken });
  clerk.middleware.mockImplementation(
    () => new Response("native Clerk middleware"),
  );
  fetcher.mockImplementation(async () => Response.json({ accepted: true }));
  vi.stubGlobal("fetch", fetcher);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("admits only the closed public Meri conversation route family", () => {
  expect(previewMeriBackendSource).toBe(
    "5850e858f9776ec5faa2902a90a1e90ea3903346",
  );
  for (const path of allowedPostPaths) {
    const current = request(path);
    expect(previewMeriConversationRoute(environment, current), path).toBe(true);
    expect(previewBackendRejection(environment, current), path).toBeNull();
  }
  const reconnect = request(reconnectPath, "GET");
  expect(previewMeriConversationRoute(environment, reconnect)).toBe(true);
  expect(previewBackendRejection(environment, reconnect)).toBeNull();
});

it.each([
  ["absent", undefined],
  ["wrong", "unreviewed-source"],
])("holds %s Meri runtime source at every preview entry", async (_, source) => {
  const env: Record<string, string | undefined> = { ...environment };
  if (source === undefined) delete env.CAPIRO_PREVIEW_MERI_BACKEND_SOURCE;
  else env.CAPIRO_PREVIEW_MERI_BACKEND_SOURCE = source;
  for (const path of [
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]) {
    const current = request(path);
    expect(previewMeriConversationRoute(env, current)).toBe(false);
    expect(previewBackendRejection(env, current)?.status).toBe(503);
  }
  vi.stubEnv("CAPIRO_PREVIEW_MERI_BACKEND_SOURCE", source);
  for (const path of [
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]) {
    const response = await proxy(
      new NextRequest(`${origin}${path}`, { method: "POST" }),
      {} as NextFetchEvent,
    );
    expect((response as Response).status).toBe(503);
  }
  expect(
    (
      await actionPost(request("/api/action-followthrough/session"), {
        params: Promise.resolve({ operation: "session" }),
      })
    ).status,
  ).toBe(503);
  expect(
    (
      await conversationPost(request("/api/conversations/history"), {
        params: Promise.resolve({ path: ["history"] }),
      })
    ).status,
  ).toBe(503);
  expect(clerk.middleware).not.toHaveBeenCalled();
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("keeps the Meri route family held when the preview opt-in is absent", () => {
  const env: Record<string, string | undefined> = { ...environment };
  delete env.CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED;
  const current = request("/api/action-followthrough/session");
  expect(previewMeriConversationRoute(env, current)).toBe(false);
  expect(previewBackendRejection(env, current)?.status).toBe(503);
});

it.each([
  ["CAPIRO_PREVIEW_READ_ONLY", "false"],
  ["CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED", "false"],
  ["MERI_CONVERSATION_WORKFLOW_ENABLED", "false"],
  ["MERI_API_BASE_URL", ""],
  ["MERI_API_BASE_URL", origin],
  ["MERI_API_BASE_URL", "https://ordinary.synthetic.invalid"],
  ["MERI_API_BASE_URL", "https://meri-preview.synthetic.invalid/api"],
  ["MERI_API_BASE_URL", "https://meri-preview.synthetic.invalid?x=1"],
])("refuses Meri route activation when %s is %s", (key, value) => {
  const env = { ...environment, [key]: value };
  expect(previewMeriConversationRoute(env, request(allowedPostPaths[0]!))).toBe(
    false,
  );
  if (key !== "CAPIRO_PREVIEW_READ_ONLY")
    expect(
      previewBackendRejection(env, request(allowedPostPaths[0]!))?.status,
    ).toBe(503);
});

it.each([
  ["POST", "/api/action-followthrough/query"],
  ["POST", "/api/documents/create"],
  ["POST", "/api/backend/core/clients"],
  ["POST", "/api/conversations/control"],
  ["POST", "/api/conversations/history?after=0"],
  ["GET", "/api/conversations/history"],
  ["GET", "/api/action-followthrough/session"],
  ["POST", reconnectPath],
  ["GET", reconnectPath.replace("/11111111", "/AAAAAAAA")],
])("holds unrelated or malformed %s %s", (method, path) => {
  const current = request(path, method);
  expect(previewMeriConversationRoute(environment, current)).toBe(false);
  expect(previewBackendRejection(environment, current)?.status).toBe(503);
});

it("continues exact session and history requests through Clerk and their native adapters", async () => {
  for (const path of [allowedPostPaths[0]!, "/api/conversations/history"]) {
    const response = await proxy(
      new NextRequest(`${origin}${path}`, { method: "POST" }),
      {} as NextFetchEvent,
    );
    expect(await (response as Response).text()).toBe("native Clerk middleware");
  }
  expect(clerk.middleware).toHaveBeenCalledTimes(2);

  const session = await actionPost(
    request(
      "/api/action-followthrough/session",
      "POST",
      JSON.stringify({
        conversationId,
      }),
    ),
    { params: Promise.resolve({ operation: "session" }) },
  );
  expect(session.status).toBe(200);
  expect(String(fetcher.mock.calls[0]![0])).toBe(
    `${meriOrigin}/api/action-followthrough/session`,
  );
  expect(
    new Headers(fetcher.mock.calls[0]![1]!.headers).get("authorization"),
  ).toBe("Bearer native-capiro-token");

  fetcher.mockResolvedValueOnce(
    Response.json({ error: { code: "SESSION_CHANGED" } }, { status: 403 }),
  );
  const history = await conversationPost(
    request("/api/conversations/history"),
    {
      params: Promise.resolve({ path: ["history"] }),
    },
  );
  expect(history.status).toBe(403);
  expect(String(fetcher.mock.calls[1]![0])).toBe(
    `${meriOrigin}/api/conversations/history`,
  );
  expect(
    new Headers(fetcher.mock.calls[1]![1]!.headers).get("authorization"),
  ).toBe(actionBearer);
  expect(getToken).toHaveBeenCalledTimes(2);
  for (const call of getToken.mock.calls)
    expect(call).toEqual([{ template: "capiro" }]);
});

it("matches the conversation proxy path and sends native Clerk membership on list", async () => {
  expect(proxyConfig.matcher).toContain("/api/conversations/:path*");
  const continuation = await proxy(
    new NextRequest(`${origin}/api/conversations/list`, { method: "POST" }),
    {} as NextFetchEvent,
  );
  expect(await (continuation as Response).text()).toBe(
    "native Clerk middleware",
  );
  fetcher.mockResolvedValueOnce(
    Response.json({
      schema: "meri.conversation-list/1",
      conversations: [],
      nextBefore: null,
    }),
  );
  const response = await conversationPost(
    new Request(`${origin}/api/conversations/list`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    }),
    { params: Promise.resolve({ path: ["list"] }) },
  );
  expect(response.status).toBe(200);
  expect(String(fetcher.mock.calls[0]![0])).toBe(
    `${meriOrigin}/api/conversations/list`,
  );
  const upstream = new Headers(fetcher.mock.calls[0]![1]!.headers);
  expect(upstream.get("authorization")).toBe("Bearer native-capiro-token");
  expect(upstream.has("cookie")).toBe(false);
  expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "capiro" });
});

it("keeps both direct Meri adapters held before Clerk when activation is disabled", async () => {
  vi.stubEnv("CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED", "false");
  const session = await actionPost(
    request("/api/action-followthrough/session"),
    {
      params: Promise.resolve({ operation: "session" }),
    },
  );
  const history = await conversationPost(
    request("/api/conversations/history"),
    {
      params: Promise.resolve({ path: ["history"] }),
    },
  );
  expect(session.status).toBe(503);
  expect(history.status).toBe(503);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("holds wrong direct Meri paths and queries before Clerk", async () => {
  const responses = [
    await actionPost(request("/api/action-followthrough/query"), {
      params: Promise.resolve({ operation: "query" }),
    }),
    await actionPost(request("/api/action-followthrough/session?extra=1"), {
      params: Promise.resolve({ operation: "session" }),
    }),
    await conversationPost(request("/api/conversations/control"), {
      params: Promise.resolve({ path: ["control"] }),
    }),
    await conversationPost(request("/api/conversations/history?extra=1"), {
      params: Promise.resolve({ path: ["history"] }),
    }),
  ];
  for (const response of responses) expect(response.status).toBe(503);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
