import { expect, it, vi } from "vitest";
import {
  currentFilesAvailable,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import { filesOptions } from "../src/features/portfolio/files/queries";
import { clientId, file } from "./browser/fixtures";
import {
  change,
  deferredResponse,
  json,
  receipt,
  setup,
} from "./acceptance-folder-access-fixtures";

it("requires explicit fresh review and a separate save; routine reads never thaw unknown writes", async () => {
  let writes = 0;
  const state = setup((options) =>
    options?.method === "PATCH"
      ? ++writes === 1
        ? json({}, 503)
        : json(receipt)
      : json([file]),
  );
  await expect(state.save()).rejects.toMatchObject({ status: 503 });
  state.cache.setQueryData(currentFilesKey(state.cache, clientId), [file]);
  await expect(state.save()).rejects.toMatchObject({ status: 409 });
  await expect(state.review()).resolves.toEqual([file]);
  expect(writes).toBe(1);
  expect(state.cache.getQueryData(state.key)).toBeNull();
  await expect(state.save()).resolves.toEqual(receipt);
  expect(
    state.fetcher.mock.calls.map(([, options]) => options?.method),
  ).toEqual(["PATCH", "GET", "PATCH"]);
  expect(state.fetcher.mock.calls[1]?.[0]).toBe(
    `/api/backend/core/engagement/attachments?clientId=${clientId}`,
  );
});

it.each([403, 503, "foreign", "duplicate"])(
  "a %s review does not release uncertainty or leave stale collection authority",
  async (failure) => {
    const state = setup((options) =>
      options?.method === "PATCH"
        ? json({}, 503)
        : typeof failure === "number"
          ? json({}, failure)
          : json(
              failure === "foreign"
                ? [{ ...file, clientId: "other-client" }]
                : [file, file],
            ),
    );
    await expect(state.save()).rejects.toMatchObject({ status: 503 });
    await expect(state.review()).rejects.toBeInstanceOf(Error);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
      change: change(),
    });
    expect(currentFilesAvailable(state.cache, clientId)).toBe(false);
    await expect(state.save()).rejects.toMatchObject({ status: 409 });
    expect(state.fetcher).toHaveBeenCalledTimes(2);
  },
);

it("keeps uncertainty after a failed GET until a current successful read and separate deliberate review", async () => {
  let fail = true;
  const state = setup((options) =>
    options?.method === "PATCH"
      ? json({}, 503)
      : fail
        ? json({}, 503)
        : json([file]),
  );
  await expect(state.save()).rejects.toMatchObject({ status: 503 });
  await expect(state.review()).rejects.toMatchObject({ status: 503 });
  fail = false;
  await state.cache.fetchQuery(filesOptions(state.api, state.cache, clientId));
  expect(currentFilesAvailable(state.cache, clientId)).toBe(true);
  await expect(state.save()).rejects.toMatchObject({ status: 409 });
  await expect(state.review()).resolves.toEqual([file]);
  expect(state.cache.getQueryData(state.key)).toBeNull();
  expect(state.fetcher).toHaveBeenCalledTimes(4);
});

it.each(["actor", "abort", "cache-clear"])(
  "a held review after %s cannot release original uncertainty",
  async (boundary) => {
    const held = deferredResponse();
    const state = setup((options) =>
      options?.method === "PATCH" ? json({}, 503) : held.promise,
    );
    await expect(state.save()).rejects.toMatchObject({ status: 503 });
    const pending = state.review();
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);
    await vi.waitFor(() => expect(state.fetcher).toHaveBeenCalledTimes(2));
    if (boundary === "actor") state.identity("other-user");
    if (boundary === "abort") state.controller.abort();
    if (boundary === "cache-clear") state.cache.clear();
    held.release(json([file]));
    await rejected;
    if (boundary === "cache-clear")
      expect(state.cache.getQueryData(state.key)).toBeUndefined();
    else
      expect(state.cache.getQueryData(state.key)).toMatchObject({
        status: "unknown",
      });
  },
);

it.each([200, 403])(
  "a superseded review returning %s cannot adopt or poison the replacement collection",
  async (status) => {
    const held = deferredResponse();
    let reads = 0;
    const newer = [{ ...file, fileName: "Newer visible file.pdf" }];
    const state = setup((options) =>
      options?.method === "PATCH"
        ? json({}, 503)
        : ++reads === 1
          ? held.promise
          : json(newer),
    );
    await expect(state.save()).rejects.toMatchObject({ status: 503 });
    const review = state.review();
    const rejected = expect(review).rejects.toMatchObject({ status: 409 });
    await vi.waitFor(() => expect(reads).toBe(1));
    const options = filesOptions(state.api, state.cache, clientId);
    await state.cache.refetchQueries({
      queryKey: options.queryKey,
      exact: true,
    });
    held.release(json(status === 200 ? [file] : {}, status));
    await rejected;
    expect(currentFilesAvailable(state.cache, clientId)).toBe(true);
    expect(state.cache.getQueryData(options.queryKey)).toEqual(newer);
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
    });
  },
);

it("review returns only the current visible target label, without inferring hidden or future files", async () => {
  const elsewhere = {
    ...file,
    id: "60000000-0000-4000-8000-000000000002",
    folder: "Elsewhere",
  };
  const state = setup((options) =>
    options?.method === "PATCH" ? json({}, 503) : json([elsewhere]),
  );
  await expect(state.save()).rejects.toMatchObject({ status: 503 });
  await expect(state.review()).resolves.toEqual([]);
  expect(state.fetcher).toHaveBeenCalledTimes(2);
  expect(state.cache.getQueryData(state.key)).toBeNull();
});
