import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { assertClientWriter } from "../src/shared/portfolio/auth/client-writer";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import { deleteClientFile } from "../src/features/portfolio/files/deletion";
import { clientId, file } from "./browser/fixtures";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

function setup(respond: (options?: RequestInit) => Response | Promise<Response>) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  const context = { cache, clientId, execution };
  return {
    cache, controller, execution, fetcher, api, context,
    remove: () => deleteClientFile(api, file.id, context),
  };
}

it("fences a repeated DELETE after an ambiguous dispatched response", async () => {
  const state = setup(() => json({ message: "Synthetic response lost" }, 503));
  await expect(state.remove()).rejects.toMatchObject({ status: 503 });
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  expect(state.fetcher).toHaveBeenCalledTimes(1);
});
