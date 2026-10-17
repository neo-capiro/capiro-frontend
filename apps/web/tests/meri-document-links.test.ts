import { afterEach, describe, expect, it, vi } from "vitest";
import { readDocumentConfig } from "../src/shared/meri-documents/config";
import { proxyDocumentLinkRequest } from "../src/shared/meri-documents/link-proxy";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { createArtifactAccess } from "../src/shared/meri-documents/artifact-access";
import { POST as linkPost } from "../src/app/api/documents/links/[action]/route";
import {
  binary,
  created,
  documentBytes,
  ids,
  inspected,
  jsonResponse,
} from "./meri-document-public-fixtures";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://frontend.example.test";
const credential = `action_session_${"a".repeat(43)}`;
const bearer = `Bearer ${credential}`;
const token = `${"c".repeat(40)}.${"m".repeat(43)}`;
const base = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
};
const conversationOnly = readDocumentConfig({
  ...base,
  MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
});
const disabled = readDocumentConfig(base);
const nativeToken = () => vi.fn(async () => "native-token");
const linkRequest = (
  action: string,
  body: unknown,
  init: {
    headers?: Record<string, string>;
    suffix?: string;
    method?: string;
  } = {},
) =>
  new Request(`${origin}/api/documents/links/${action}${init.suffix ?? ""}`, {
    method: init.method ?? "POST",
    ...(init.method === "GET" ? {} : { body: JSON.stringify(body) }),
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": credential,
      ...init.headers,
    },
  });
async function refused(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    error: { code: "FRONTEND_DOWNLOAD_LINK_UNAVAILABLE" },
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("document read gating", () => {
  it("conversation-only deployments serve version reads but never document writes", async () => {
    expect(conversationOnly).toMatchObject({
      enabled: false,
      readEnabled: true,
    });
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(inspected()));
    const read = await proxyDocumentRequest(
      new Request(`${origin}/api/documents/inspect`, {
        method: "POST",
        body: JSON.stringify({ versionId: ids.version }),
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "X-Meri-Action-Session": credential,
        },
      }),
      "inspect",
      conversationOnly,
      nativeToken(),
      fetcher,
    );
    expect(read.status).toBe(200);
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://meri.example.test/api/documents/inspect",
    );
    const write = await proxyDocumentRequest(
      new Request(`${origin}/api/documents/create`, {
        method: "POST",
        body: "{}",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "X-Meri-Action-Session": credential,
        },
      }),
      "create",
      conversationOnly,
      nativeToken(),
      fetcher,
    );
    expect(write.status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("download link proxy", () => {
  it("forwards a closed issue body with the session bearer and returns the issued link", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ versionId: ids.version, token, expiresAtMs: 1_000 }),
    );
    const response = await proxyDocumentLinkRequest(
      linkRequest("issue", { versionId: ids.version }),
      "issue",
      conversationOnly,
      nativeToken(),
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      versionId: ids.version,
      token,
      expiresAtMs: 1_000,
    });
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://meri.example.test/api/documents/links/issue");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ versionId: ids.version }),
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
    expect(new Headers(init!.headers).get("authorization")).toBe(bearer);
  });

  it("redeems with the token only in the body and relays the attachment bytes", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => binary());
    const response = await proxyDocumentLinkRequest(
      linkRequest("redeem", { token }),
      "redeem",
      conversationOnly,
      nativeToken(),
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(documentBytes);
    expect(response.headers.get("content-disposition")).toContain(
      "Synthetic.txt",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).not.toContain(token);
    expect(init!.body).toBe(JSON.stringify({ token }));
  });

  it("passes the service's closed refusal through with link headers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { code: "DOWNLOAD_LINK_EXPIRED" } }, 410),
    );
    const response = await proxyDocumentLinkRequest(
      linkRequest("redeem", { token }),
      "redeem",
      conversationOnly,
      nativeToken(),
      fetcher,
    );
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: { code: "DOWNLOAD_LINK_EXPIRED" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["unknown action", "download", {}, {}, 404],
    ["GET", "issue", {}, { method: "GET" }, 405],
    ["query token", "redeem", { token }, { suffix: `?token=${token}` }, 400],
    [
      "cross origin",
      "issue",
      { versionId: ids.version },
      { headers: { Origin: "https://evil.example.test" } },
      400,
    ],
    [
      "form body",
      "issue",
      { versionId: ids.version },
      { headers: { "Content-Type": "text/plain" } },
      400,
    ],
    ["extra key", "issue", { versionId: ids.version, tenantId: "x" }, {}, 400],
    ["malformed version", "issue", { versionId: "not-a-uuid" }, {}, 400],
    ["malformed token", "redeem", { token: "abc" }, {}, 400],
    [
      "browser bearer beside the session header",
      "issue",
      { versionId: ids.version },
      { headers: { Authorization: "Bearer native-token" } },
      400,
    ],
    [
      "opaque session sent as a browser bearer",
      "issue",
      { versionId: ids.version },
      { headers: { Authorization: bearer } },
      400,
    ],
    [
      "bearer-prefixed session header",
      "issue",
      { versionId: ids.version },
      { headers: { "X-Meri-Action-Session": bearer } },
      401,
    ],
    [
      "malformed session header",
      "redeem",
      { token },
      { headers: { "X-Meri-Action-Session": "action_session_short" } },
      401,
    ],
  ] as const)(
    "refuses %s before dispatch",
    async (_name, action, body, init, status) => {
      const fetcher = vi.fn<typeof fetch>();
      await refused(
        await proxyDocumentLinkRequest(
          linkRequest(action, body, init),
          action,
          conversationOnly,
          nativeToken(),
          fetcher,
        ),
        status,
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("disabled deployments and missing native sessions never dispatch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const token = nativeToken();
    await refused(
      await proxyDocumentLinkRequest(
        linkRequest("issue", { versionId: ids.version }),
        "issue",
        disabled,
        token,
        fetcher,
      ),
      503,
    );
    expect(token).not.toHaveBeenCalled();
    await refused(
      await proxyDocumentLinkRequest(
        linkRequest("issue", { versionId: ids.version }),
        "issue",
        conversationOnly,
        async () => null,
        fetcher,
      ),
      401,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("a redirected or encoded upstream answer is not relayed", async () => {
    for (const reply of [
      Object.defineProperty(jsonResponse({}), "redirected", { value: true }),
      new Response("{}", {
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
        },
      }),
    ]) {
      await refused(
        await proxyDocumentLinkRequest(
          linkRequest("issue", { versionId: ids.version }),
          "issue",
          conversationOnly,
          nativeToken(),
          async () => reply,
        ),
        502,
      );
    }
  });

  it("the Next route authenticates through Clerk and stays inside the adapter", async () => {
    for (const [key, value] of Object.entries({
      ...base,
      MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
    }))
      vi.stubEnv(key, value);
    clerk.auth.mockResolvedValue({ userId: null });
    const response = await linkPost(
      linkRequest("issue", { versionId: ids.version }),
      { params: Promise.resolve({ action: "issue" }) },
    );
    await refused(response, 401);
    expect(clerk.auth).toHaveBeenCalledTimes(1);
  });
});

describe("artifact access", () => {
  const routes = (
    replies: Partial<Record<string, () => Response>>,
    seen: { url: string; body: string }[],
  ) =>
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      seen.push({ url, body: String(init?.body ?? "") });
      const path = new URL(url, origin).pathname;
      const reply = replies[path];
      if (!reply) throw new Error(`Unexpected ${path}`);
      return reply();
    });

  it("inspects for preview with the session bearer and no download", async () => {
    const seen: { url: string; body: string }[] = [];
    const access = createArtifactAccess(
      credential,
      new AbortController().signal,
      routes(
        { "/api/documents/inspect": () => jsonResponse(inspected()) },
        seen,
      ),
    );
    const reply = await access.inspect(
      ids.version,
      new AbortController().signal,
    );
    expect(reply).toMatchObject({
      ok: true,
      value: {
        versionId: ids.version,
        filename: "Synthetic.txt",
        generationStatus: "draft",
        previewStatus: "pending",
        inspection: { format: "txt" },
      },
    });
    expect(seen.map((item) => item.url)).toEqual(["/api/documents/inspect"]);
  });

  it("downloads through issue then redeem and verifies bytes against the inspected version", async () => {
    const seen: { url: string; body: string }[] = [];
    const access = createArtifactAccess(
      credential,
      new AbortController().signal,
      routes(
        {
          "/api/documents/inspect": () => jsonResponse(inspected()),
          "/api/documents/links/issue": () =>
            jsonResponse({ versionId: ids.version, token, expiresAtMs: 9 }),
          "/api/documents/links/redeem": () => binary(),
        },
        seen,
      ),
    );
    const reply = await access.download(
      ids.version,
      new AbortController().signal,
    );
    expect(reply.ok).toBe(true);
    if (reply.ok) {
      expect(reply.value.filename).toBe("Synthetic.txt");
      expect(reply.value.bytes).toEqual(documentBytes);
    }
    expect(seen.map((item) => item.url)).toEqual([
      "/api/documents/inspect",
      "/api/documents/links/issue",
      "/api/documents/links/redeem",
    ]);
    expect(seen[2]!.body).toBe(JSON.stringify({ token }));
    expect(seen.every((item) => !item.url.includes(token))).toBe(true);
  });

  it("bytes that do not match the inspected version are refused", async () => {
    const access = createArtifactAccess(
      credential,
      new AbortController().signal,
      routes(
        {
          "/api/documents/inspect": () => jsonResponse(inspected()),
          "/api/documents/links/issue": () =>
            jsonResponse({ versionId: ids.version, token, expiresAtMs: 9 }),
          "/api/documents/links/redeem": () =>
            binary(created(), new TextEncoder().encode("Tampered document!")),
        },
        [],
      ),
    );
    expect(
      await access.download(ids.version, new AbortController().signal),
    ).toEqual({ ok: false, code: "DOWNLOAD_UNAVAILABLE" });
  });

  it.each([
    ["issue", "DOWNLOAD_LINKS_UNAVAILABLE", 503],
    ["redeem", "DOWNLOAD_LINK_REVOKED", 410],
  ])("reports the closed %s refusal code", async (step, code, status) => {
    const refusal = () => jsonResponse({ error: { code } }, status);
    const access = createArtifactAccess(
      credential,
      new AbortController().signal,
      routes(
        {
          "/api/documents/inspect": () => jsonResponse(inspected()),
          "/api/documents/links/issue":
            step === "issue"
              ? refusal
              : () =>
                  jsonResponse({
                    versionId: ids.version,
                    token,
                    expiresAtMs: 9,
                  }),
          "/api/documents/links/redeem": refusal,
        },
        [],
      ),
    );
    expect(
      await access.download(ids.version, new AbortController().signal),
    ).toEqual({ ok: false, code });
  });

  it("an issued link for another version is never redeemed", async () => {
    const seen: { url: string; body: string }[] = [];
    const access = createArtifactAccess(
      credential,
      new AbortController().signal,
      routes(
        {
          "/api/documents/inspect": () => jsonResponse(inspected()),
          "/api/documents/links/issue": () =>
            jsonResponse({ versionId: ids.other, token, expiresAtMs: 9 }),
        },
        seen,
      ),
    );
    expect(
      await access.download(ids.version, new AbortController().signal),
    ).toEqual({ ok: false, code: "VERSION_MISMATCH" });
    expect(seen).toHaveLength(2);
  });

  it("an ended session lifetime clears the credential before any request", async () => {
    const lifetime = new AbortController();
    const fetcher = vi.fn<typeof fetch>();
    const access = createArtifactAccess(credential, lifetime.signal, fetcher);
    lifetime.abort();
    const reply = await access.download(
      ids.version,
      new AbortController().signal,
    );
    expect(reply.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
