import { expect, it, vi } from "vitest";
import { createPreviewAccess } from "../src/shared/meri-documents/preview-access";
import { DocumentPreviewController } from "../src/features/meri/files/preview-state";
import { proxyDocumentRequest } from "../src/shared/meri-documents/proxy";
import { clearMeriConversationScope } from "../src/shared/meri-conversations/tab-journal";
import { nativeInspection } from "./meri-document-access-fixtures";
import {
  previewSource,
  previewResponse,
  memoryStorage,
} from "./meri-preview-revision-fixtures";
import { session, ids } from "./meri-document-public-fixtures";
const signal = () => new AbortController().signal;
function reader(binary = previewResponse) {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith("/inspect")
      ? Response.json(previewSource())
      : binary(),
  );
  return {
    fetcher,
    port: createPreviewAccess(session.credential, signal(), fetcher),
  };
}
it("reads after fresh inspect and reload without publication or a model/session allocation", async () => {
  const { port, fetcher } = reader();
  for (let i = 0; i < 2; i++) {
    const result = await port.readPreview(ids.version, signal());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.preview.nativeQualified).toBe(false);
  }
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    "/api/documents/inspect",
    "/api/documents/preview",
    "/api/documents/inspect",
    "/api/documents/preview",
  ]);
});
it.each([
  "x-meri-preview-source-version",
  "x-meri-preview-source-sha256",
  "x-meri-preview-sha256",
  "content-security-policy",
])("refuses preview %s tampering", async (name) => {
  const { port } = reader(() => previewResponse({ [name]: "wrong" }));
  expect((await port.readPreview(ids.version, signal())).ok).toBe(false);
});
it("rejects tampered bytes and native metadata before a preview can be displayed", async () => {
  const { port } = reader(() => previewResponse({}, new Uint8Array(33)));
  expect((await port.readPreview(ids.version, signal())).ok).toBe(false);
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(nativeInspection()),
  );
  expect(
    await createPreviewAccess(
      session.credential,
      signal(),
      fetcher,
    ).readPreview(ids.version, signal()),
  ).toEqual({
    ok: false,
    code: "NATIVE_PREVIEW_UNSUPPORTED",
    outcome: "NOT_DISPATCHED",
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("forwards only named sandbox/source/byte headers, separately from explicit publication", async () => {
  const origin = "https://frontend.synthetic.invalid";
  const config = {
    enabled: false,
    readEnabled: true,
    operation: null,
    baseUrl: "https://meri.synthetic.invalid",
    requestOrigin: origin,
  };
  const fetcher = vi.fn<typeof fetch>(async () =>
    previewResponse({ "x-private-storage": "must-not-escape" }),
  );
  const request = new Request(`${origin}/api/documents/preview`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": session.credential,
    },
    body: JSON.stringify({ versionId: ids.version }),
  });
  const response = await proxyDocumentRequest(
    request,
    "preview",
    config,
    async () => "synthetic-native",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("x-meri-preview-source-version")).toBe(
    ids.version,
  );
  expect(response.headers.get("content-security-policy")).toBe(
    "sandbox; default-src 'none'",
  );
  expect(response.headers.has("x-private-storage")).toBe(false);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "https://meri.synthetic.invalid/api/documents/preview",
  );
});
it("retains canonical current-write refusal without silently allocating another run", async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith("/inspect")
      ? Response.json(previewSource())
      : Response.json(
          { error: { code: "ACCESS_DENIED", outcome: "NOT_DISPATCHED" } },
          { status: 403 },
        ),
  );
  const result = await createPreviewAccess(
    session.credential,
    signal(),
    fetcher,
  ).publishPreview(ids.version, signal());
  expect(result).toEqual({
    ok: false,
    code: "ACCESS_DENIED",
    outcome: "NOT_DISPATCHED",
    accessDenied: true,
  });
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    "/api/documents/inspect",
    "/api/documents/preview-publish",
  ]);
});
it("unknown publication survives reload, blocks replay, and can only clear on a verified read", async () => {
  const storage = memoryStorage(),
    { port } = reader();
  const publish = vi.fn(async () => ({
    ok: false as const,
    code: "PREVIEW_PUBLICATION_UNKNOWN",
  }));
  const ports = { ...port, publishPreview: publish };
  const urls = { create: vi.fn(() => "blob:synthetic"), revoke: vi.fn() };
  const first = new DocumentPreviewController(
    ports,
    session.context,
    ids.version,
    storage,
    urls,
  );
  const detach = first.attach();
  await first.publish();
  expect(first.getSnapshot().publication).toBe("unresolved");
  detach();
  const second = new DocumentPreviewController(
    ports,
    session.context,
    ids.version,
    storage,
    urls,
  );
  const close = second.attach();
  await second.publish();
  expect(publish).toHaveBeenCalledTimes(1);
  await second.read();
  expect(second.getSnapshot().publication).toBe("complete");
  expect(second.getSnapshot().url).toBe("blob:synthetic");
  close();
  expect(urls.revoke).toHaveBeenCalledWith("blob:synthetic");
});
it("scope revocation blocks publication before dispatch", async () => {
  const storage = memoryStorage(),
    { port } = reader();
  const publish = vi.fn(port.publishPreview);
  const c = new DocumentPreviewController(
    { ...port, publishPreview: publish },
    session.context,
    ids.version,
    storage,
  );
  c.attach();
  clearMeriConversationScope(
    { ...session.context, clientId: session.context.selectedClientId },
    storage,
  );
  await c.publish();
  expect(publish).not.toHaveBeenCalled();
  expect(c.getSnapshot().publication).toBe("blocked");
});

it("only an explicit NOT_DISPATCHED receipt releases a publication fence", async () => {
  const storage = memoryStorage(),
    { port } = reader();
  const publish = vi.fn(async () => ({
    ok: false as const,
    code: "ARTIFACT_RENDERER_UNAVAILABLE",
    outcome: "NOT_DISPATCHED" as const,
  }));
  const c = new DocumentPreviewController(
    { ...port, publishPreview: publish },
    session.context,
    ids.version,
    storage,
  );
  const detach = c.attach();
  await c.publish();
  expect(c.getSnapshot().publication).toBe("available");
  await c.publish();
  expect(publish).toHaveBeenCalledTimes(2);
  detach();
});
it("failed revalidation removes an older preview URL and detach drops a late reply", async () => {
  const { port } = reader(),
    storage = memoryStorage(),
    urls = { create: vi.fn(() => "blob:synthetic"), revoke: vi.fn() };
  const read = vi.fn(port.readPreview);
  const c = new DocumentPreviewController(
    { ...port, readPreview: read },
    session.context,
    ids.version,
    storage,
    urls,
  );
  const detach = c.attach();
  await c.read();
  read.mockResolvedValueOnce({
    ok: false,
    code: "ACCESS_DENIED",
    accessDenied: true,
  });
  await c.read();
  expect(c.getSnapshot().url).toBeNull();
  expect(urls.revoke).toHaveBeenCalledOnce();
  let resolve!: (reply: Awaited<ReturnType<typeof port.readPreview>>) => void;
  read.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = c.read();
  detach();
  resolve(await port.readPreview(ids.version, signal()));
  await pending;
  expect(c.getSnapshot().url).toBeNull();
  expect(urls.create).toHaveBeenCalledOnce();
});
function failingRead(code: string) {
  return vi.fn(async () => ({ ok: false as const, code }));
}
const neverPublished = vi.fn(async () => ({
  ok: false as const,
  code: "PREVIEW_PUBLICATION_UNKNOWN",
}));
const readPort = (code: string) => ({
  readPreview: failingRead(code),
  publishPreview: neverPublished,
  pending: () => false,
});
async function readMessage(code: string) {
  const c = new DocumentPreviewController(
    readPort(code),
    session.context,
    ids.version,
    memoryStorage(),
  );
  const detach = c.attach();
  await c.read();
  const message = c.getSnapshot().message ?? "";
  detach();
  return message;
}
/** Synthetic self-consistent refusal envelope, pinned to the published error statuses. */
function refusedPreview(code: string, status: number) {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith("/inspect")
      ? Response.json(previewSource())
      : Response.json(
          { error: { code, outcome: "NOT_DISPATCHED" } },
          { status },
        ),
  );
  return createPreviewAccess(session.credential, signal(), fetcher);
}
/**
 * Records the admitted read boundary rather than the ideal one: the published contract exposes no
 * read-refusal receiver, so a recorded 409/503 refusal can only arrive as an uncompleted read. If a
 * read-refusal receiver is added, these two cases must start asserting their own words instead.
 */
it.each([
  ["ARTIFACT_PREVIEW_PENDING", 409],
  ["PREVIEW_UNAVAILABLE", 503],
])(
  "a preview read refused as %s is stated as an uncompleted read, never as a stored record",
  async (code, status) => {
    const port = refusedPreview(code, status);
    expect(await port.readPreview(ids.version, signal())).toEqual({
      ok: false,
      code: "PREVIEW_READ_UNAVAILABLE",
    });
    const c = new DocumentPreviewController(
      port,
      session.context,
      ids.version,
      memoryStorage(),
    );
    const detach = c.attach();
    await c.read();
    expect(c.getSnapshot().message).toBe(
      "The preview read did not complete, so no preview result is known.",
    );
    expect(c.getSnapshot().message).not.toMatch(
      /no stored preview|not configured/i,
    );
    expect(c.getSnapshot().url).toBeNull();
    expect(c.getSnapshot().publication).not.toBe("complete");
    detach();
  },
);
it.each([
  [
    "PREVIEW_UNAVAILABLE",
    503,
    "PDF preview is not configured for this environment.",
  ],
  [
    "ARTIFACT_PREVIEW_PENDING",
    409,
    "No stored preview record exists for this saved version. A missing record does not prove that a publication is not in flight.",
  ],
  [
    "ACCESS_DENIED",
    403,
    "Current authority refused this preview action. Reading an existing preview and publishing a new one have separate permissions.",
  ],
])(
  "a publication receipt that admits %s is stated as that state",
  async (code, status, stated) => {
    const port = refusedPreview(code, status);
    const c = new DocumentPreviewController(
      port,
      session.context,
      ids.version,
      memoryStorage(),
    );
    const detach = c.attach();
    await c.publish();
    expect(c.getSnapshot().message).toBe(stated);
    expect(c.getSnapshot().publication).toBe("available");
    expect(c.getSnapshot().url).toBeNull();
    detach();
  },
);
it("keeps unsupported, refused, unread and unlisted preview results apart", async () => {
  const [artifact, native, refusedRead, unread, unlisted] = await Promise.all(
    [
      "ARTIFACT_PREVIEW_UNSUPPORTED",
      "NATIVE_PREVIEW_UNSUPPORTED",
      "SESSION_REFUSED",
      "PREVIEW_READ_UNAVAILABLE",
      "SOME_UNLISTED_READ_CODE",
    ].map((code) => readMessage(code)),
  );
  expect(artifact).toBe(native);
  expect(new Set([artifact, refusedRead, unread]).size).toBe(3);
  expect(unread).not.toBe(unlisted);
  expect(unlisted).toBe("No verified preview result was returned.");
});
it("an unread preview leaves an unresolved publication fence and dispatches nothing more", async () => {
  const publish = vi.fn(async () => ({
    ok: false as const,
    code: "PREVIEW_PUBLICATION_UNKNOWN",
  }));
  const c = new DocumentPreviewController(
    {
      readPreview: failingRead("PREVIEW_READ_UNAVAILABLE"),
      publishPreview: publish,
      pending: () => false,
    },
    session.context,
    ids.version,
    memoryStorage(),
  );
  const detach = c.attach();
  await c.publish();
  expect(c.getSnapshot().publication).toBe("unresolved");
  await c.read();
  expect(c.getSnapshot().message).toBe(
    "The preview read did not complete, so no preview result is known.",
  );
  expect(c.getSnapshot().publication).toBe("unresolved");
  expect(c.getSnapshot().url).toBeNull();
  await c.publish();
  expect(publish).toHaveBeenCalledTimes(1);
  detach();
});
