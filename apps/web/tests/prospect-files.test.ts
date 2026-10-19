import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  prepareProspectUpload,
  uploadProspectFile,
} from "../src/features/portfolio/files/prospect-upload";
import {
  prospectFileListSchema,
  deleteProspectFile,
} from "../src/features/portfolio/files/prospect-files";
import {
  actor,
  prospectId,
  requestId,
  otherId,
  attachment,
  checksum,
} from "./prospect-resources-fixtures";
const guard = () => {};
const signal = () => new AbortController().signal;
const prepare = () =>
  prepareProspectUpload(
    prospectId,
    actor,
    new File(["hello"], "test.txt", { type: "text/plain" }),
    requestId,
    guard,
  );
const ticket = {
  url: "https://storage.example.test",
  s3Key: attachment.s3Key,
  uploadIntentId: otherId,
  requestId,
  expiresAt: "2099-10-12T12:00:00Z",
  fields: {
    key: attachment.s3Key,
    "Content-Type": "text/plain",
    "x-amz-checksum-algorithm": "SHA256",
    "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString("base64"),
  },
};
describe("prospect files canonical lineage and exact upload", () => {
  it("hashes the actual bytes before an upload intent", async () =>
    expect((await prepare()).checksumSha256).toBe(checksum));
  for (const field of [
    "tenantId",
    "prospectId",
    "clientId",
    "meetingId",
    "mailMessageId",
  ] as const)
    it(`rejects mixed ${field} in a current list`, () =>
      expect(
        prospectFileListSchema(prospectId, actor.tenantId).safeParse([
          { ...attachment, [field]: otherId },
        ]).success,
      ).toBe(false));
  it("rejects duplicate IDs", () =>
    expect(
      prospectFileListSchema(prospectId, actor.tenantId).safeParse([
        attachment,
        attachment,
      ]).success,
    ).toBe(false));
  it("retains the intent and bytes after a lost confirmation, using only the original confirm", async () => {
    const bodies: Record<string, unknown>[] = [];
    let confirms = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        if (String(url).endsWith("upload-url")) return Response.json(ticket);
        return ++confirms === 1
          ? Response.json({ message: "Unknown" }, { status: 503 })
          : Response.json(attachment);
      });
    const storage = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient(fetcher);
    const attempt = await prepare();
    await expect(
      uploadProspectFile(api, attempt, signal(), guard, guard, storage),
    ).rejects.toThrow();
    await expect(
      uploadProspectFile(api, attempt, signal(), guard, guard, storage),
    ).resolves.toMatchObject({ id: attachment.id });
    expect(storage).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(bodies[0]).toEqual({
      prospectId,
      requestId,
      fileName: "test.txt",
      contentType: "text/plain",
      contentLength: 5,
      checksumSha256: checksum,
    });
    expect(bodies[1]).toEqual(bodies[2]);
    const form = storage.mock.calls[0]![1]!.body as FormData;
    for (const [key, value] of Object.entries(ticket.fields))
      expect(form.get(key)).toBe(value);
  });
  it("does not re-upload bytes after a lost storage result", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        Response.json(String(url).endsWith("upload-url") ? ticket : attachment),
      );
    const storage = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("Disconnected"));
    const attempt = await prepare();
    const api = createApiClient(fetcher);
    await expect(
      uploadProspectFile(api, attempt, signal(), guard, guard, storage),
    ).rejects.toThrow("Disconnected");
    await uploadProspectFile(api, attempt, signal(), guard, guard, storage);
    expect(storage).toHaveBeenCalledTimes(1);
  });
  for (const field of [
    "prospectId",
    "tenantId",
    "uploadedByUserId",
    "checksumSha256",
    "calculatedSha256",
    "s3Key",
    "fileName",
    "contentType",
    "byteSize",
  ] as const)
    it(`rejects a wrong ${field} confirmation without minting another intent`, async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockImplementation(async (url) =>
          Response.json(
            String(url).endsWith("upload-url")
              ? ticket
              : { ...attachment, [field]: field === "byteSize" ? 99 : otherId },
          ),
        );
      const attempt = await prepare();
      const storage = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 204 }));
      await expect(
        uploadProspectFile(
          createApiClient(fetcher),
          attempt,
          signal(),
          guard,
          guard,
          storage,
        ),
      ).rejects.toThrow();
      expect(attempt.ticket?.requestId).toBe(requestId);
      expect(storage).toHaveBeenCalledTimes(1);
    });
  it("rejects a changed presigned content type before storage", async () => {
    const storage = vi.fn<typeof fetch>();
    const api = createApiClient(
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          ...ticket,
          fields: { ...ticket.fields, "Content-Type": "text/html" },
        }),
      ),
    );
    await expect(
      uploadProspectFile(api, await prepare(), signal(), guard, guard, storage),
    ).rejects.toThrow();
    expect(storage).not.toHaveBeenCalled();
  });
  it("reads the current list and refuses a missing file without DELETE", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
    await expect(
      deleteProspectFile(
        createApiClient(fetcher),
        prospectId,
        actor,
        attachment.id,
        signal(),
        guard,
      ),
    ).rejects.toThrow("no longer available");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("authority loss between the current list and delete sends zero DELETEs", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([attachment]));
    let reads = 0;
    await expect(
      deleteProspectFile(
        createApiClient(fetcher),
        prospectId,
        actor,
        attachment.id,
        signal(),
        () => {
          if (++reads > 1) throw new Error("Expired");
        },
      ),
    ).rejects.toThrow("Expired");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
