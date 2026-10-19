import { QueryClient } from "@tanstack/react-query";
import { afterEach, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { assertClientWriter } from "../src/shared/portfolio/auth/client-writer";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import {
  folderAccessKey,
  reviewFolderAccess,
  saveFolderAccess,
} from "../src/features/portfolio/files/folder-access";
import type { FolderAccessChange } from "../src/features/portfolio/files/contracts";
import { clientId, file } from "./browser/fixtures";

const caches = new Set<QueryClient>();
afterEach(() => {
  for (const cache of caches) cache.clear();
  caches.clear();
});
export const change = (): FolderAccessChange => ({
  kind: "folder-access",
  folder: "Reports",
  viewerMode: "restricted",
  viewerUserIds: ["viewer-a", "viewer-b"],
});
export const receipt = {
  folder: "Reports",
  viewerMode: "restricted",
  viewerUserIds: ["viewer-b", "viewer-a"],
  updated: 1,
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
export function deferredResponse() {
  let release!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
export function setup(
  respond: (options?: RequestInit) => Response | Promise<Response>,
) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  caches.add(cache);
  function identity(
    userId = "user-test",
    role = "standard_user",
    tenantId = "tenant-test",
  ) {
    cache.setQueryData(["identity"], {
      user: { id: userId, email: "synthetic@example.test" },
      tenant: { id: tenantId, name: "Synthetic tenant" },
      role,
    });
  }
  identity();
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
  const context = { cache, clientId, execution };
  const key = folderAccessKey(clientId, "Reports", actor);
  return {
    cache,
    identity,
    actor,
    controller,
    execution,
    fetcher,
    api,
    context,
    key,
    save: (intent = change()) => saveFolderAccess(api, intent, context),
    review: () => reviewFolderAccess(api, "Reports", context),
  };
}
