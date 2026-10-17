import { expect, it, vi } from "vitest";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import {
  firstChatCoreOperation,
  firstChatCoreOperationKey,
  FirstChatCoreReceiptError,
  requireFirstChatCoreReceipt,
} from "../src/shared/capiro/operations/meri-first-chat";
import { capiroOperations } from "../src/shared/capiro/registry";
import {
  confirmFirstChatIntent,
  reserveFirstChatIntent,
} from "../src/shared/meri-conversations/first-chat-intent";

const scope = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
  clientId: "33333333-3333-4333-8333-333333333333",
};
const requestId = "44444444-4444-4444-8444-444444444444";
const conversationId = "55555555-5555-4555-8555-555555555555";
const body = { schemaVersion: 1, requestId, clientId: scope.clientId };
const receipt = { ...body, ...scope, conversationId };
const registry = { [firstChatCoreOperationKey]: firstChatCoreOperation };
const config = {
  services: { core: "https://core.example.test/api" },
  authConfigured: true,
  issues: [],
  requestOrigin: "https://app.example.test",
};

function incoming(signal?: AbortSignal, input: unknown = { body }) {
  return new Request(
    `https://app.example.test/api/capiro/${firstChatCoreOperationKey}`,
    {
      method: "POST",
      headers: {
        Origin: "https://app.example.test",
        "Content-Type": "application/json",
        Authorization: "Bearer untrusted-browser-value",
        Cookie: "untrusted=browser-value",
      },
      body: JSON.stringify(input),
      signal,
    },
  );
}

it("registers only the pinned first-chat Core operation", () => {
  expect(capiroOperations[firstChatCoreOperationKey]).toBe(
    firstChatCoreOperation,
  );
});

it("sends only the native bearer and exact body through the narrow Core gateway", async () => {
  const token = vi.fn(async () => "native-capiro-token");
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(receipt));
  const response = await handleCapiroRequest(
    incoming(),
    firstChatCoreOperationKey,
    registry,
    config,
    token,
    fetcher,
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(token).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, options] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(
    "https://core.example.test/api/clio/conversations/bootstrap",
  );
  expect(options?.method).toBe("POST");
  expect(options?.body).toBe(JSON.stringify(body));
  expect(new Headers(options?.headers).get("authorization")).toBe(
    "Bearer native-capiro-token",
  );
  expect(new Headers(options?.headers).has("cookie")).toBe(false);
  expect(new Headers(options?.headers).has("x-capiro-tenant")).toBe(false);
  expect(options?.credentials).toBe("omit");
  expect(
    requireFirstChatCoreReceipt(await response.json(), {
      ...scope,
      requestId,
    }).conversationId,
  ).toBe(conversationId);
});

it("refuses browser scope fields and missing native authorization before Core", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(receipt));
  const token = vi.fn(async () => "native-capiro-token");
  const forged = await handleCapiroRequest(
    incoming(undefined, { body: { ...body, tenantId: scope.tenantId } }),
    firstChatCoreOperationKey,
    registry,
    config,
    token,
    fetcher,
  );
  expect(forged.status).toBe(400);
  expect(token).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();

  const signedOut = await handleCapiroRequest(
    incoming(),
    firstChatCoreOperationKey,
    registry,
    config,
    async () => null,
    fetcher,
  );
  expect(signedOut.status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects malformed and cross-scope receipts before confirmation", async () => {
  for (const changed of [
    { requestId: "66666666-6666-4666-8666-666666666666" },
    { tenantId: "77777777-7777-4777-8777-777777777777" },
    { actorId: "88888888-8888-4888-8888-888888888888" },
    { clientId: "99999999-9999-4999-8999-999999999999" },
    { conversationId: "not-a-uuid" },
    { schemaVersion: 2 },
  ])
    expect(() =>
      requireFirstChatCoreReceipt(
        { ...receipt, ...changed },
        {
          ...scope,
          requestId,
        },
      ),
    ).toThrow(FirstChatCoreReceiptError);

  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ ...receipt, actorId: "not-a-uuid" }),
  );
  const response = await handleCapiroRequest(
    incoming(),
    firstChatCoreOperationKey,
    registry,
    config,
    async () => "native-capiro-token",
    fetcher,
  );
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain("not-a-uuid");
});

it("leaves the intent pending when Core echoes a schema-valid foreign scope", async () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const intent = reserveFirstChatIntent(scope, storage, () => requestId);
  const response = await handleCapiroRequest(
    incoming(),
    firstChatCoreOperationKey,
    registry,
    config,
    async () => "native-capiro-token",
    vi.fn<typeof fetch>(async () =>
      Response.json({
        ...receipt,
        actorId: "88888888-8888-4888-8888-888888888888",
      }),
    ),
  );
  expect(response.status).toBe(200);
  const responseBody = await response.json();
  expect(() =>
    requireFirstChatCoreReceipt(responseBody, {
      ...scope,
      requestId: intent.requestId,
    }),
  ).toThrow(FirstChatCoreReceiptError);
  expect(reserveFirstChatIntent(scope, storage).state).toBe("pending");
});

it("retries an interrupted Core write with the same persisted request ID", async () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const intent = reserveFirstChatIntent(scope, storage, () => requestId);
  const controller = new AbortController();
  let dispatched!: () => void;
  const started = new Promise<void>((resolve) => {
    dispatched = resolve;
  });
  const hanging = vi.fn<typeof fetch>(async () => {
    dispatched();
    return new Promise<Response>(() => undefined);
  });
  const pending = handleCapiroRequest(
    incoming(controller.signal),
    firstChatCoreOperationKey,
    registry,
    config,
    async () => "native-capiro-token",
    hanging,
  );
  await started;
  controller.abort();
  expect((await pending).status).toBe(408);
  expect(hanging).toHaveBeenCalledOnce();
  expect(
    reserveFirstChatIntent(scope, storage, () => {
      throw new Error("An uncertain write must reuse its request ID");
    }),
  ).toEqual(intent);

  const replay = await handleCapiroRequest(
    incoming(),
    firstChatCoreOperationKey,
    registry,
    config,
    async () => "native-capiro-token",
    vi.fn<typeof fetch>(async () => Response.json(receipt)),
  );
  const verified = requireFirstChatCoreReceipt(await replay.json(), {
    ...scope,
    requestId: intent.requestId,
  });
  expect(
    confirmFirstChatIntent(
      scope,
      intent.requestId,
      verified.conversationId,
      storage,
    ),
  ).toMatchObject({ state: "confirmed", conversationId });
});
