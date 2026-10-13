import { expect, it } from "vitest";
import { currentFilesKey } from "../src/features/portfolio/files/file-reader";
import { folderAccessKey } from "../src/features/portfolio/files/folder-access";
import { clientId, file } from "./browser/fixtures";
import {
  change,
  deferredResponse,
  json,
  receipt,
  setup,
} from "./acceptance-folder-access-fixtures";

it("sends one exact native PATCH and excludes reentry while its receipt is held", async () => {
  const held = deferredResponse();
  const state = setup(() => held.promise);
  const first = state.save();
  await expect(state.save()).rejects.toMatchObject({ status: 409 });
  await expect(state.review()).rejects.toMatchObject({ status: 409 });
  expect(state.fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = state.fetcher.mock.calls[0]!;
  expect(url).toBe(`/api/backend/core/clients/${clientId}/files/access/folder`);
  expect(options).toMatchObject({
    method: "PATCH",
    credentials: "same-origin",
    cache: "no-store",
    signal: state.controller.signal,
  });
  expect(JSON.parse(String(options?.body))).toEqual({
    folder: "Reports",
    viewerMode: "restricted",
    viewerUserIds: ["viewer-a", "viewer-b"],
  });
  held.release(json(receipt));
  await expect(first).resolves.toEqual(receipt);
  expect(state.cache.getQueryData(state.key)).toBeNull();
});

it("keeps the originally submitted intent even if caller-owned fields mutate in flight", async () => {
  const held = deferredResponse();
  const state = setup(() => held.promise);
  const intent = {
    ...change(),
    viewerUserIds: [" viewer-b ", "viewer-a", "viewer-a"],
  };
  const pending = state.save(intent);
  intent.viewerUserIds.splice(0, 3, "viewer-c");
  intent.folder = "Other";
  expect(state.cache.getQueryData(state.key)).toMatchObject({
    status: "pending",
    change: change(),
  });
  held.release(json(receipt));
  await expect(pending).resolves.toEqual(receipt);
});

it.each([503, "contradictory"])(
  "fences subsequent writes after ambiguous outcome %s",
  async (failure) => {
    const state = setup(() =>
      failure === 503 ? json({}, 503) : json({ ...receipt, folder: "Other" }),
    );
    await expect(state.save()).rejects.toMatchObject({
      status: failure === 503 ? 503 : 502,
    });
    await expect(state.save()).rejects.toMatchObject({ status: 409 });
    expect(state.cache.getQueryData(state.key)).toMatchObject({
      status: "unknown",
      change: change(),
    });
    expect(state.fetcher).toHaveBeenCalledTimes(1);
  },
);

it.each([400, 403, 404, 409, 422])(
  "allows explicit correction after definite refusal %s",
  async (status) => {
    let refuse = true;
    const state = setup(() => (refuse ? json({}, status) : json(receipt)));
    await expect(state.save()).rejects.toMatchObject({ status });
    expect(state.cache.getQueryData(state.key)).toBeNull();
    refuse = false;
    await expect(state.save()).resolves.toEqual(receipt);
    expect(state.fetcher).toHaveBeenCalledTimes(2);
  },
);

it.each([
  "actor",
  "tenant",
  "role",
  "abort",
  "cache-clear",
  "cache-clear-same-actor",
])(
  "rejects a held receipt after %s without reviving or releasing the old journal",
  async (boundary) => {
    const held = deferredResponse();
    const state = setup(() => held.promise);
    const pending = state.save();
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);
    if (boundary === "actor") state.identity("other-user");
    if (boundary === "tenant")
      state.identity("user-test", "standard_user", "other-tenant");
    if (boundary === "role") state.identity("user-test", "client_portal_user");
    if (boundary === "abort") {
      state.controller.abort();
      expect(state.cache.getQueryData(state.key)).toMatchObject({
        status: "unknown",
      });
    }
    if (boundary.startsWith("cache-clear")) {
      state.cache.clear();
      if (boundary === "cache-clear-same-actor") {
        state.identity();
        state.cache.setQueryData(currentFilesKey(state.cache, clientId), [
          file,
        ]);
      }
    }
    held.release(json(receipt));
    await rejected;
    if (boundary.startsWith("cache-clear"))
      expect(state.cache.getQueryData(state.key)).toBeUndefined();
    else
      expect(state.cache.getQueryData(state.key)).toMatchObject({
        status: "unknown",
      });
    expect(
      state.cache.getQueryData(
        folderAccessKey(clientId, "Reports", {
          userId: "other-user",
          tenantId: "tenant-test",
        }),
      ),
    ).toBeUndefined();
  },
);

it("rechecks a synchronously revoked writer before dispatch after journal creation", async () => {
  const state = setup(() => json(receipt));
  const unsubscribe = state.cache.getQueryCache().subscribe((event) => {
    const data = event.query.state.data as { status?: string } | undefined;
    if (
      event.type === "updated" &&
      event.query.queryKey[0] === "folder-access-attempt" &&
      data?.status === "pending"
    )
      state.identity("user-test", "client_portal_user");
  });
  await expect(state.save()).rejects.toMatchObject({ status: 403 });
  unsubscribe();
  expect(state.fetcher).not.toHaveBeenCalled();
  expect(state.cache.getQueryData(state.key)).toBeNull();
});

it("requires a current visible collection and a writable actor before first dispatch", async () => {
  const state = setup(() => json(receipt));
  await state.cache.invalidateQueries({
    queryKey: currentFilesKey(state.cache, clientId),
    refetchType: "none",
  });
  await expect(state.save()).rejects.toMatchObject({ status: 409 });
  state.identity("user-test", "client_portal_user");
  await expect(state.save()).rejects.toMatchObject({ status: 403 });
  expect(state.fetcher).not.toHaveBeenCalled();
  expect(state.cache.getQueryData(state.key)).toBeUndefined();
});

it("normalizes journal folder identity while keeping different client and actor scopes separate", () => {
  const actor = { userId: "user-test", tenantId: "tenant-test" };
  expect(folderAccessKey(clientId, " Reports ", actor)).toEqual(
    folderAccessKey(clientId, "Reports", actor),
  );
  expect(folderAccessKey(clientId, " ", actor)).toEqual(
    folderAccessKey(clientId, null, actor),
  );
  expect(folderAccessKey(clientId, "Reports", actor)).not.toEqual(
    folderAccessKey("other-client", "Reports", actor),
  );
  expect(folderAccessKey(clientId, "Reports", actor)).not.toEqual(
    folderAccessKey(clientId, "Reports", { ...actor, userId: "other-user" }),
  );
});
