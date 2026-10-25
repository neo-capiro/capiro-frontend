import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/capiro/[operation]/route";
import {
  firstChatCoreOperationKey,
  firstChatV2OperationKey,
} from "../src/shared/capiro/operations/meri-first-chat";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);

const origin = "https://app.example.test";
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

function incoming(requestBody = body) {
  return new Request(`${origin}/api/capiro/${firstChatCoreOperationKey}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ body: requestBody }),
  });
}

const context = {
  params: Promise.resolve({ operation: firstChatCoreOperationKey }),
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("holds the registered Core write before Clerk when first chat is disabled", async () => {
  vi.stubEnv("MERI_FIRST_CHAT_BOOTSTRAP_ENABLED", "false");
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  const response = await POST(incoming(), context);
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("passes a flagged first-chat write through the unmarked native Clerk bearer", async () => {
  for (const [key, value] of Object.entries({
    MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: "true",
    CAPIRO_PREVIEW_READ_ONLY: "false",
    CORE_API_BASE_URL: "https://core.example.test/api",
    CAPIRO_REQUEST_ORIGIN: origin,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  }))
    vi.stubEnv(key, value);
  const getToken = vi.fn(async (...args) =>
    args.length === 0 ? "native-session-token" : "marked-template-token",
  );
  clerk.auth.mockResolvedValue({ userId: "clerk-subject", getToken });
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(receipt));
  vi.stubGlobal("fetch", fetcher);

  const response = await POST(incoming(), context);
  expect(response.status).toBe(200);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(String(fetcher.mock.calls[0]![0])).toBe(
    "https://core.example.test/api/clio/conversations/bootstrap",
  );
  expect(
    new Headers(fetcher.mock.calls[0]![1]?.headers).get("authorization"),
  ).toBe("Bearer native-session-token");
  expect(await response.json()).toEqual(receipt);
});

it.each([
  "33333333-3333-4333-8333-333333333333",
  "66666666-6666-4666-8666-666666666666",
])(
  "forwards each client selector to Core authorization: %s",
  async (clientId) => {
    for (const [key, value] of Object.entries({
      MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: "true",
      CAPIRO_PREVIEW_READ_ONLY: "false",
      CORE_API_BASE_URL: "https://core.example.test/api",
      CAPIRO_REQUEST_ORIGIN: origin,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
      CLERK_SECRET_KEY: "sk_test_synthetic",
    }))
      vi.stubEnv(key, value);
    clerk.auth.mockResolvedValue({
      userId: "clerk-subject",
      getToken: async () => "native-session-token",
    });
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ ...receipt, clientId }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(incoming({ ...body, clientId }), context)).status).toBe(
      200,
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({
      ...body,
      clientId,
    });
  },
);

it("keeps a read-only preview closed even when the first-chat flag is set", async () => {
  vi.stubEnv("MERI_FIRST_CHAT_BOOTSTRAP_ENABLED", "true");
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  expect((await POST(incoming(), context)).status).toBe(503);
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  { scopeKind: "general", clientId: null },
  { scopeKind: "client", clientId: body.clientId },
])(
  "ordinary v2 bootstrap preserves the explicit $scopeKind scope",
  async (scope) => {
    for (const [key, value] of Object.entries({
      MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: "true",
      CAPIRO_PREVIEW_READ_ONLY: "false",
      CORE_API_BASE_URL: "https://first-chat-preview.app-dev.capiro.ai/api",
      CAPIRO_REQUEST_ORIGIN: origin,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
      CLERK_SECRET_KEY: "sk_test_synthetic",
    }))
      vi.stubEnv(key, value);
    const getToken = vi.fn(async () => "native-session-token");
    clerk.auth.mockResolvedValue({ userId: "clerk-subject", getToken });
    const selected = { ...body, schemaVersion: 2, ...scope };
    const expected = { ...receipt, schemaVersion: 2, ...scope };
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(expected));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(
      new Request(`${origin}/api/capiro/${firstChatV2OperationKey}`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ body: selected }),
      }),
      { params: Promise.resolve({ operation: firstChatV2OperationKey }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    expect(getToken).toHaveBeenCalledExactlyOnceWith();
    expect(String(fetcher.mock.calls[0]![0])).toBe(
      "https://first-chat-preview.app-dev.capiro.ai/api/clio/conversations/bootstrap",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual(
      selected,
    );
  },
);
