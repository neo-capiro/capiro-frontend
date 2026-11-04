import { describe, expect, it } from "vitest";
import {
  createUploadAttemptReferences,
  type UploadAttemptScope,
} from "../../src/shared/meri-uploads/upload-attempt-storage";
import {
  createUploadController,
  resolveRecoveredAttempts,
  type UploadController,
} from "../../src/shared/meri-uploads/upload-controller";
import { createUploadWire } from "../../src/shared/meri-uploads/upload-wire";
import {
  receiveUploadRequest,
  type UploadReceipt,
} from "../../src/shared/meri-uploads/facade";

const scope: UploadAttemptScope = {
  tenantId: "synthetic",
  actorId: "synthetic-actor",
  clientId: null,
  conversationId: "33333333-3333-4333-8333-333333333333",
};
const uploadId = "44444444-4444-4444-8444-444444444444";
const file = () =>
  new File(["recovered original"], "quarterly-brief.txt", {
    type: "text/plain",
  });
const respond = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
/** The service the preview runs: the original is stored, and the scanner has not finished yet. */
function service() {
  const calls: string[] = [];
  let receipt: UploadReceipt | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    const bytes = init?.body as Uint8Array;
    if (url.endsWith("/initiate")) {
      const q = receiveUploadRequest("initiate", bytes);
      const { requestId, ...original } = q;
      receipt = {
        uploadId,
        requestId,
        original: { ...original, versionId: null },
        storageStatus: "awaiting_upload",
        scanStatus: "pending",
        scanReason: null,
        extraction: { status: "pending", limitations: [] },
        originalBytesAvailable: false,
      };
      return respond(receipt);
    }
    if (url.includes("/original/")) {
      receipt = {
        ...receipt!,
        original: { ...receipt!.original, versionId: "synthetic-version" },
        storageStatus: "stored",
        originalBytesAvailable: false,
      };
      return respond(receipt);
    }
    if (url.endsWith("/status")) {
      // The read names either the upload or the attempt; the reply is the service's own receipt.
      receiveUploadRequest("status", bytes);
      return respond(receipt);
    }
    throw Error("unexpected route " + url);
  };
  return { calls, fetcher, get receipt() { return receipt; } };
}
function controller(
  store: ReturnType<typeof storage>,
  fake: ReturnType<typeof service>,
) {
  const life = new AbortController();
  return createUploadController({
    wire: createUploadWire(
      "action_session_" + "A".repeat(43),
      life.signal,
      fake.fetcher,
    ),
    isCurrent: () => true,
    recovery: createUploadAttemptReferences(scope, () => store),
  });
}
const settle = async (uploads: UploadController) => {
  for (let i = 0; i < 50; i++) {
    if (uploads.items()[0]?.state !== "unknown") return uploads.items()[0];
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return uploads.items()[0];
};

describe("a conversation reconnect must not abandon an uploaded file", () => {
  it("resolves a recovered row from custody instead of leaving an identity-less unknown row", async () => {
    const store = storage();
    const fake = service();
    const first = controller(store, fake);
    await first.add([file()]);
    // The upload itself succeeded: the service stored the original bytes.
    expect(first.items()[0]).toMatchObject({
      state: "stored",
      filename: "quarterly-brief.txt",
    });
    expect(first.items()[0]!.uploadId).toBe(uploadId);
    // The scanned-clean confirmation never arrived, so the file is not yet part of a message.
    expect(first.sendArgument()).toEqual([]);

    // The reconnect: the port — and with it this controller — is replaced. The durable reference is
    // all that survives, so the restored row has no identity of its own.
    first.dispose();
    expect(store.values.size).toBe(1);
    const restored = controller(store, fake);
    expect(restored.items()[0]).toMatchObject({
      filename: "Upload awaiting status",
      uploadId: null,
      state: "unknown",
    });

    // What the composer now does when the access appears: one custody read, no write.
    resolveRecoveredAttempts(restored);
    const resolved = await settle(restored);
    expect(resolved).toMatchObject({
      state: "stored",
      uploadId,
      filename: "quarterly-brief.txt",
      bytes: file().size,
    });
    expect(resolved!.sha256).toHaveLength(64);
    // Only the two declarations of the first attempt plus the one read: nothing was re-declared.
    expect(fake.calls.filter((url) => url.endsWith("/initiate"))).toHaveLength(1);
    expect(fake.calls.filter((url) => url.endsWith("/status"))).toHaveLength(1);
    // A stored-but-unchecked file is still not sent as if it were ready.
    expect(restored.sendArgument()).toEqual([]);
  });

  it("leaves a row alone once custody answers, so a second render cannot loop reads", async () => {
    const store = storage();
    const fake = service();
    const first = controller(store, fake);
    await first.add([file()]);
    first.dispose();
    const restored = controller(store, fake);
    resolveRecoveredAttempts(restored);
    await settle(restored);
    resolveRecoveredAttempts(restored);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.calls.filter((url) => url.endsWith("/status"))).toHaveLength(1);
  });
});
