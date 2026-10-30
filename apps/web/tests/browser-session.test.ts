import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { BROWSER_VIEWER_SCHEMA as schema } from "@capiro/meri-contracts/browser-viewer";
import { BrowserViewerHost } from "../src/shared/meri-browser/host-controller";
import { createBrowserViewerTransport } from "../src/shared/meri-browser/transport";
import { createBrowserResume } from "../src/shared/meri-browser/resume";
import { lifecycleJournal } from "../src/shared/meri-conversation-lifecycle/journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const binding = {
  tenantId: id(1),
  actorId: id(2),
  conversationId: id(3),
  runId: id(4),
  attemptId: id(5),
  workerId: id(6),
  writerFence: 1,
};
const context = {
  tenantId: binding.tenantId,
  actorId: binding.actorId,
  conversationId: binding.conversationId,
  runId: binding.runId,
  selectedClientId: null,
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
const hints = {
  clientId: null,
  conversationId: context.conversationId,
  runId: context.runId,
};
const credential = `action_session_${"a".repeat(43)}`;
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.useRealTimers();
});
function memory() {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
  syncMeriTabIdentity("native-session", storage);
  return storage;
}

it("renews an exact browser-only session independently of the paused chat and destroys the old port", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  let issued = 0;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(url).toBe("/api/action-followthrough/browser-session");
    expect(JSON.parse(String(init?.body))).toEqual(hints);
    return Response.json({
      credential: `action_session_${String(++issued).repeat(43)}`,
      context,
      expiresAtMs: Date.now() + 60000,
    });
  });
  const host = new BrowserViewerHost({
    account,
    hints,
    onTarget: vi.fn(),
    fetcher,
  });
  cleanups.push(host.attach());
  await host.connect();
  const first = host.getSnapshot();
  expect(first.status).toBe("ready");
  if (first.status !== "ready") throw Error("fixture");
  await vi.advanceTimersByTimeAsync(15000);
  expect(host.getExpirationReason()).toBe("renewal");
  expect(first.port.getSnapshot().status).toBe("expired");
  await host.connect();
  const next = host.getSnapshot();
  expect(next.status).toBe("ready");
  if (next.status !== "ready") throw Error("fixture");
  expect(next.port).not.toBe(first.port);
  expect(issued).toBe(2);
  host.revoke();
  expect(next.port.getSnapshot().status).toBe("expired");
});

function resumeFixture() {
  const lifetime = new AbortController();
  cleanups.push(() => lifetime.abort());
  let lost = true,
    changed = false;
  const requests: unknown[] = [],
    target = {
      ...binding,
      runId: id(20),
      attemptId: id(21),
      workerId: id(22),
      writerFence: 2,
    };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const q = JSON.parse(String(init?.body));
    if (String(url).endsWith("/read"))
      return Response.json({
        schema,
        context: {
          ...account,
          conversationId: context.conversationId,
          runId: context.runId,
          selectedClientId: null,
        },
        binding,
        checkpoint: {
          checkpointId: binding.runId,
          checkpointSha256: "c".repeat(64),
        },
        ownerId: id(8),
        state: "returning",
        lease: null,
        pages: [],
      });
    expect(url).toBe("/api/conversations/control");
    requests.push(q);
    if (lost) throw Error("lost ACK");
    return Response.json({
      controlId: q.controlId,
      intent: q.intent,
      sourceBinding: binding,
      inputSha256: createHash("sha256")
        .update(JSON.stringify(q, Object.keys(q).sort()))
        .digest("hex"),
      state: "APPLIED",
      checkpointId: binding.runId,
      targetBinding: changed ? { ...target, actorId: id(99) } : target,
      admissionReceiptId: id(23),
      retirementReceiptId: id(24),
      replayed: requests.length > 1,
    });
  });
  const transport = createBrowserViewerTransport({
    credential,
    context,
    lifetime: lifetime.signal,
    isCurrent: () => true,
    onAccessLost: () => lifetime.abort(),
    fetcher,
  });
  const storage = memory(),
    onTarget = vi.fn();
  const resume = createBrowserResume({
    context,
    transport,
    storage,
    onTarget,
    uuid: () => id(30),
  });
  return {
    transport,
    storage,
    resume,
    onTarget,
    target,
    requests,
    signal: lifetime.signal,
    recover: () => {
      lost = false;
    },
    changeTarget: () => {
      lost = false;
      changed = true;
    },
  };
}

it("retains one canonical resume across a lost acknowledgement and clears it only after saving the target", async () => {
  const f = resumeFixture(),
    read = await f.transport.request("read", {}, f.signal);
  if ("error" in read) throw Error("fixture");
  await expect(f.resume(read, f.signal)).rejects.toThrow();
  const journal = lifecycleJournal(context, f.storage),
    command = journal.read();
  expect(command?.intent).toBe("takeover.end");
  f.recover();
  f.onTarget.mockImplementationOnce(() => {
    throw Error("storage unavailable");
  });
  await expect(f.resume(read, f.signal)).rejects.toThrow("storage unavailable");
  expect(journal.read()).toEqual(command);
  await f.resume(read, f.signal);
  expect(journal.read()).toBeUndefined();
  expect(f.requests).toEqual([command, command, command]);
  expect(f.onTarget).toHaveBeenLastCalledWith(f.target);
});

it("refuses a changed resume target and preserves the exact recovery command", async () => {
  const f = resumeFixture(),
    read = await f.transport.request("read", {}, f.signal);
  if ("error" in read) throw Error("fixture");
  f.changeTarget();
  await expect(f.resume(read, f.signal)).rejects.toThrow();
  expect(f.onTarget).not.toHaveBeenCalled();
  expect(lifecycleJournal(context, f.storage).read()?.intent).toBe(
    "takeover.end",
  );
});

it("cannot replace another unresolved lifecycle operation with browser resume", async () => {
  const f = resumeFixture(),
    read = await f.transport.request("read", {}, f.signal);
  if ("error" in read) throw Error("fixture");
  const journal = lifecycleJournal(context, f.storage),
    command = { controlId: id(31), intent: "pause" as const };
  journal.retain(command);
  await expect(f.resume(read, f.signal)).rejects.toThrow(
    "pending conversation control",
  );
  expect(f.requests).toEqual([]);
  expect(journal.read()).toEqual(command);
});

it("browser issuance proxy uses native identity and refuses broad or cross-origin selectors", async () => {
  const config = {
    enabled: true,
    baseUrl: "https://meri.example.test",
    requestOrigin: "https://frontend.example.test",
  };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ credential }),
  );
  const request = (body: unknown, origin = "https://frontend.example.test") =>
    new Request(
      "https://frontend.example.test/api/action-followthrough/browser-session",
      {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "x-meri-action-session": "ignored-opaque",
        },
        body: JSON.stringify(body),
      },
    );
  const response = await proxyActionRequest(
    request(hints),
    "browser-session",
    config,
    async () => "native-identity",
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({
    "Content-Type": "application/json",
    Authorization: "Bearer native-identity",
  });
  expect(
    (
      await proxyActionRequest(
        request({ clientId: id(10) }),
        "browser-session",
        config,
        async () => "native-identity",
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await proxyActionRequest(
        request(hints, "https://other.test"),
        "browser-session",
        config,
        async () => "native-identity",
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
