import "./prospect-upload-hook-platform";
import "./command-recovery-platform";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import { QueryClient } from "@tanstack/react-query";
import { hooks, resetHooks } from "./prospect-upload-hook-platform";
import { installPlatform, db, barrier } from "./command-recovery-platform";
import {
  createApiClient,
  type ApiClient,
} from "../src/shared/portfolio/api/http";
import {
  currentFileReader,
  type FileReader,
} from "../src/features/portfolio/files/file-reader";
import { useProspectUpload } from "../src/features/portfolio/files/useProspectUpload";
import { uploadRecoveryContract } from "../src/features/portfolio/files/prospect-upload-recovery";
import {
  reserveRecovery,
  readRecovery,
} from "../src/shared/session/recovery/journal";
import {
  actor,
  prospectId,
  requestId,
  attachment,
  checksum,
  otherId,
} from "./prospect-resources-fixtures";

const ports = vi.hoisted(() => ({
  cache: undefined as QueryClient | undefined,
  api: undefined as ApiClient | undefined,
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ports.cache,
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ports.api,
}));
installPlatform();
const identity = (user = actor.userId, tenant = actor.tenantId) => ({
  user: { id: user, email: null },
  tenant: { id: tenant, name: "Synthetic" },
  role: "user_admin",
});
const scope = JSON.stringify([
  "prospect-upload",
  actor.tenantId,
  actor.userId,
  prospectId,
]);
const retained = {
  requestId,
  prospectId,
  actor,
  metadata: { name: "test.txt", type: "text/plain", size: 5 },
  checksumSha256: checksum,
  s3Key: attachment.s3Key,
  bytesStarted: true,
};
let cache: QueryClient,
  reader: FileReader,
  state: ReturnType<typeof useProspectUpload>;
let requests: Array<{ path: string; method: string }>;
let waitForMe: (() => Promise<void>) | undefined;
let ticketEnabled = false;
const saved = vi.fn();
function Subject() {
  return useProspectUpload(prospectId, reader, saved);
}
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  state = Subject();
}
async function flush() {
  for (let i = 0; i < 30; i++) {
    if (hooks.dirty) render();
    hooks.pending.splice(0).forEach((fn) => fn());
    await pause(2);
  }
}
function renew(value = identity()) {
  cache.setQueryData(["identity"], value);
  cache
    .getQueryCache()
    .find({ queryKey: ["identity"] })!
    .setState({ fetchStatus: "idle", isInvalidated: false });
  reader = currentFileReader(cache)!;
  hooks.dirty = true;
}
beforeEach(() => {
  resetHooks();
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  ports.cache = cache;
  requests = [];
  waitForMe = undefined;
  ticketEnabled = false;
  saved.mockClear();
  renew();
  ports.api = createApiClient(async (url, init) => {
    const path = String(url);
    requests.push({ path, method: init?.method ?? "GET" });
    if (path.endsWith("/me")) {
      await waitForMe?.();
      return Response.json(cache.getQueryData(["identity"]));
    }
    if (path.endsWith("/confirm")) return Response.json(attachment);
    if (ticketEnabled && path.endsWith("/upload-url")) {
      const body = JSON.parse(String(init?.body));
      return Response.json({
        url: "https://storage.synthetic.invalid/upload",
        s3Key: attachment.s3Key,
        uploadIntentId: otherId,
        requestId: body.requestId,
        expiresAt: "2099-10-12T12:00:00Z",
        fields: {
          key: attachment.s3Key,
          "Content-Type": "text/plain",
          "x-amz-checksum-algorithm": "SHA256",
          "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
            "base64",
          ),
        },
      });
    }
    if (path.includes("attachments?")) return Response.json([]);
    throw Error("Unexpected synthetic route: " + path);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("No storage/network transport expected");
    }),
  );
});
afterEach(() => {
  resetHooks();
  cache.clear();
});

it.each([false, true])(
  "identity settles after pre-dispatch refusal and hydrates the same journal (retained=%s)",
  async (pending) => {
    if (pending)
      await reserveRecovery(
        scope,
        requestId,
        retained,
        uploadRecoveryContract,
        () => {},
      );
    const writes = db.writes.length;
    render(); // Actor admitted during render, then identity starts fetching before commit.
    cache
      .getQueryCache()
      .find({ queryKey: ["identity"] })!
      .setState({ fetchStatus: "fetching" });
    await flush();
    expect(state.ready).toBe(false);
    expect(state.recoveryError).toBeTruthy();
    expect(requests).toEqual([]);
    renew(); // Same owner/prospect, new admitted identity revision.
    await flush();
    expect(state.ready).toBe(true);
    expect(state.attempt).toEqual(pending ? retained : null);
    expect(requests.map((r) => r.method)).toEqual(["GET", "GET"]);
    expect(db.writes).toHaveLength(writes);
    expect(saved).not.toHaveBeenCalled();
  },
);

it("same-owner identity renewal fences an old ready callback without submitting", async () => {
  render();
  await flush();
  expect(state.ready).toBe(true);
  const oldRun = state.run;
  renew();
  await flush();
  requests = [];
  await oldRun(new File(["hello"], "test.txt", { type: "text/plain" }));
  expect(requests).toEqual([]);
  expect(db.writes).toEqual([]);
  expect(saved).not.toHaveBeenCalled();
});

it("an expired initializer cannot publish after current identity hydration completes", async () => {
  await reserveRecovery(
    scope,
    requestId,
    retained,
    uploadRecoveryContract,
    () => {},
  );
  const entered = barrier(),
    release = barrier();
  waitForMe = async () => {
    entered.resolve();
    await release.promise;
  };
  render();
  hooks.pending.splice(0).forEach((fn) => fn());
  await entered.promise;
  cache
    .getQueryCache()
    .find({ queryKey: ["identity"] })!
    .setState({
      status: "error",
      error: new Error("Expired"),
      fetchStatus: "idle",
    });
  waitForMe = undefined;
  renew();
  await flush();
  const reads = requests.length;
  release.resolve();
  await flush();
  expect(requests).toHaveLength(reads);
  expect(state.ready).toBe(true);
  expect(state.attempt).toEqual(retained);
  expect(await readRecovery(scope, uploadRecoveryContract, () => {})).toEqual(
    retained,
  );
  expect(requests.every((r) => r.method === "GET")).toBe(true);
});

it.each(["user", "tenant", "expired"])(
  "%s change refuses an old callback and preserves the unknown original attempt",
  async (change) => {
    await reserveRecovery(
      scope,
      requestId,
      retained,
      uploadRecoveryContract,
      () => {},
    );
    render();
    await flush();
    const oldRun = state.run;
    if (change === "expired")
      cache
        .getQueryCache()
        .find({ queryKey: ["identity"] })!
        .setState({ status: "error", error: new Error("Expired") });
    else
      renew(
        identity(
          change === "user" ? otherId : actor.userId,
          change === "tenant" ? otherId : actor.tenantId,
        ),
      );
    requests = [];
    await oldRun();
    expect(requests).toEqual([]);
    expect(await readRecovery(scope, uploadRecoveryContract, () => {})).toEqual(
      retained,
    );
    expect(saved).not.toHaveBeenCalled();
  },
);

it("renewal never repeats started bytes; explicit recovery confirms only the original upload", async () => {
  await reserveRecovery(
    scope,
    requestId,
    retained,
    uploadRecoveryContract,
    () => {},
  );
  render();
  await flush();
  renew();
  await flush();
  expect(requests.every((r) => r.method === "GET")).toBe(true);
  expect(await readRecovery(scope, uploadRecoveryContract, () => {})).toEqual(
    retained,
  );
  requests = [];
  await state.run();
  await flush();
  expect(requests.filter((r) => r.method !== "GET")).toEqual([
    {
      path: "/api/backend/core/engagement/attachments/confirm",
      method: "POST",
    },
  ]);
  expect(fetch).not.toHaveBeenCalled();
  expect(saved).toHaveBeenCalledOnce();
  expect(
    await readRecovery(scope, uploadRecoveryContract, () => {}),
  ).toBeNull();
});

it("a fresh explicit upload after renewal retains only canonical owner fields and sends bytes once", async () => {
  render();
  await flush();
  renew();
  await flush();
  expect(requests.every((r) => r.method === "GET")).toBe(true);
  ticketEnabled = true;
  const transport = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 204 }),
  );
  vi.stubGlobal("fetch", transport);
  await state.run(new File(["hello"], "test.txt", { type: "text/plain" }));
  await flush();
  expect(state.error).toBeNull();
  expect(transport).toHaveBeenCalledOnce();
  expect(
    requests.filter((r) => r.method === "POST").map((r) => r.path),
  ).toEqual([
    "/api/backend/core/engagement/attachments/upload-url",
    "/api/backend/core/engagement/attachments/confirm",
  ]);
  expect(saved).toHaveBeenCalledOnce();
  expect(
    await readRecovery(scope, uploadRecoveryContract, () => {}),
  ).toBeNull();
});

it("identity renewal never treats a missing encrypted record as an empty original intent", async () => {
  await reserveRecovery(
    scope,
    requestId,
    retained,
    uploadRecoveryContract,
    () => {},
  );
  db.records.delete(scope); // Keep the independent fence: storage is inconsistent.
  render();
  await flush();
  renew();
  await flush();
  expect(state.ready).toBe(false);
  expect(state.recoveryError).toContain("inconsistent");
  await state.run(new File(["hello"], "test.txt", { type: "text/plain" }));
  expect(requests.every((r) => r.method === "GET")).toBe(true);
  expect(saved).not.toHaveBeenCalled();
});
