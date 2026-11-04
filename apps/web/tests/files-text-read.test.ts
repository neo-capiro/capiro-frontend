import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { extractCurrentFile } from "../src/features/portfolio/files/extraction";
import { currentFilesKey } from "../src/features/portfolio/files/file-reader";
import { attachmentSchema } from "../src/features/portfolio/files/contracts";
import { clientId, file } from "./browser/fixtures";

function setup() {
  const cache = new QueryClient();
  const actor = { userId: "reader", tenantId: "tenant" };
  cache.setQueryData(["identity"], {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: "read_only",
  });
  const selected = attachmentSchema.parse({ ...file, usable: true });
  const key = currentFilesKey(cache, clientId);
  cache.setQueryData(key, [selected]);
  const controller = new AbortController();
  return {
    cache,
    key,
    selected,
    execution: {
      actor,
      signal: controller.signal,
      guard: () => controller.signal.throwIfAborted(),
    },
    controller,
  };
}
describe("repeatable extracted text read", () => {
  it("uses GET with read access, retries safely after unavailable, and leaves file indexing state intact", async () => {
    const { cache, key, selected, execution } = setup();
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ attachmentId: selected.id, text: "Saved text" }),
      )
      .mockResolvedValueOnce(Response.json([selected]));
    const api = createApiClient(request);
    await expect(
      extractCurrentFile(api, cache, clientId, selected, execution),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      extractCurrentFile(api, cache, clientId, selected, execution),
    ).resolves.toMatchObject({ text: "Saved text" });
    expect(
      request.mock.calls.every(
        ([, options]) => options?.method === "GET" && !options.body,
      ),
    ).toBe(true);
    expect(cache.getQueryState(key)?.isInvalidated).toBe(false);
  });
  it("rejects a mismatched receipt and a file changed during the read", async () => {
    const { cache, key, selected, execution } = setup();
    await expect(
      extractCurrentFile(
        createApiClient(async () =>
          Response.json({ attachmentId: clientId, text: "Wrong record" }),
        ),
        cache,
        clientId,
        selected,
        execution,
      ),
    ).rejects.toMatchObject({ status: 502 });
    const api = createApiClient(async () => {
      cache.setQueryData(key, []);
      return Response.json({
        attachmentId: selected.id,
        text: "Obsolete text",
      });
    });
    await expect(
      extractCurrentFile(api, cache, clientId, selected, execution),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("does not dispatch after the initiating view is revoked", async () => {
    const { cache, selected, execution, controller } = setup();
    const request = vi.fn<typeof fetch>();
    controller.abort();
    await expect(
      extractCurrentFile(
        createApiClient(request),
        cache,
        clientId,
        selected,
        execution,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(request).not.toHaveBeenCalled();
  });
});
