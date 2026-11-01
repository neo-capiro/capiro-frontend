import { createHash, randomUUID } from "node:crypto";
import { afterEach, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());
import {
  createSelectedTabShare,
  SELECTED_TAB_SCHEMA as schema,
  type SelectedTabPair,
} from "@capiro/meri-contracts/selected-tab-application";
import { SelectedTabAccess } from "../src/shared/meri-selected-tab/access";
import type { SelectedTabPort } from "../src/shared/meri-selected-tab/chrome-port";
import { createUploadAccess } from "../src/shared/meri-uploads/access";
import {
  receiveUploadRequest,
  type UploadReceipt,
} from "../src/shared/meri-uploads/facade";
function event<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    addListener: (fn: (value: T) => void) => {
      listeners.add(fn);
    },
    removeListener: (fn: (value: T) => void) => {
      listeners.delete(fn);
    },
    emit: (value: T) => {
      for (const fn of listeners) fn(value);
    },
  };
}
export async function selectedTabFixture(options: { lostAck?: boolean } = {}) {
  const saved = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      get length() {
        return saved.size;
      },
      key: (i: number) => [...saved.keys()][i] ?? null,
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
      removeItem: (key: string) => {
        saved.delete(key);
      },
    },
  });
  let now = Date.now(),
    current = true;
  const lifetime = new AbortController(),
    context = {
      tenantId: randomUUID(),
      actorId: randomUUID(),
      conversationId: randomUUID(),
      runId: randomUUID(),
      selectedClientId: null,
    };
  const sent: unknown[] = [],
    onMessage = event<unknown>(),
    onDisconnect = event<void>();
  const port: SelectedTabPort = {
    postMessage: (raw) => {
      sent.push(JSON.parse(raw));
    },
    disconnect: vi.fn(() => onDisconnect.emit()),
    onMessage,
    onDisconnect,
  };
  const calls: string[] = [],
    originals: Uint8Array[] = [],
    receipts = new Map<string, UploadReceipt>();
  const fetcher: typeof fetch = async (input, init) => {
    const route = String(input);
    calls.push(route);
    if (route === "/api/uploads/initiate") {
      const q = receiveUploadRequest("initiate", init!.body as Uint8Array),
        uploadId = randomUUID();
      const receipt: UploadReceipt = {
        uploadId,
        requestId: q.requestId,
        original: {
          filename: q.filename,
          mimeType: q.mimeType,
          bytes: q.bytes,
          sha256: q.sha256,
          versionId: null,
        },
        storageStatus: "awaiting_upload",
        scanStatus: "pending",
        scanReason: null,
        extraction: { status: "pending", limitations: [] },
        originalBytesAvailable: false,
      };
      receipts.set(uploadId, receipt);
      return Response.json(receipt);
    }
    if (route.startsWith("/api/uploads/original/")) {
      const uploadId = route.split("/").at(-1)!,
        before = receipts.get(uploadId)!;
      const original = new Uint8Array(init!.body as Uint8Array);
      if (
        createHash("sha256").update(original).digest("hex") !==
          before.original.sha256 ||
        original.byteLength !== before.original.bytes
      )
        throw Error("Original mismatch");
      originals.push(original);
      const receipt: UploadReceipt = {
        ...before,
        original: { ...before.original, versionId: randomUUID() },
        storageStatus: "stored",
      };
      receipts.set(uploadId, receipt);
      if (options.lostAck)
        throw Error("Synthetic lost acknowledgement after storage");
      return Response.json(receipt);
    }
    if (route === "/api/uploads/status") {
      const q = receiveUploadRequest("status", init!.body as Uint8Array);
      return Response.json(
        "uploadId" in q
          ? receipts.get(q.uploadId)
          : [...receipts.values()].find((r) => r.requestId === q.requestId),
      );
    }
    throw Error("Unexpected request");
  };
  const uploads = createUploadAccess({
    context,
    credential: `action_session_${"F".repeat(43)}`,
    lifetime: lifetime.signal,
    isCurrent: () => current,
    fetcher,
  });
  const access = new SelectedTabAccess({
    context,
    uploads,
    lifetime: lifetime.signal,
    isCurrent: () => current,
    expiresAtMs: now + 600000,
    now: () => now,
    connector: () => port,
  });
  await access.connect("a".repeat(32), {
    account: "Fixture user · Fixture firm",
    conversation: "Fixture chat",
  });
  const pair = sent[0] as SelectedTabPair,
    deviceId = randomUUID();
  const emit = (value: unknown) => onMessage.emit(JSON.stringify(value));
  const status = (state: string) =>
    emit({
      schema,
      type: "status",
      pairingId: pair.pairingId,
      deviceId,
      state,
    });
  status("connected");
  await vi.waitFor(() => {
    if (access.getSnapshot().state !== "connected") throw Error("waiting");
  });
  status("active");
  await vi.waitFor(() => {
    if (access.getSnapshot().state !== "active") throw Error("waiting");
  });
  const share = (documentId: string = randomUUID()) =>
    createSelectedTabShare({
      schema,
      type: "share",
      pairingId: pair.pairingId,
      deviceId,
      selectionId: randomUUID(),
      binding: pair.binding,
      tabId: 4,
      documentId,
      url: "https://example.invalid/page",
      title: "Fixture source",
      capturedAtMs: now,
      text: "Visible fixture text",
    });
  return {
    access,
    uploads,
    context,
    pair,
    deviceId,
    sent,
    calls,
    originals,
    receipts,
    port,
    emit,
    status,
    share,
    clock: (value: number) => {
      now = value;
    },
    current: (value: boolean) => {
      current = value;
    },
    lifetime,
    close: () => {
      access.dispose();
      uploads.dispose();
    },
  };
}
