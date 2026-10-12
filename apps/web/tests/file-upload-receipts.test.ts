import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  uploadParentFile,
  type UploadAttempt,
} from "../src/features/portfolio/files/upload";

const clientId = "10000000-0000-4000-8000-000000000001";
const source = "capability:40000000-0000-4000-8000-000000000001";
const actor = { userId: "user-test", tenantId: "tenant-test" };
const file = new File(["hello"], "source.txt", { type: "text/plain" });
const ticket = {
  url: "https://storage.example.test/upload",
  fields: { key: "native-ticket-key" },
  s3Key: "native-ticket-key",
};
const receipt = {
  id: "60000000-0000-4000-8000-000000000001",
  clientId,
  fileName: file.name,
  contentType: file.type,
  byteSize: 5,
  source,
  s3Key: ticket.s3Key,
  folder: null,
  viewerMode: "all",
  viewerUserIds: [],
  uploadedByUserId: actor.userId,
  createdAt: "2026-10-11T12:00:00Z",
  lifecycleStatus: "quarantined",
  scanStatus: "pending",
  extractionStatus: "pending",
  indexedAt: null,
};

describe("capability upload native receipts", () => {
  it("refuses a ticket whose posted storage key disagrees with its confirmation key before sending bytes", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ ...ticket, fields: { key: "another-storage-key" } }),
      );
    const storage = vi.fn<typeof fetch>();
    await expect(
      uploadParentFile(
        createApiClient(request),
        { clientId },
        file,
        { actor },
        () => {},
        source,
        storage,
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(storage).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledOnce();
  });

  for (const [field, wrong] of [
    ["source", "manual"],
    ["s3Key", "another-storage-key"],
    ["uploadedByUserId", "another-user"],
  ]) {
    it(`refuses a confirmation whose ${field} differs from the initiating attempt without resending bytes`, async () => {
      let correct = false;
      const request = vi
        .fn<typeof fetch>()
        .mockImplementation(async (url) =>
          Response.json(
            String(url).endsWith("upload-url")
              ? ticket
              : correct
                ? receipt
                : { ...receipt, [field!]: wrong },
          ),
        );
      const storage = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 204 }));
      const attempt: UploadAttempt = { actor };
      const api = createApiClient(request);
      await expect(
        uploadParentFile(
          api,
          { clientId },
          file,
          attempt,
          () => {},
          source,
          storage,
        ),
      ).rejects.toMatchObject({ status: 502 });
      expect(attempt.bytesUploaded).toBe(true);
      expect(attempt.ticket?.s3Key).toBe(ticket.s3Key);
      correct = true;
      await expect(
        uploadParentFile(
          api,
          { clientId },
          file,
          attempt,
          () => {},
          source,
          storage,
        ),
      ).resolves.toMatchObject(receipt);
      expect(storage).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledTimes(3);
      expect(JSON.parse(String(request.mock.calls[2]?.[1]?.body))).toEqual({
        clientId,
        fileName: file.name,
        contentType: file.type,
        s3Key: ticket.s3Key,
        source,
      });
    });
  }

  it("treats a storage 503 as an unknown byte result and retries only confirmation with its original key", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        Response.json(String(url).endsWith("upload-url") ? ticket : receipt),
      );
    const storage = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    const attempt: UploadAttempt = { actor };
    const api = createApiClient(request);
    await expect(
      uploadParentFile(
        api,
        { clientId },
        file,
        attempt,
        () => {},
        source,
        storage,
      ),
    ).rejects.toThrow("completion is unknown");
    expect(attempt.storageUnknown).toBe(true);
    expect(request).toHaveBeenCalledOnce();
    await expect(
      uploadParentFile(
        api,
        { clientId },
        file,
        attempt,
        () => {},
        source,
        storage,
      ),
    ).resolves.toMatchObject(receipt);
    expect(storage).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(attempt.storageUnknown).toBe(false);
  });
});
