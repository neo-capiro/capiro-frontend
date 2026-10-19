import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { attachmentSchema } from "../src/features/portfolio/files/contracts";
import { currentFilesKey } from "../src/features/portfolio/files/file-reader";
import { currentFileDestination } from "../src/features/portfolio/files/navigation";

const clientId = "10000000-0000-4000-8000-000000000001";
const file = attachmentSchema.parse({
  id: "60000000-0000-4000-8000-000000000001",
  clientId,
  source: "capability:40000000-0000-4000-8000-000000000001",
  fileName: "Synthetic source.txt",
  contentType: "text/plain",
  byteSize: 5,
  folder: null,
  viewerMode: "all",
  viewerUserIds: [],
  uploadedByUserId: "user-test",
  createdAt: "2026-10-11T12:00:00Z",
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: "extracted",
  indexedAt: null,
  usable: true,
  downloadUrl: "https://storage.example.test/current-download",
  previewUrl: null,
});

function fixture() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const controller = new AbortController();
  const execution = {
    actor: { userId: "user-test", tenantId: "tenant-test" },
    signal: controller.signal,
    guard: () => controller.signal.throwIfAborted(),
  };
  cache.setQueryData(["identity"], {
    user: { id: "user-test", email: "synthetic@example.test" },
    tenant: { id: "tenant-test", name: "Synthetic tenant" },
    role: "standard_user",
  });
  cache.setQueryData(currentFilesKey(cache, clientId), [file]);
  return { cache, controller, execution };
}

describe("current document navigation receipts", () => {
  it("accepts an unchanged successful authorized GET even when the cache structurally shares its previous data", async () => {
    const { cache, execution } = fixture();
    const original = cache.getQueryData(currentFilesKey(cache, clientId));
    let reads = 0;
    const destination = await currentFileDestination(
      createApiClient(async () => {
        reads += 1;
        return Response.json([file]);
      }),
      cache,
      clientId,
      file,
      "download",
      execution,
    );
    expect(reads).toBe(1);
    expect(cache.getQueryData(currentFilesKey(cache, clientId))).toBe(original);
    expect(destination.url).toBe(file.downloadUrl);
    expect(() => destination.guard()).not.toThrow();
  });

  it("refuses a cache update while the authorized read was held", async () => {
    const { cache, execution } = fixture();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = new Promise<void>((resolve) => {
      started = resolve;
    });
    const result = currentFileDestination(
      createApiClient(async () => {
        started();
        await gate;
        return Response.json([file]);
      }),
      cache,
      clientId,
      file,
      "download",
      execution,
    );
    await pending;
    cache.setQueryData(currentFilesKey(cache, clientId), []);
    release();
    await expect(result).rejects.toMatchObject({ status: 409 });
  });

  for (const change of ["new-list", "invalidated", "aborted"] as const) {
    it(`rechecks the ${change} boundary immediately before navigation`, async () => {
      const { cache, controller, execution } = fixture();
      const destination = await currentFileDestination(
        createApiClient(async () => Response.json([file])),
        cache,
        clientId,
        file,
        "download",
        execution,
      );
      if (change === "new-list")
        cache.setQueryData(currentFilesKey(cache, clientId), []);
      if (change === "invalidated")
        await cache.invalidateQueries({
          queryKey: currentFilesKey(cache, clientId),
          exact: true,
          refetchType: "none",
        });
      if (change === "aborted") controller.abort();
      expect(() => destination.guard()).toThrow();
    });
  }
});
