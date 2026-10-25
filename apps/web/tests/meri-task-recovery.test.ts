import { expect, it, vi } from "vitest";
import { db, installPlatform } from "./command-recovery-platform";
import { standaloneTaskRecovery } from "../src/shared/meri-actions/task-recovery";
import { bootstrapTaskRecoverySession } from "../src/shared/meri-actions/task-recovery-session";
import { createApiClient } from "../src/shared/portfolio/api/http";

installPlatform();
const context = {
  tenantId: "tenant",
  actorId: "actor",
  selectedClientId: "00000000-0000-4000-8000-000000000001",
  conversationId: "00000000-0000-4000-8000-000000000002",
  runId: "00000000-0000-4000-8000-000000000003",
};
const requestId = "00000000-0000-4000-8000-000000000004";
const value = {
  requestId,
  context,
  prepare: { requestId, arguments: { title: "Synthetic task" } },
  executing: false,
};
const journal = () =>
  standaloneTaskRecovery("update", context, () => undefined);

it("retains exact original context/input and refuses replacement across reload and views", async () => {
  await journal().lock(() => journal().reserve(value));
  expect(await journal().load()).toEqual(value);
  await expect(
    journal().reserve({ ...value, requestId: crypto.randomUUID() }),
  ).rejects.toThrow("must be recovered");
  await expect(
    journal().update({
      ...value,
      prepare: { ...value.prepare, arguments: { title: "Changed" } },
    }),
  ).rejects.toThrow();
  await expect(
    journal().update({
      ...value,
      context: { ...context, runId: crypto.randomUUID() },
    }),
  ).rejects.toThrow();
  expect(await journal().load()).toEqual(value);
});

it("discard atomically refuses a saved execution flip even when the caller saw an unexecuted preparation", async () => {
  await journal().reserve(value);
  const seen = await journal().load();
  await journal().update({
    ...value,
    prepared: { synthetic: true },
    executing: true,
  });
  await expect(journal().discard(seen!)).rejects.toThrow();
  expect(await journal().load()).toMatchObject({ executing: true });
  expect(await journal().discarded(requestId)).toBe(false);
});

it("explicit unexecuted discard has its own positive disposition and cannot retire a replacement command", async () => {
  await journal().reserve(value);
  await journal().discard(value);
  expect(await journal().load()).toBeNull();
  expect(await journal().discarded(requestId)).toBe(true);
  expect(await journal().acknowledged(requestId)).toBe(false);
  const next = { ...value, requestId: crypto.randomUUID() };
  await journal().reserve(next);
  await expect(journal().discard(value)).rejects.toThrow();
  expect(await journal().load()).toEqual(next);
});

it("ambiguous storage and lost current authority cannot discard a preparation", async () => {
  await journal().reserve(value);
  await expect(
    standaloneTaskRecovery("update", context, () => {
      throw new Error("Current authority changed");
    }).discard(value),
  ).rejects.toThrow();
  expect(await journal().load()).toEqual(value);
  db.records.clear();
  await expect(journal().discard(value)).rejects.toThrow();
});

it("preserves received proposal and monotonic execution marker, isolated by kind and account", async () => {
  await journal().reserve(value);
  const prepared = { ...value, prepared: { proposal: "synthetic" } };
  await journal().update(prepared);
  const executing = { ...prepared, executing: true };
  await journal().update(executing);
  await expect(journal().update(prepared)).rejects.toThrow();
  await expect(
    journal().update({ ...executing, prepared: { proposal: "other" } }),
  ).rejects.toThrow();
  expect(
    await standaloneTaskRecovery("create", context, () => undefined).load(),
  ).toBeNull();
  expect(
    await standaloneTaskRecovery(
      "update",
      { ...context, actorId: "other" },
      () => undefined,
    ).load(),
  ).toBeNull();
  await journal().acknowledge(executing);
  expect(await journal().load()).toBeNull();
});

function connection(changes: Partial<typeof context> = {}) {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(url).endsWith("/me"))
      return Response.json({
        user: { id: "actor", email: null },
        tenant: { id: "tenant", name: "Synthetic" },
        role: "standard_user",
      });
    return Response.json({
      credential: `action_session_${"a".repeat(43)}`,
      expiresAtMs: 160_000,
      context: { ...context, ...changes },
    });
  });
  return { calls, fetcher, api: createApiClient(fetcher) };
}

it("freshly reads current identity and lets the canonical session select a new run within the original conversation", async () => {
  await journal().reserve(value);
  const runId = crypto.randomUUID();
  const c = connection({ runId });
  const receipt = await bootstrapTaskRecoverySession(
    c.api,
    "update",
    context.selectedClientId,
    new AbortController().signal,
    c.fetcher,
    () => 100_000,
  );
  expect(receipt.context).toEqual({ ...context, runId });
  expect(await journal().load()).toEqual(value);
  expect(c.calls.map((call) => call.url)).toEqual([
    "/api/backend/core/me",
    "/api/action-followthrough/session",
  ]);
  expect(c.calls[1]?.body).toEqual({
    clientId: context.selectedClientId,
    conversationId: context.conversationId,
  });
});

it("does not reconnect with corrupt storage or accept another actor/context", async () => {
  await journal().reserve(value);
  const c = connection({ actorId: "other" });
  await expect(
    bootstrapTaskRecoverySession(
      c.api,
      "update",
      context.selectedClientId,
      new AbortController().signal,
      c.fetcher,
      () => 100_000,
    ),
  ).rejects.toThrow("does not match");
  db.records.clear();
  const d = connection();
  await expect(
    bootstrapTaskRecoverySession(
      d.api,
      "update",
      context.selectedClientId,
      new AbortController().signal,
      d.fetcher,
      () => 100_000,
    ),
  ).rejects.toThrow("recovery is unavailable");
  expect(d.calls).toHaveLength(1);
});
