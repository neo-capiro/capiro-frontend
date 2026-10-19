import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import proxy from "../src/proxy";
import { POST, PUT } from "../src/app/api/capiro/[operation]/route";
import { firstChatCoreOperationKey } from "../src/shared/capiro/operations/meri-first-chat";
import { previewFirstChatBackendSource } from "../src/shared/preview/first-chat-write.server";

const clerk = vi.hoisted(() => ({ auth: vi.fn(), middleware: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: clerk.auth,
  clerkMiddleware: () => clerk.middleware,
}));

const origin = "https://preview.synthetic.invalid";
const previewTarget = "https://core-pr43.synthetic.invalid/api";
const path = `/api/capiro/${firstChatCoreOperationKey}`;
const body = {
  schemaVersion: 1,
  requestId: "44444444-4444-4444-8444-444444444444",
  clientId: "33333333-3333-4333-8333-333333333333",
};
const receipt = {
  ...body,
  conversationId: "55555555-5555-4555-8555-555555555555",
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
const context = {
  params: Promise.resolve({ operation: firstChatCoreOperationKey }),
};
const getToken = vi.fn(async (...args) =>
  args.length === 0 ? "native-session-token" : "marked-template-token",
);
const fetcher = vi.fn<typeof fetch>();

function request(url = `${origin}${path}`, requestBody = body) {
  return new Request(url, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Authorization: "Bearer browser-forged",
      "X-Tenant-Id": "browser-forged",
    },
    body: JSON.stringify({ body: requestBody }),
  });
}

beforeEach(() => {
  for (const [key, value] of Object.entries({
    CAPIRO_PREVIEW_READ_ONLY: "true",
    MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: "true",
    MERI_FIRST_CHAT_CLIENT_ID: body.clientId,
    CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: previewFirstChatBackendSource,
    CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL: previewTarget,
    CORE_API_BASE_URL: "https://ordinary.synthetic.invalid/api",
    CAPIRO_REQUEST_ORIGIN: origin,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  }))
    vi.stubEnv(key, value);
  getToken.mockImplementation(async (...args) =>
    args.length === 0 ? "native-session-token" : "marked-template-token",
  );
  clerk.auth.mockResolvedValue({ userId: "clerk-subject", getToken });
  clerk.middleware.mockReturnValue(new Response("native Clerk middleware"));
  fetcher.mockImplementation(async () => Response.json(receipt));
  vi.stubGlobal("fetch", fetcher);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function held(response: Response) {
  expect(response.status).toBe(503);
  expect((await response.json()).error).toEqual({
    code: "PREVIEW_BACKEND_HELD",
  });
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(clerk.middleware).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
}

it("continues through Clerk and sends the sole preview write to the pinned Core target", async () => {
  const continuation = await proxy(
    new NextRequest(`${origin}${path}`, { method: "POST" }),
    {} as NextFetchEvent,
  );
  expect(await (continuation as Response).text()).toBe(
    "native Clerk middleware",
  );
  expect(clerk.middleware).toHaveBeenCalledOnce();
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(receipt);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(String(fetcher.mock.calls[0]![0])).toBe(
    `${previewTarget}/clio/conversations/bootstrap`,
  );
  const sent = fetcher.mock.calls[0]![1]!;
  expect(sent.method).toBe("POST");
  expect(JSON.parse(String(sent.body))).toEqual(body);
  expect(new Headers(sent.headers).get("authorization")).toBe(
    "Bearer native-session-token",
  );
  expect(new Headers(sent.headers).has("x-tenant-id")).toBe(false);
  expect(new Headers(sent.headers).has("cookie")).toBe(false);
});

it("keeps the pinned first-chat write with a separate qualified roster binding", async () => {
  vi.stubEnv(
    "CAPIRO_PREVIEW_READ_BACKEND_SOURCE",
    "6542f5b089656b6d255465edd464d06c2a0b408f",
  );
  vi.stubEnv(
    "CAPIRO_PREVIEW_READ_API_BASE_URL",
    "https://first-chat-preview.app-dev.capiro.ai/api",
  );
  vi.stubEnv(
    "CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE",
    "b97a3286487abcda6a7424cf1dc2812d93b65b3d",
  );
  vi.stubEnv(
    "CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL",
    "https://core-roster-preview.capiro.ai/api",
  );

  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(String(fetcher.mock.lastCall?.[0])).toBe(
    `${previewTarget}/clio/conversations/bootstrap`,
  );
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
});

it.each([
  ["MERI_FIRST_CHAT_BOOTSTRAP_ENABLED", "false"],
  ["MERI_FIRST_CHAT_CLIENT_ID", ""],
  ["CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE", "wrong-source"],
  ["CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL", ""],
  ["CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL", "https://os.capiro.ai/api"],
  [
    "CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL",
    "https://ordinary.synthetic.invalid/api",
  ],
])("holds preview bootstrap when %s is %s", async (key, value) => {
  vi.stubEnv(key, value);
  await held(await POST(request(), context));
  await held(
    (await proxy(
      new NextRequest(`${origin}${path}`, { method: "POST" }),
      {} as NextFetchEvent,
    )) as Response,
  );
});

it("holds query, method, path and resolved operation mismatches", async () => {
  await held(await POST(request(`${origin}${path}?input=%7B%7D`), context));
  await held(
    (await proxy(
      new NextRequest(`${origin}${path}?input=%7B%7D`, { method: "POST" }),
      {} as NextFetchEvent,
    )) as Response,
  );
  await held(
    await PUT(new Request(`${origin}${path}`, { method: "PUT" }), context),
  );
  await held(
    await POST(request(), {
      params: Promise.resolve({ operation: "me.update" }),
    }),
  );
  await held(
    await POST(request(), {
      params: Promise.resolve({ operation: "public-onboard.verify" }),
    }),
  );
  await held(
    (await proxy(
      new NextRequest(`${origin}/api/capiro/me.update`, { method: "POST" }),
      {} as NextFetchEvent,
    )) as Response,
  );
});

it.each([
  "/api/backend/core/clients",
  "/api/action-followthrough/session",
  "/api/capiro/me.update",
  "/api/capiro/public-onboard.verify",
])("keeps unrelated POST %s held with bootstrap enabled", async (path) => {
  await held(
    (await proxy(
      new NextRequest(`${origin}${path}`, { method: "POST" }),
      {} as NextFetchEvent,
    )) as Response,
  );
});

it("validates the configured client and Core receipt before returning either", async () => {
  const wrong = await POST(
    request(`${origin}${path}`, {
      ...body,
      clientId: "66666666-6666-4666-8666-666666666666",
    }),
    context,
  );
  expect(wrong.status).toBe(400);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();

  fetcher.mockResolvedValueOnce(
    Response.json({ ...receipt, actorId: "wrong" }),
  );
  const malformed = await POST(request(), context);
  expect(malformed.status).toBe(502);
  expect(await malformed.text()).not.toContain("wrong");
});

it("replays the same browser request identity without minting a second one", async () => {
  const first = await POST(request(), context);
  const second = await POST(request(), context);
  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const [, init] of fetcher.mock.calls)
    expect(JSON.parse(String(init?.body))).toMatchObject({
      requestId: body.requestId,
      clientId: body.clientId,
    });
});
