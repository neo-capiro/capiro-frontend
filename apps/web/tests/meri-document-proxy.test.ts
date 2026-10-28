import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { receiveDocumentRequest } from "@capiro/meri-contracts/document-application";
import { readDocumentConfig } from "../src/shared/meri-documents/config";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { POST as actionPost } from "../src/app/api/action-followthrough/[operation]/route";
import { POST as documentPost } from "../src/app/api/documents/[operation]/route";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://frontend.example.test";
const credential = `action_session_${"a".repeat(43)}`;
/** What Meri receives; the browser never sends a bearer to the proxy. */
const bearer = `Bearer ${credential}`;
const versionId = "12345678-1234-4234-8234-123456789012";
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_DOCUMENT_WORKFLOW_ENABLED: "true",
  MERI_DOCUMENT_OPERATION: "create_word",
};
const config = readDocumentConfig(env);
const publicOrigin = "https://app.capiro.ai";
const boundConfig = readDocumentConfig({
  ...env,
  CAPIRO_REQUEST_ORIGIN: publicOrigin,
});
const word = {
  operation: "create_word",
  format: "txt",
  title: "Synthetic",
  content: { text: "A € document" },
};
const excel = {
  operation: "create_excel",
  format: "xlsx",
  title: "Synthetic",
  content: { sheets: [{ name: "Sheet1", rows: [[{ value: "Synthetic" }]] }] },
};
const bodies = {
  create: { deliveryId: "synthetic/create:1", request: word },
  revise: {
    deliveryId: "synthetic/revise:2",
    baseVersionId: versionId,
    request: word,
  },
  inspect: { versionId },
  download: { versionId },
};
const request = (operation = "create", init: RequestInit = {}, suffix = "") =>
  new Request(`${origin}/api/documents/${operation}${suffix}`, {
    method: "POST",
    body: JSON.stringify(bodies[operation as keyof typeof bodies] ?? {}),
    ...init,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": credential,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
const boundRequest = (originHeader = publicOrigin) =>
  new Request("https://0.0.0.0:5188/api/documents/create", {
    method: "POST",
    body: JSON.stringify(bodies.create),
    headers: {
      Origin: originHeader,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": credential,
      Host: "app.capiro.ai",
      "X-Forwarded-Host": "app.capiro.ai",
      "X-Forwarded-Proto": "https",
    },
  });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function unavailable(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    error: { code: "FRONTEND_DOCUMENT_UNAVAILABLE" },
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("admits a document write from the configured public Origin behind the ALB", async () => {
  const nativeToken = vi.fn(async () => "native-token");
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "UNAVAILABLE", outcome: "NOT_DISPATCHED" } },
      { status: 503 },
    ),
  );
  const response = await proxyDocumentRequest(
    boundRequest(),
    "create",
    boundConfig,
    nativeToken,
    fetcher,
  );
  expect(response.status).toBe(503);
  expect(nativeToken).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0]![0]).toBe(
    "https://meri.example.test/api/documents/create",
  );
  expect(fetcher.mock.calls[0]![1]!.headers).toEqual({
    "Content-Type": "application/json",
    Authorization: bearer,
  });
});

it.each(["https://0.0.0.0:5188", "https://foreign.example.test"])(
  "refuses document Origin %s before native auth or dispatch behind the ALB",
  async (originHeader) => {
    const nativeToken = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    await unavailable(
      await proxyDocumentRequest(
        boundRequest(originHeader),
        "create",
        boundConfig,
        nativeToken,
        fetcher,
      ),
      400,
    );
    expect(nativeToken).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([undefined, "false", "TRUE", "1", " true "])(
  "nonliteral document flag %s never authenticates or fetches",
  async (flag) => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    const disabled = readDocumentConfig({
      ...env,
      MERI_DOCUMENT_WORKFLOW_ENABLED: flag,
      MERI_ACTION_WORKFLOW_ENABLED: "true",
    });
    expect(disabled.enabled).toBe(false);
    await unavailable(
      await proxyDocumentRequest(request(), "create", disabled, token, fetcher),
      503,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([
  { MERI_DOCUMENT_OPERATION: undefined },
  { MERI_DOCUMENT_OPERATION: "create_word,create_excel" },
  { MERI_DOCUMENT_OPERATION: "CREATE_WORD" },
  { MERI_API_BASE_URL: undefined },
  { MERI_API_BASE_URL: "http://remote.example.test" },
  { MERI_API_BASE_URL: "https://user:secret@meri.example.test" },
  { MERI_API_BASE_URL: "https://meri.example.test?tenant=browser" },
  { CLERK_SECRET_KEY: undefined },
  { CORE_API_BASE_URL: undefined },
])(
  "invalid trusted configuration %j cannot reach credentials or dispatch",
  async (change) => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    const disabled = readDocumentConfig({ ...env, ...change });
    expect(disabled.enabled).toBe(false);
    await unavailable(
      await proxyDocumentRequest(request(), "create", disabled, token, fetcher),
      503,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(["session", "upload", "CREATE", "../create", "create/revise"])(
  "refuses unallocated route %s before credentials",
  async (operation) => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    await unavailable(
      await proxyDocumentRequest(request(), operation, config, token, fetcher),
      404,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([
  ["wrong method", "create", { method: "PUT" }, "", 405],
  ["encoded path", "%63reate", {}, "", 400],
  ["other allocated path", "revise", {}, "", 400],
  ["query", "create", {}, "?target=https://foreign.test", 400],
  [
    "foreign origin",
    "create",
    { headers: { Origin: "https://foreign.test" } },
    "",
    400,
  ],
  ["missing origin", "create", { headers: { Origin: "" } }, "", 400],
  [
    "compressed request",
    "create",
    { headers: { "Content-Encoding": "gzip" } },
    "",
    400,
  ],
] as const)(
  "rejects %s before authentication",
  async (_name, path, init, suffix, status) => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    await unavailable(
      await proxyDocumentRequest(
        request(path, init, suffix),
        "create",
        config,
        token,
        fetcher,
      ),
      status,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([
  "",
  "native-capiro-token",
  "action_session_short",
  `Bearer action_session_${"a".repeat(43)}`,
  `action_session_${"a".repeat(44)}`,
])("refuses nonopaque session header %s without dispatch", async (session) => {
  const fetcher = vi.fn<typeof fetch>();
  await unavailable(
    await proxyDocumentRequest(
      request("create", { headers: { "X-Meri-Action-Session": session } }),
      "create",
      config,
      async () => "native-token",
      fetcher,
    ),
    401,
  );
  expect(fetcher).not.toHaveBeenCalled();
});

// A browser bearer would make Clerk's auth() read the request as signed out; it is never admitted.
it.each([bearer, "Bearer native-capiro-token", "Basic abc"])(
  "refuses browser Authorization %s before Clerk or dispatch",
  async (authorization) => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>();
    await unavailable(
      await proxyDocumentRequest(
        request("inspect", { headers: { Authorization: authorization } }),
        "inspect",
        config,
        token,
        fetcher,
      ),
      400,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("a valid opaque bearer cannot substitute for a signed-in native session", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await unavailable(
    await proxyDocumentRequest(
      request(),
      "create",
      config,
      async () => null,
      fetcher,
    ),
    401,
  );
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(["create", "revise", "inspect", "download"] as const)(
  "forwards exact %s bytes, disposition and only allocated headers",
  async (operation) => {
    const body = ` \n${JSON.stringify(bodies[operation])}\n`;
    receiveDocumentRequest(operation, new TextEncoder().encode(body));
    const text =
      '{"error":{"code":"ARTIFACT_EFFECT_UNKNOWN","outcome":"UNKNOWN"}}';
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(text, {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "private=secret",
            Location: "https://private.test",
            "X-Secret": "secret",
          },
        }),
    );
    const response = await proxyDocumentRequest(
      request(operation, {
        body,
        headers: {
          Cookie: "private=browser",
          "X-Tenant-Id": "forged",
          "X-Native-Token": "forged",
        },
      }),
      operation,
      config,
      async () => "native-capiro-token",
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(await response.text()).toBe(text);
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "no-store",
      "content-type": "application/json",
      "x-content-type-options": "nosniff",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`https://meri.example.test/api/documents/${operation}`);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: bearer },
    });
    expect(init!.signal).toBeInstanceOf(AbortSignal);
    expect(init!.body).toEqual(new TextEncoder().encode(body));
  },
);

it.each(["create", "revise"] as const)(
  "%s admits only the one configured document family",
  async (route) => {
    for (const operation of ["create_word", "create_excel"] as const) {
      for (const content of [word, excel]) {
        const body = JSON.stringify({ ...bodies[route], request: content });
        receiveDocumentRequest(route, new TextEncoder().encode(body));
        const fetcher = vi.fn<typeof fetch>(async () =>
          Response.json(
            { error: { code: "UNAVAILABLE", outcome: "NOT_DISPATCHED" } },
            { status: 503 },
          ),
        );
        const response = await proxyDocumentRequest(
          request(route, { body }),
          route,
          readDocumentConfig({ ...env, MERI_DOCUMENT_OPERATION: operation }),
          async () => "native-token",
          fetcher,
        );
        if (operation === content.operation) {
          expect(fetcher).toHaveBeenCalledOnce();
          expect(response.status).toBe(503);
        } else {
          await unavailable(response, 400);
          expect(fetcher).not.toHaveBeenCalled();
        }
      }
    }
  },
);

it.each([
  "{}",
  '{"deliveryId":"one","request":null}',
  '{"versionId":"wrong"}',
  '{"__proto__":{}}',
  "{",
])("malformed or substituted request %s never reaches Meri", async (body) => {
  const fetcher = vi.fn<typeof fetch>();
  await unavailable(
    await proxyDocumentRequest(
      request("create", { body }),
      "create",
      config,
      async () => "native-token",
      fetcher,
    ),
    502,
  );
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ["wrong media", "{}", { "Content-Type": "text/plain" }],
  [
    "declared overflow",
    "{}",
    { "Content-Length": String(2 * 1024 * 1024 + 1) },
  ],
  [
    "actual overflow",
    " ".repeat(2 * 1024 * 1024 + 1),
    { "Content-Length": "2" },
  ],
] as const)("bounds request acquisition: %s", async (_name, body, headers) => {
  const fetcher = vi.fn<typeof fetch>();
  await unavailable(
    await proxyDocumentRequest(
      request("create", { body, headers }),
      "create",
      config,
      async () => "native-token",
      fetcher,
    ),
    502,
  );
  expect(fetcher).not.toHaveBeenCalled();
});

it("preserves exact binary bytes, hash and verification headers while stripping private headers", async () => {
  const bytes = new Uint8Array([0, 255, 128, 0xc3, 0x28, 13, 10]);
  const headers = {
    "content-type":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "content-length": String(bytes.length),
    "content-disposition": 'attachment; filename="Synthetic.docx"',
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(bytes, {
        headers: {
          ...headers,
          "Set-Cookie": "secret",
          Location: "https://private.test",
        },
      }),
  );
  const response = await proxyDocumentRequest(
    request("download"),
    "download",
    config,
    async () => "native-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(Object.fromEntries(response.headers)).toEqual(headers);
  const received = new Uint8Array(await response.arrayBuffer());
  expect(received).toEqual(bytes);
  expect(createHash("sha256").update(received).digest("hex")).toBe(
    createHash("sha256").update(bytes).digest("hex"),
  );
});

it("does not launder an encoded download into a receiver-compatible response", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(new Uint8Array([1]), {
        headers: { "Content-Encoding": "gzip" },
      }),
  );
  const response = await proxyDocumentRequest(
    request("download"),
    "download",
    config,
    async () => "native-token",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-encoding")).toBe("gzip");
  expect(response.headers.has("content-disposition")).toBe(false);
});

it.each(["create", "download"])(
  "bounds %s response acquisition and cancels refused bodies",
  async (route) => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(16 * 1024 * 1024 + 1),
          },
        }),
    );
    await unavailable(
      await proxyDocumentRequest(
        request(route),
        route,
        config,
        async () => "native-token",
        fetcher,
      ),
      502,
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  },
);

it("refuses actual streamed binary overflow despite an understated header", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(16 * 1024 * 1024));
      controller.enqueue(new Uint8Array([1]));
    },
    cancel,
  });
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(body, { headers: { "Content-Length": "1" } }),
  );
  await unavailable(
    await proxyDocumentRequest(
      request("download"),
      "download",
      config,
      async () => "native-token",
      fetcher,
    ),
    502,
  );
  expect(cancel).toHaveBeenCalledOnce();
  expect(body.locked).toBe(false);
});

it.each(["redirect", "wrong JSON media"])(
  "refuses %s and disposes its acquired body",
  async (failure) => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const upstream = new Response(body, {
      headers: {
        "Content-Type":
          failure === "redirect" ? "application/json" : "text/html",
      },
    });
    if (failure === "redirect")
      Object.defineProperty(upstream, "redirected", { value: true });
    await unavailable(
      await proxyDocumentRequest(
        request(),
        "create",
        config,
        async () => "native-token",
        vi.fn(async () => upstream),
      ),
      502,
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  },
);

it.each(["abort", "deadline"])(
  "a %s before authentication completes cannot dispatch later",
  async (ending) => {
    vi.useFakeTimers();
    const lifetime = new AbortController();
    const token = deferred<string>();
    const entered = deferred<void>();
    const fetcher = vi.fn<typeof fetch>();
    const result = proxyDocumentRequest(
      request("create", { signal: lifetime.signal }),
      "create",
      config,
      () => {
        entered.resolve();
        return token.promise;
      },
      fetcher,
    );
    await entered.promise;
    if (ending === "abort") lifetime.abort();
    else await vi.advanceTimersByTimeAsync(30_001);
    await unavailable(await result, 502);
    token.resolve("native-token");
    await token.promise;
    await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(["abort", "deadline"])(
  "late ignored-%s fetch is cancelled, never released or retried",
  async (ending) => {
    vi.useFakeTimers();
    const lifetime = new AbortController();
    const upstream = deferred<Response>();
    const entered = deferred<void>();
    const disposed = deferred<void>();
    const fetcher = vi.fn<typeof fetch>(async () => {
      entered.resolve();
      return upstream.promise;
    });
    const result = proxyDocumentRequest(
      request("create", { signal: lifetime.signal }),
      "create",
      config,
      async () => "native-token",
      fetcher,
    );
    await entered.promise;
    if (ending === "abort") lifetime.abort();
    else await vi.advanceTimersByTimeAsync(30_001);
    await unavailable(await result, 502);
    const cancel = vi.fn(() => {
      disposed.resolve();
    });
    const body = new ReadableStream<Uint8Array>({ cancel });
    upstream.resolve(
      new Response(body, { headers: { "Content-Type": "application/json" } }),
    );
    await disposed.promise;
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  },
);

it("a pre-aborted request never asks for credentials or fetches", async () => {
  const token = vi.fn(async () => "native-token");
  const fetcher = vi.fn<typeof fetch>();
  await unavailable(
    await proxyDocumentRequest(
      request("create", { signal: AbortSignal.abort() }),
      "create",
      config,
      token,
      fetcher,
    ),
    502,
  );
  expect(token).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("admits canonical DOCX content without converting the bytes or changing family", async () => {
  const body = JSON.stringify({
    deliveryId: "synthetic/docx:1",
    request: {
      operation: "create_word",
      format: "docx",
      title: "Synthetic",
      content: {
        blocks: [
          { kind: "paragraph", runs: [{ text: "Synthetic", bold: true }] },
        ],
      },
    },
  });
  receiveDocumentRequest("create", new TextEncoder().encode(body));
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "UNAVAILABLE", outcome: "NOT_DISPATCHED" } },
      { status: 503 },
    ),
  );
  const response = await proxyDocumentRequest(
    request("create", { body }),
    "create",
    config,
    async () => "native-token",
    fetcher,
  );
  expect(response.status).toBe(503);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0]![1]!.body).toEqual(
    new TextEncoder().encode(body),
  );
});

it.each(["abort", "deadline"])(
  "%s while receiving a request disposes its body without dispatch",
  async (ending) => {
    vi.useFakeTimers();
    const lifetime = new AbortController();
    const pulled = deferred<void>();
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>(
      {
        pull() {
          pulled.resolve();
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const fetcher = vi.fn<typeof fetch>();
    const init: RequestInit & { duplex: "half" } = {
      body,
      signal: lifetime.signal,
      duplex: "half",
    };
    const result = proxyDocumentRequest(
      request("create", init),
      "create",
      config,
      async () => "native-token",
      fetcher,
    );
    await pulled.promise;
    if (ending === "abort") lifetime.abort();
    else await vi.advanceTimersByTimeAsync(30_001);
    await unavailable(await result, 502);
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(["abort", "deadline"])(
  "%s while receiving download bytes releases no partial body or retry",
  async (ending) => {
    vi.useFakeTimers();
    const lifetime = new AbortController();
    const pulled = deferred<void>();
    let pulls = 0;
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          if (++pulls === 1) controller.enqueue(new Uint8Array([1, 2]));
          else pulled.resolve();
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(body, { headers: { "Content-Length": "2" } }),
    );
    const result = proxyDocumentRequest(
      request("download", { signal: lifetime.signal }),
      "download",
      config,
      async () => "native-token",
      fetcher,
    );
    await pulled.promise;
    if (ending === "abort") lifetime.abort();
    else await vi.advanceTimersByTimeAsync(30_001);
    await unavailable(await result, 502);
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  },
);

it("document-only session bootstrap uses the native Clerk session token without enabling any action operation", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubEnv("MERI_ACTION_WORKFLOW_ENABLED", undefined);
  const getToken = vi.fn(async (...args: unknown[]) =>
    args.length === 0 ? "native-session-token" : "template-capiro-token",
  );
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ synthetic: "session receipt is not validated by proxy" }),
  );
  vi.stubGlobal("fetch", fetcher);
  const make = (operation: string) =>
    new Request(`${origin}/api/action-followthrough/${operation}`, {
      method: "POST",
      body: "{}",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-Meri-Action-Session": credential,
      },
    });
  const session = await actionPost(make("session"), {
    params: Promise.resolve({ operation: "session" }),
  });
  expect(session.status).toBe(200);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher.mock.calls[0]![1]!.headers).toEqual({
    "Content-Type": "application/json",
    Authorization: "Bearer native-session-token",
  });
  for (const operation of ["query", "draft", "prepare", "execute"]) {
    const response = await actionPost(make(operation), {
      params: Promise.resolve({ operation }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "FRONTEND_ACTION_UNAVAILABLE" },
    });
  }
  expect(clerk.auth).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
});

it("actual document route obtains capiro authentication but forwards only opaque bearer", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const getToken = vi.fn(async () => "native-capiro-token");
  clerk.auth.mockResolvedValue({ userId: "synthetic", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "UNAVAILABLE", outcome: "NOT_DISPATCHED" } },
      { status: 503 },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await documentPost(request(), {
    params: Promise.resolve({ operation: "create" }),
  });
  expect(response.status).toBe(503);
  expect(getToken).toHaveBeenCalledExactlyOnceWith({ template: "capiro" });
  expect(fetcher.mock.calls[0]![1]!.headers).toEqual({
    "Content-Type": "application/json",
    Authorization: bearer,
  });
  clerk.auth.mockResolvedValue({ userId: null, getToken });
  await unavailable(
    await documentPost(request(), {
      params: Promise.resolve({ operation: "create" }),
    }),
    401,
  );
  expect(getToken).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
});
