import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import {
  selectedTabOriginal,
  SELECTED_TAB_SCHEMA as schema,
  type SelectedTabOutcome,
} from "@capiro/meri-contracts/selected-tab-application";
import { selectedTabFixture } from "./selected-tab-fixture";
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanup.splice(0)) close();
});
async function fixture(options = {}) {
  const f = await selectedTabFixture(options);
  cleanup.push(f.close);
  return f;
}
it.each([
  { kind: "UUID", documentId: randomUUID() },
  { kind: "native Chrome", documentId: "AB".repeat(16) },
])(
  "hands one exact original with a $kind document to the real upload owner, binds its generated request and never sends a credential to the extension",
  async ({ documentId }) => {
    const f = await fixture(),
      share = await f.share(documentId);
    expect(share.documentId).toBe(documentId);
    f.emit(share);
    await vi.waitFor(() => expect(f.uploads.items()[0]?.state).toBe("stored"));
    expect(f.originals).toEqual([selectedTabOriginal(share)]);
    expect(f.uploads.items()[0]).toMatchObject({
      filename: "shared-tab.txt",
      sha256: share.sha256,
      bytes: share.bytes,
    });
    const outcomes = f.sent.filter(
      (value) => (value as SelectedTabOutcome).type === "outcome",
    ) as SelectedTabOutcome[];
    expect(outcomes.at(-1)).toMatchObject({
      pairingId: f.pair.pairingId,
      selectionId: share.selectionId,
      state: "stored",
      requestId: f.uploads.items()[0]!.requestId,
    });
    expect(JSON.stringify(f.sent)).not.toContain("action_session_");
    expect(f.calls).toHaveLength(2);
    f.emit(share);
    await vi.waitFor(() =>
      expect(f.access.getSnapshot().state).toBe("revoked"),
    );
    expect(f.originals).toHaveLength(1);
  },
);
it("a lost storage acknowledgement remains unknown; Check reads the original receipt without another write", async () => {
  const f = await fixture({ lostAck: true });
  f.emit(await f.share());
  await vi.waitFor(() => expect(f.uploads.items()[0]?.state).toBe("unknown"));
  const item = f.uploads.items()[0]!;
  expect(item.uploadId).not.toBeNull();
  await f.uploads.check(item.requestId);
  expect(f.uploads.items()[0]?.state).toBe("stored");
  expect(f.originals).toHaveLength(1);
  expect(f.calls).toHaveLength(3);
  expect(f.calls.at(-1)).toBe("/api/uploads/status");
  expect(f.sent.at(-1)).toMatchObject({
    type: "outcome",
    state: "stored",
    requestId: item.requestId,
  });
});
it.each(["tenant", "actor", "chat", "client", "device", "pair", "hash", "age"])(
  "refuses a changed %s before upload",
  async (change) => {
    const f = await fixture(),
      share = await f.share();
    let changed: unknown = share;
    if (["tenant", "actor", "chat", "client"].includes(change)) {
      const key = {
        tenant: "tenantId",
        actor: "actorId",
        chat: "conversationId",
        client: "clientId",
      }[change]!;
      changed = {
        ...share,
        binding: { ...share.binding, [key]: randomUUID() },
      };
    }
    if (change === "device") changed = { ...share, deviceId: randomUUID() };
    if (change === "pair") changed = { ...share, pairingId: randomUUID() };
    if (change === "hash") changed = { ...share, sha256: "a".repeat(64) };
    if (change === "age") f.clock(share.capturedAtMs + 60001);
    f.emit(changed);
    await vi.waitFor(() =>
      expect(f.access.getSnapshot().state).toBe("revoked"),
    );
    expect(f.calls).toEqual([]);
  },
);
it("pause blocks a queued old active status until the extension acknowledges pause", async () => {
  const f = await fixture();
  f.access.pause();
  f.status("active");
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(f.access.getSnapshot().state).toBe("paused");
  f.status("paused");
  await new Promise((resolve) => setTimeout(resolve, 10));
  f.status("active");
  await vi.waitFor(() => expect(f.access.getSnapshot().state).toBe("active"));
  f.emit(await f.share());
  await vi.waitFor(() => expect(f.uploads.items()[0]?.state).toBe("stored"));
});
it("pause during hash admission and native account loss discard late selected data", async () => {
  const f = await fixture(),
    share = await f.share();
  f.emit(share);
  f.access.pause();
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(f.calls).toEqual([]);
  f.lifetime.abort();
  expect(f.access.getSnapshot().state).toBe("revoked");
  expect(f.port.disconnect).toHaveBeenCalled();
  f.emit({ ...share, selectionId: randomUUID() });
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(f.calls).toEqual([]);
});
it("expired current authority closes the native connection without dispatch", async () => {
  const f = await fixture(),
    share = await f.share();
  f.current(false);
  f.emit(share);
  await vi.waitFor(() => expect(f.access.getSnapshot().state).toBe("revoked"));
  expect(f.calls).toEqual([]);
});
it.each(["declaring", "uploading"])(
  "pause at the %s notification prevents the original write",
  async (state) => {
    const f = await fixture();
    const unsubscribe = f.uploads.subscribe(() => {
      if (f.uploads.items()[0]?.state === state) f.access.pause();
    });
    cleanup.push(unsubscribe);
    f.emit(await f.share());
    await vi.waitFor(() =>
      expect(["unknown", "refused"]).toContain(f.uploads.items()[0]?.state),
    );
    expect(f.access.getSnapshot().state).toBe("paused");
    expect(f.originals).toEqual([]);
    expect(f.calls).toHaveLength(state === "declaring" ? 0 : 1);
  },
);
it("malformed port messages and an unsolicited device identity terminate pairing", async () => {
  const f = await fixture();
  f.emit({
    schema,
    type: "status",
    pairingId: f.pair.pairingId,
    deviceId: randomUUID(),
    state: "active",
  });
  await vi.waitFor(() => expect(f.access.getSnapshot().state).toBe("revoked"));
  expect(f.calls).toEqual([]);
});
