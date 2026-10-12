import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { assertClientWriter } from "../src/shared/portfolio/auth/client-writer";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import {
  reviewFileMetadata,
  saveFileMetadata,
} from "../src/features/portfolio/files/metadata-actions";
import { fileMetadataAttemptKey } from "../src/features/portfolio/files/metadata-attempt";
import { clientId, file } from "./browser/fixtures";

const restricted = {
  kind: "access",
  viewerMode: "restricted",
  viewerUserIds: [],
} as const;
const change = () => ({ ...restricted, viewerUserIds: [] });
const receipt = { ...file, viewerMode: "restricted" };
function setup(
  respond: (options?: RequestInit) => Response | Promise<Response>,
) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], {
    user: { id: "user-test", email: "synthetic@example.test" },
    tenant: { id: "tenant-test", name: "Synthetic tenant" },
    role: "standard_user",
  });
  cache.setQueryData(currentFilesKey(cache, clientId), [file]);
  const actor = currentFileReader(cache)!;
  const controller = new AbortController();
  const execution = {
    actor,
    signal: controller.signal,
    guard() {
      controller.signal.throwIfAborted();
      assertFileReader(cache, actor);
      assertClientWriter(cache, actor);
    },
  };
  const fetcher = vi.fn((_url: RequestInfo | URL, options?: RequestInit) =>
    Promise.resolve(respond(options)),
  );
  const api = createApiClient(fetcher);
  const key = fileMetadataAttemptKey(clientId, file.id, actor);
  return {
    cache,
    execution,
    controller,
    fetcher,
    api,
    key,
    save: () =>
      saveFileMetadata(api, cache, clientId, file.id, change(), execution),
    review: () => reviewFileMetadata(api, cache, clientId, file.id, execution),
  };
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

describe("single-file metadata write lifetime and review", () => {
  it("freezes a contradictory receipt; only explicit current GET review permits a deliberate new save", async () => {
    let current = file;
    let confirmed = false;
    const state = setup((options) =>
      json(options?.method === "PATCH" && confirmed ? receipt : current),
    );
    await expect(state.save()).rejects.toMatchObject({ status: 502 });
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
      change: change(),
    });
    await expect(state.save()).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).toHaveBeenCalledTimes(1);
    current = { ...file, id: "00000000-0000-4000-8000-000000000099" };
    await expect(state.review()).rejects.toMatchObject({ status: 502 });
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
    current = file;
    await expect(state.review()).resolves.toMatchObject({ viewerMode: "all" });
    expect(state.cache.getQueryData(state.key)).toBeNull();
    confirmed = true;
    await expect(state.save()).resolves.toMatchObject({
      viewerMode: "restricted",
    });
    expect(
      state.fetcher.mock.calls.map(([, options]) => options?.method ?? "GET"),
    ).toEqual(["PATCH", "GET", "GET", "PATCH"]);
  });
  it("permits correction after an explicit native rejection", async () => {
    let reject = true;
    const state = setup(() =>
      reject ? json({ message: "Invalid member" }, 422) : json(receipt),
    );
    await expect(state.save()).rejects.toMatchObject({ status: 422 });
    expect(state.cache.getQueryData(state.key)).toBeNull();
    reject = false;
    await expect(state.save()).resolves.toMatchObject({
      viewerMode: "restricted",
    });
    expect(state.fetcher).toHaveBeenCalledTimes(2);
  });
  it("blocks double dispatch while the first PATCH is pending", async () => {
    let release!: (response: Response) => void;
    const state = setup(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = state.save();
    await expect(state.save()).rejects.toMatchObject({ status: 409 });
    await expect(state.review()).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).toHaveBeenCalledTimes(1);
    release(json(receipt));
    await first;
  });
  it.each(["actor", "abort"])(
    "does not accept a late matching PATCH after %s replacement",
    async (boundary) => {
      let release!: (response: Response) => void;
      const state = setup(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const first = state.save();
      if (boundary === "abort") state.controller.abort();
      else
        state.cache.setQueryData(["identity"], {
          user: { id: "another-user", email: "synthetic@example.test" },
          tenant: { id: "tenant-test", name: "Synthetic tenant" },
          role: "standard_user",
        });
      release(json(receipt));
      await expect(first).rejects.toBeInstanceOf(Error);
      expect(state.cache.getQueryData(state.key)).toMatchObject({
        status: "unknown",
        change: change(),
      });
      expect(
        state.cache.getQueryData(
          fileMetadataAttemptKey(clientId, file.id, {
            userId: "another-user",
            tenantId: "tenant-test",
          }),
        ),
      ).toBeUndefined();
    },
  );
  it("does not release uncertainty from a GET completing after the view is replaced", async () => {
    let release!: (response: Response) => void;
    const state = setup((options) =>
      options?.method === "PATCH"
        ? json(file)
        : new Promise((resolve) => {
            release = resolve;
          }),
    );
    await expect(state.save()).rejects.toBeInstanceOf(ApiError);
    const review = state.review();
    state.controller.abort();
    release(json(receipt));
    await expect(review).rejects.toBeInstanceOf(Error);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
  });
  it("does not dispatch a file missing from the current client collection", async () => {
    const state = setup(() => json(receipt));
    state.cache.setQueryData(currentFilesKey(state.cache, clientId), []);
    await expect(state.save()).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).not.toHaveBeenCalled();
    expect(state.cache.getQueryData(state.key)).toBeUndefined();
  });
});
