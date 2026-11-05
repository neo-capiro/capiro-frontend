import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  uploadParentFile,
  type UploadAttempt,
} from "../src/features/portfolio/files/upload";
import {
  identityDocumentReady,
  readProfileIdentityDocument,
  linkProfileIdentityDocument,
} from "../src/features/portfolio/files/profile-identity-document";
const id = "10000000-0000-4000-8000-000000000001";
const actor = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  userId: "10000000-0000-4000-8000-000000000003",
};
const clientId = "10000000-0000-4000-8000-000000000004";
const file = new File(["Synthetic company source"], "company.txt", {
  type: "text/plain",
});
const ticket = {
  url: "https://storage.example.test/upload",
  fields: { key: "synthetic-key" },
  s3Key: "synthetic-key",
};
const row = {
  id,
  tenantId: actor.tenantId,
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
  viewerMode: "restricted" as const,
  viewerUserIds: [actor.userId],
  uploadedByUserId: actor.userId,
  createdAt: "2026-01-01T00:00:00Z",
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: "pending",
  indexedAt: null,
  usable: true,
};
const scope = () => ({ assert: vi.fn(), signal: new AbortController().signal });

it("uses the existing general upload without creating a placeholder profile and keeps the document private", async () => {
  const request = vi.fn<typeof fetch>(async (url) =>
    Response.json(String(url).endsWith("upload-url") ? ticket : row),
  );
  const storage = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 204 }),
  );
  await expect(
    uploadParentFile(
      createApiClient(request),
      {},
      file,
      { actor },
      () => {},
      "profile_identity",
      storage,
    ),
  ).resolves.toMatchObject(row);
  expect(request.mock.calls.map(([url]) => url)).toEqual([
    "/api/backend/core/engagement/attachments/upload-url",
    "/api/backend/core/engagement/attachments/confirm",
  ]);
  const confirm = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
  expect(confirm).toMatchObject({
    source: "profile_identity",
    s3Key: ticket.s3Key,
  });
  expect(confirm).not.toHaveProperty("clientId");
  expect(confirm).not.toHaveProperty("prospectId");
  expect(storage).toHaveBeenCalledOnce();
});

it("does not expand ordinary parent uploads or accept identity uploads without a captured uploader", async () => {
  const request = vi.fn<typeof fetch>();
  const api = createApiClient(request);
  await expect(
    uploadParentFile(api, {}, file, { actor }, () => {}),
  ).rejects.toThrow("Choose a client or meeting");
  await expect(
    uploadParentFile(api, {}, file, {}, () => {}, "profile_identity"),
  ).rejects.toThrow("uploader-owned");
  await expect(
    uploadParentFile(
      api,
      { clientId },
      file,
      { actor },
      () => {},
      "profile_identity",
    ),
  ).rejects.toThrow("uploader-owned");
  expect(request).not.toHaveBeenCalled();
});

it.each([
  { viewerMode: "all", viewerUserIds: [] },
  { tenantId: clientId },
  { prospectId: clientId },
])(
  "rejects a broadened or misbound identity upload receipt: %j",
  async (patch) => {
    const request = vi.fn<typeof fetch>(async (url) =>
      Response.json(
        String(url).endsWith("upload-url") ? ticket : { ...row, ...patch },
      ),
    );
    await expect(
      uploadParentFile(
        createApiClient(request),
        {},
        file,
        { actor },
        () => {},
        "profile_identity",
        async () => new Response(null, { status: 204 }),
      ),
    ).rejects.toMatchObject({ status: 502 });
  },
);

it("retries the original confirmation after a lost response without uploading another copy", async () => {
  let dropped = false;
  const request = vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith("upload-url")) return Response.json(ticket);
    if (!dropped) {
      dropped = true;
      throw new Error("Lost receipt");
    }
    return Response.json(row);
  });
  const storage = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 204 }),
  );
  const attempt: UploadAttempt = { actor };
  const upload = () =>
    uploadParentFile(
      createApiClient(request),
      {},
      file,
      attempt,
      () => {},
      "profile_identity",
      storage,
    );
  await expect(upload()).rejects.toThrow();
  await expect(upload()).resolves.toMatchObject({ id });
  expect(storage).toHaveBeenCalledOnce();
  expect(
    request.mock.calls.filter(([url]) => String(url).endsWith("upload-url")),
  ).toHaveLength(1);
  expect(request.mock.calls[1]?.[1]?.body).toBe(
    request.mock.calls[2]?.[1]?.body,
  );
});

it("reads server safety readiness without claiming unlinked text has already been extracted", async () => {
  const result = await readProfileIdentityDocument(
    createApiClient(async () => Response.json([row])),
    id,
    actor,
    scope(),
  );
  expect(identityDocumentReady(result)).toBe(true);
  expect(result.extractionStatus).toBe("pending");
  expect(
    identityDocumentReady({
      ...result,
      usable: false,
      lifecycleStatus: "quarantined",
    }),
  ).toBe(false);
});

it.each([
  { rows: [] },
  { rows: [{ ...row, uploadedByUserId: clientId }] },
  { rows: [{ ...row, viewerMode: "all" }] },
  { rows: [{ ...row, clientId }] },
])(
  "does not release unavailable, moved or differently owned document metadata: %j",
  async ({ rows }) => {
    await expect(
      readProfileIdentityDocument(
        createApiClient(async () => Response.json(rows)),
        id,
        actor,
        scope(),
      ),
    ).rejects.toThrow("no longer available");
  },
);

it("links the same document privately by default and shares only with the explicit choice", async () => {
  const request = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return Response.json({
      ...row,
      clientId,
      ...(body.shareWithProfile
        ? { viewerMode: "all", viewerUserIds: [] }
        : {}),
    });
  });
  const api = createApiClient(request);
  await expect(
    linkProfileIdentityDocument(
      api,
      id,
      { kind: "client", id: clientId },
      scope(),
    ),
  ).resolves.toMatchObject({ id, clientId, viewerMode: "restricted" });
  await expect(
    linkProfileIdentityDocument(
      api,
      id,
      { kind: "client", id: clientId },
      scope(),
      true,
    ),
  ).resolves.toMatchObject({ id, clientId, viewerMode: "all" });
  expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({
    clientId,
  });
  expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body))).toEqual({
    clientId,
    shareWithProfile: true,
  });
  expect(
    request.mock.calls.every(([url]) =>
      String(url).endsWith(`/attachments/${id}/profile-link`),
    ),
  ).toBe(true);
});

it("rejects a link receipt with a different attachment or target", async () => {
  await expect(
    linkProfileIdentityDocument(
      createApiClient(async () =>
        Response.json({ ...row, id: clientId, clientId }),
      ),
      id,
      { kind: "client", id: clientId },
      scope(),
    ),
  ).rejects.toMatchObject({ status: 502 });
});

it("an aborted or revoked identity document read sends no request", async () => {
  const request = vi.fn<typeof fetch>();
  const controller = new AbortController();
  controller.abort();
  await expect(
    readProfileIdentityDocument(createApiClient(request), id, actor, {
      assert: () => {},
      signal: controller.signal,
    }),
  ).rejects.toThrow();
  await expect(
    linkProfileIdentityDocument(
      createApiClient(request),
      id,
      { kind: "client", id: clientId },
      {
        assert: () => {
          throw new Error("Session changed");
        },
        signal: scope().signal,
      },
    ),
  ).rejects.toThrow("Session changed");
  expect(request).not.toHaveBeenCalled();
});
