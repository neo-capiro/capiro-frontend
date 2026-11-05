import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import { useProfileIdentityDocument } from "../src/features/portfolio/files/useProfileIdentityDocument";
const state = vi.hoisted(() => ({ api: undefined as ApiClient | undefined }));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => state.api,
}));
const id = "10000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000002";
const userId = "10000000-0000-4000-8000-000000000003";
const identity = {
  user: { id: userId, email: null },
  tenant: { id: tenantId, name: "Synthetic" },
  role: "standard_user",
};
afterEach(() => vi.unstubAllGlobals());
it("an intake with no selected file renders idle without reading optional upload or progress state", async () => {
  const request = vi.fn<typeof fetch>();
  state.api = createApiClient(request);
  const cache = new QueryClient();
  cache.setQueryData(["identity"], identity);
  const capture = vi.fn(() => ({
    assert: () => {},
    signal: new AbortController().signal,
  }));
  let document: ReturnType<typeof useProfileIdentityDocument> | undefined;
  function Probe() {
    document = useProfileIdentityDocument({ active: true, capture });
    return null;
  }
  expect(() =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Probe),
      ),
    ),
  ).not.toThrow();
  expect(document).toMatchObject({
    ready: false,
    pending: false,
    stage: undefined,
    attachment: undefined,
  });
  await expect(document!.ensureReady()).rejects.toThrow(
    "Choose a supporting document",
  );
  expect(capture).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
  cache.clear();
});
function setup(cancelBytes = true) {
  const file = new File(["Synthetic company"], "identity.txt", {
    type: "text/plain",
  });
  const ticket = {
    url: "https://storage.example.test/upload",
    s3Key: "original-key",
    fields: { key: "original-key" },
  };
  const row = {
    id,
    tenantId,
    clientId: null,
    prospectId: null,
    meetingId: null,
    mailMessageId: null,
    fileName: file.name,
    contentType: file.type,
    byteSize: file.size,
    source: "profile_identity",
    s3Key: ticket.s3Key,
    folder: null,
    viewerMode: "restricted",
    viewerUserIds: [userId],
    uploadedByUserId: userId,
    createdAt: "2026-01-01T00:00:00Z",
    lifecycleStatus: "ready",
    scanStatus: "clean",
    extractionStatus: "pending",
    indexedAt: null,
    usable: true,
  };
  const request = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("upload-url")
        ? ticket
        : String(url).includes("unlinked=true")
          ? [row]
          : row,
    ),
  );
  state.api = createApiClient(request);
  const aborted = new AbortController();
  const fresh = new AbortController();
  const storage = vi.fn<typeof fetch>(async () => {
    if (cancelBytes) {
      aborted.abort();
      throw new Error("Canceled bytes");
    }
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", storage);
  const capture = vi
    .fn()
    .mockImplementationOnce(() => ({
      assert: () => {},
      signal: aborted.signal,
    }))
    .mockImplementation(() => ({ assert: () => {}, signal: fresh.signal }));
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  cache.setQueryData(["identity"], identity);
  let document: ReturnType<typeof useProfileIdentityDocument> | undefined;
  function Probe() {
    document = useProfileIdentityDocument({ file, active: true, capture });
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Probe)),
  );
  return { document: document!, request, storage, capture, cache, aborted };
}
it("a confirmed document is reread under a new scope without reconfirming or reuploading bytes", async () => {
  const f = setup(false);
  await expect(f.document.ensureReady()).resolves.toMatchObject({ id });
  f.aborted.abort();
  await expect(f.document.ensureReady()).resolves.toMatchObject({ id });
  expect(f.storage).toHaveBeenCalledOnce();
  expect(
    f.request.mock.calls.filter(([url]) => String(url).endsWith("/confirm")),
  ).toHaveLength(1);
  expect(
    f.request.mock.calls.filter(([url]) =>
      String(url).includes("unlinked=true"),
    ),
  ).toHaveLength(2);
  f.cache.clear();
});
it("a canceled upload resumes its original confirmation with a fresh scope for the same actor", async () => {
  const f = setup();
  await expect(f.document.ensureReady()).rejects.toThrow(
    "completion is unknown",
  );
  await expect(f.document.ensureReady()).resolves.toMatchObject({
    id,
    usable: true,
  });
  expect(f.capture).toHaveBeenCalledTimes(2);
  expect(f.storage).toHaveBeenCalledOnce();
  expect(f.request.mock.calls.map(([url]) => url)).toEqual([
    "/api/backend/core/engagement/attachments/upload-url",
    "/api/backend/core/engagement/attachments/confirm",
    "/api/backend/core/engagement/attachments?unlinked=true",
  ]);
  expect(f.request.mock.calls[1]?.[1]?.signal?.aborted).toBe(false);
  f.cache.clear();
});
it("a new actor cannot recover another uploader's retained ticket", async () => {
  const f = setup();
  await expect(f.document.ensureReady()).rejects.toThrow(
    "completion is unknown",
  );
  f.cache.setQueryData(["identity"], {
    ...identity,
    user: { id: "10000000-0000-4000-8000-000000000004", email: null },
  });
  await expect(f.document.ensureReady()).rejects.toMatchObject({ status: 403 });
  expect(f.request).toHaveBeenCalledOnce();
  expect(f.storage).toHaveBeenCalledOnce();
  f.cache.clear();
});
