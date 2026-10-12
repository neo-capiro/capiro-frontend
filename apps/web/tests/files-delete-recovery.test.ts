import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { assertClientWriter } from "../src/shared/portfolio/auth/client-writer";
import {
  assertFileReader,
  currentFileReader,
  currentFilesAvailable,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import { filesOptions } from "../src/features/portfolio/files/queries";
import {
  deleteClientFile,
  fileDeletionKey,
  reviewFileDeletion,
} from "../src/features/portfolio/files/deletion";
import { clientId, file } from "./browser/fixtures";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

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
  const context = { cache, clientId, execution };
  return {
    cache,
    controller,
    execution,
    fetcher,
    api,
    context,
    key: fileDeletionKey(clientId, file.id, actor),
    remove: () => deleteClientFile(api, file.id, context),
    review: () => reviewFileDeletion(api, file.id, context),
  };
}

it("fences a repeated DELETE after an ambiguous dispatched response", async () => {
  const state = setup(() => json({ message: "Synthetic response lost" }, 503));
  await expect(state.remove()).rejects.toMatchObject({ status: 503 });
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  expect(state.fetcher).toHaveBeenCalledTimes(1);
});

it("requires deliberate fresh current-state review, then a separate renewed DELETE", async () => {
  let deletes = 0;
  const state = setup((options) =>
    options?.method === "DELETE"
      ? ++deletes === 1
        ? json({}, 503)
        : json({ ok: true })
      : json([{ ...file, lifecycleStatus: "delete_failed" }]),
  );
  await expect(state.remove()).rejects.toMatchObject({ status: 503 });
  // An ordinary query refresh must not count as the user's current-state review.
  state.cache.setQueryData(currentFilesKey(state.cache, clientId), [file]);
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  await expect(state.review()).resolves.toMatchObject({
    file: { id: file.id, lifecycleStatus: "delete_failed" },
  });
  expect(state.cache.getQueryData(state.key)).toBeNull();
  expect(deletes).toBe(1);
  await expect(state.remove()).resolves.toEqual({ ok: true });
  expect(
    state.fetcher.mock.calls.map(([, options]) => options?.method),
  ).toEqual(["DELETE", "GET", "DELETE"]);
  expect(state.fetcher.mock.calls[1]?.[0]).toContain(
    `engagement/attachments?clientId=${clientId}`,
  );
});

it.each([400, 403, 404, 409, 422])(
  "permits correction after definite native refusal %s",
  async (status) => {
    let refused = true;
    const state = setup(() =>
      refused
        ? json({ message: "Synthetic refusal" }, status)
        : json({ ok: true }),
    );
    await expect(state.remove()).rejects.toMatchObject({ status });
    expect(state.cache.getQueryData(state.key)).toBeNull();
    refused = false;
    await expect(state.remove()).resolves.toEqual({ ok: true });
  },
);

it.each([{}, { ok: false }])(
  "treats a malformed native deletion acknowledgement as unknown: %j",
  async (receipt) => {
    const state = setup(() => json(receipt));
    await expect(state.remove()).rejects.toMatchObject({ status: 502 });
    await expect(state.remove()).rejects.toMatchObject({ status: 409 });
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
    expect(state.fetcher).toHaveBeenCalledTimes(1);
  },
);

it("blocks overlapping dispatch and review while DELETE is pending", async () => {
  let release!: (response: Response) => void;
  const state = setup(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const first = state.remove();
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  await expect(state.review()).rejects.toMatchObject({ status: 409 });
  release(json({ ok: true }));
  await first;
  expect(state.fetcher).toHaveBeenCalledTimes(1);
});

it.each(["absent", "delete_pending"])(
  "does not infer completion or thaw a currently %s file",
  async (lifecycle) => {
    const state = setup((options) =>
      options?.method === "DELETE"
        ? json({}, 503)
        : json(
            lifecycle === "absent"
              ? []
              : [{ ...file, lifecycleStatus: lifecycle }],
          ),
    );
    await expect(state.remove()).rejects.toMatchObject({ status: 503 });
    const current = await state.review();
    expect(current.file?.lifecycleStatus ?? "absent").toBe(lifecycle);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
    await expect(state.remove()).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).toHaveBeenCalledTimes(2);
  },
);

it.each(["failure", "foreign-client", "duplicates"])(
  "does not thaw deletion after %s current-read evidence",
  async (failure) => {
    const state = setup((options) =>
      options?.method === "DELETE"
        ? json({}, 503)
        : failure === "failure"
          ? json({}, 503)
          : json(
              failure === "duplicates"
                ? [file, file]
                : [{ ...file, clientId: "other-client" }],
            ),
    );
    await expect(state.remove()).rejects.toBeInstanceOf(Error);
    await expect(state.review()).rejects.toBeInstanceOf(Error);
    await expect(state.remove()).rejects.toMatchObject({ status: 409 });
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
    expect(
      state.cache.getQueryData(currentFilesKey(state.cache, clientId)),
    ).toEqual([file]);
  },
);

for (const phase of ["delete", "review"] as const) {
  it.each(["actor", "client-abort", "cache-clear"])(
    `rejects a late ${phase} response after %s replacement`,
    async (boundary) => {
      let release!: (response: Response) => void;
      const state = setup((options) =>
        phase === "review" && options?.method === "DELETE"
          ? json({}, 503)
          : new Promise((resolve) => {
              release = resolve;
            }),
      );
      if (phase === "review")
        await expect(state.remove()).rejects.toBeInstanceOf(Error);
      const request = phase === "delete" ? state.remove() : state.review();
      const rejected = expect(request).rejects.toBeInstanceOf(Error);
      await vi.waitFor(() => expect(release).toBeDefined());
      if (boundary === "client-abort") state.controller.abort();
      else if (boundary === "cache-clear") state.cache.clear();
      else
        state.cache.setQueryData(["identity"], {
          user: { id: "replacement-user", email: "replacement@example.test" },
          tenant: { id: "replacement-tenant", name: "Replacement tenant" },
          role: "standard_user",
        });
      release(json(phase === "delete" ? { ok: true } : [file]));
      await rejected;
      if (boundary === "cache-clear")
        expect(state.cache.getQueryData(state.key)).toBeUndefined();
      else
        expect(state.cache.getQueryData(state.key)).toMatchObject({
          status: "unknown",
        });
      expect(
        state.cache.getQueryData(
          fileDeletionKey(clientId, file.id, {
            userId: "replacement-user",
            tenantId: "replacement-tenant",
          }),
        ),
      ).toBeUndefined();
    },
  );
}

it("does not dispatch a file missing from the current collection or already pending deletion", async () => {
  const state = setup(() => json({ ok: true }));
  state.cache.setQueryData(currentFilesKey(state.cache, clientId), []);
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  state.cache.setQueryData(currentFilesKey(state.cache, clientId), [
    { ...file, lifecycleStatus: "delete_pending" },
  ]);
  await expect(state.remove()).rejects.toMatchObject({ status: 409 });
  expect(state.fetcher).not.toHaveBeenCalled();
});

it.each([403, 503])(
  "a failed deliberate GET %s revokes collection authority until a new successful read",
  async (status) => {
    const other = { ...file, id: "60000000-0000-4000-8000-000000000002" };
    let readFails = true;
    const state = setup((options) =>
      options?.method === "DELETE"
        ? json({}, 503)
        : readFails
          ? json({ message: "Current files unavailable" }, status)
          : json([file, other]),
    );
    state.cache.setQueryData(currentFilesKey(state.cache, clientId), [
      file,
      other,
    ]);
    await expect(state.remove()).rejects.toMatchObject({ status: 503 });
    await expect(state.review()).rejects.toMatchObject({ status });
    expect(currentFilesAvailable(state.cache, clientId)).toBe(false);
    expect(
      state.cache.getQueryState(currentFilesKey(state.cache, clientId))?.status,
    ).toBe("error");
    await expect(
      deleteClientFile(state.api, other.id, state.context),
    ).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).toHaveBeenCalledTimes(2);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
    readFails = false;
    await state.cache.fetchQuery(
      filesOptions(state.api, state.cache, clientId),
    );
    expect(currentFilesAvailable(state.cache, clientId)).toBe(true);
    await expect(state.remove()).rejects.toMatchObject({ status: 409 });
    await expect(state.review()).resolves.toMatchObject({
      file: { id: file.id },
    });
    expect(state.cache.getQueryData(state.key)).toBeNull();
  },
);

it.each([200, 403])(
  "a silently superseded review returning %s cannot replace or poison a newer successful collection",
  async (status) => {
    let release!: (response: Response) => void;
    let reads = 0;
    const newer = [{ ...file, fileName: "Newer current collection.pdf" }];
    const state = setup((options) =>
      options?.method === "DELETE"
        ? json({}, 503)
        : ++reads === 1
          ? new Promise((resolve) => {
              release = resolve;
            })
          : json(newer),
    );
    await expect(state.remove()).rejects.toMatchObject({ status: 503 });
    const review = state.review();
    const rejected = expect(review).rejects.toMatchObject({ status: 409 });
    await vi.waitFor(() => expect(release).toBeDefined());
    const options = filesOptions(state.api, state.cache, clientId);
    await state.cache.refetchQueries({
      queryKey: options.queryKey,
      exact: true,
    });
    release(
      json(status === 200 ? [file] : { message: "Obsolete refusal" }, status),
    );
    await rejected;
    expect(currentFilesAvailable(state.cache, clientId)).toBe(true);
    expect(state.cache.getQueryData(options.queryKey)).toEqual(newer);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
  },
);
