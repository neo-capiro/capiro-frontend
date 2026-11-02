import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  UPLOAD_LIMITS,
  UploadResponseError,
  receiveUploadOriginal,
  receiveUploadRequest,
  receiveUploadResponse,
  type AdmittedUploadReceipt,
  type AdmittedUploadRequest,
  type UploadReceipt,
} from "../../src/shared/meri-uploads/facade";
import {
  UPLOAD_CHECK_INTERVAL_MS,
  UPLOAD_CHECK_WAIT_MS,
  createUploadController,
  type UploadItem,
} from "../../src/shared/meri-uploads/upload-controller";
import { attachmentWording } from "../../src/shared/meri-uploads/attachment-wording";
import { createUploadWire } from "../../src/shared/meri-uploads/upload-wire";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const json = (value: unknown) => encoder.encode(JSON.stringify(value));
const respond = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
type Outcome = "NOT_DISPATCHED" | "UNKNOWN" | "READ_UNAVAILABLE";
const errors = (code: string, outcome: Outcome) =>
  respond({ error: { code, outcome } }, 400);
/** Node's digest, so the declared value is the standard one and not this page's opinion. */
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
/** The exact browser session credential shape the proxy checks; never a real credential. */
const credential = `action_session_${"A".repeat(43)}`;

type Original = UploadReceipt["original"];
type Attempt = Readonly<{
  uploadId: string;
  requestId: string;
  original: Original;
  receipt: UploadReceipt;
}>;

const pendingExtraction: UploadReceipt["extraction"] = {
  status: "pending",
  limitations: [],
};

/** Receipts a real service may answer with, each built to the canonical state invariants. */
const awaiting = (
  uploadId: string,
  requestId: string,
  original: Original,
): UploadReceipt => ({
  uploadId,
  requestId,
  original: { ...original, versionId: null },
  storageStatus: "awaiting_upload",
  scanStatus: "pending",
  scanReason: null,
  extraction: pendingExtraction,
  originalBytesAvailable: false,
});
const storedPending = (
  uploadId: string,
  requestId: string,
  original: Original,
): UploadReceipt => ({
  uploadId,
  requestId,
  original: { ...original, versionId: "version-1" },
  storageStatus: "stored",
  scanStatus: "pending",
  scanReason: null,
  extraction: pendingExtraction,
  originalBytesAvailable: false,
});
const storedClean = (
  uploadId: string,
  requestId: string,
  original: Original,
): UploadReceipt => ({
  uploadId,
  requestId,
  original: { ...original, versionId: "version-1" },
  storageStatus: "stored",
  scanStatus: "clean",
  scanReason: null,
  extraction: { status: "available", limitations: [] },
  originalBytesAvailable: true,
});
const scanUnavailable = (
  uploadId: string,
  requestId: string,
  original: Original,
): UploadReceipt => ({
  uploadId,
  requestId,
  original: { ...original, versionId: "version-1" },
  storageStatus: "stored",
  scanStatus: "unavailable",
  scanReason: "SCANNER_OFFLINE",
  extraction: { status: "unavailable", limitations: ["SCAN_UNAVAILABLE"] },
  originalBytesAvailable: false,
});
const removed = (
  uploadId: string,
  requestId: string,
  original: Original,
): UploadReceipt => ({
  uploadId,
  requestId,
  original: { ...original, versionId: "version-1" },
  storageStatus: "removed",
  scanStatus: "unavailable",
  scanReason: "UPLOAD_REMOVED",
  extraction: { status: "unavailable", limitations: ["UPLOAD_REMOVED"] },
  originalBytesAvailable: false,
});

type Call = Readonly<{
  url: string;
  method: string;
  body: Uint8Array | null;
  session: string | null;
}>;

/** A transport stand-in for the service: it admits and verifies with the same public receivers. */
function createUploadServer(
  options: { fault?: (route: string) => Response | undefined } = {},
) {
  const calls: Call[] = [];
  const attempts = new Map<string, Attempt>();
  let issued: Attempt | null = null;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body =
      init?.body instanceof Uint8Array ? (init.body as Uint8Array) : null;
    calls.push(
      Object.freeze({
        url,
        method,
        body,
        session: new Headers(init?.headers).get("x-meri-action-session"),
      }),
    );
    const route = url.startsWith("/api/uploads/original/")
      ? "complete"
      : url.replace("/api/uploads/", "");
    const fault = options.fault?.(route);
    if (fault) return fault;
    if (route === "initiate" && body) {
      const declared = receiveUploadRequest("initiate", body);
      const uploadId = crypto.randomUUID();
      const original: Original = {
        filename: declared.filename,
        mimeType: declared.mimeType,
        bytes: declared.bytes,
        sha256: declared.sha256,
        versionId: null,
      };
      const staged: Attempt = {
        uploadId,
        requestId: declared.requestId,
        original,
        receipt: awaiting(uploadId, declared.requestId, original),
      };
      attempts.set(uploadId, staged);
      issued = staged;
      return respond(staged.receipt);
    }
    if (route === "complete" && body) {
      const uploadId = url.split("/").at(-1) as string;
      const attempt = attempts.get(uploadId);
      if (!attempt) return errors("UPLOAD_NOT_FOUND", "NOT_DISPATCHED");
      // The complete route carries only the bounded original; the id travels in the path.
      const complete = receiveUploadRequest("complete", json({ uploadId }));
      const expected = receiveUploadResponse(
        "complete",
        200,
        json(attempt.receipt),
        complete,
      );
      if ("error" in expected)
        throw new Error("server receipt is not canonical");
      // The service verifies the bounded original against its own expectation before storing it.
      await receiveUploadOriginal(body, complete, expected);
      const committed = storedPending(
        uploadId,
        attempt.requestId,
        attempt.original,
      );
      issued = { ...attempt, receipt: committed };
      attempts.set(uploadId, issued);
      return respond(committed);
    }
    if ((route === "status" || route === "remove") && body) {
      const id = receiveUploadRequest(route, body);
      const attempt =
        "uploadId" in id
          ? attempts.get(id.uploadId)
          : [...attempts.values()].find(
              (attempt) => attempt.requestId === id.requestId,
            );
      if (!attempt)
        return errors(
          "UPLOAD_NOT_FOUND",
          route === "status" ? "READ_UNAVAILABLE" : "NOT_DISPATCHED",
        );
      const answer =
        route === "remove"
          ? removed(attempt.uploadId, attempt.requestId, attempt.original)
          : attempt.receipt;
      attempts.set(attempt.uploadId, { ...attempt, receipt: answer });
      return respond(answer);
    }
    return errors("INVALID_COMMAND", "NOT_DISPATCHED");
  };
  return {
    fetcher,
    calls,
    latest: () => issued as Attempt,
    /** Simulate the service finishing its scan after the original was accepted. */
    settling: (next: (attempt: Attempt) => UploadReceipt) => {
      const attempt = [...attempts.values()].at(-1) as Attempt;
      const receipt = next(attempt);
      attempts.set(attempt.uploadId, { ...attempt, receipt });
      return receipt;
    },
  };
}

const controllerFor = (
  server: ReturnType<typeof createUploadServer>,
  isCurrent: () => boolean = () => true,
) => {
  const lifetime = new AbortController();
  const wire = createUploadWire(credential, lifetime.signal, server.fetcher);
  return {
    lifetime,
    wire,
    controller: createUploadController({ wire, isCurrent }),
  };
};

const refusalOf = async (run: () => unknown) => {
  try {
    await run();
  } catch (error) {
    if (error instanceof UploadResponseError) return error.code;
    throw error;
  }
  throw new Error("expected a contract refusal");
};

const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10, 1, 2, 3]);
const pdfSha256 = sha256(pdf);
const file = () => new File([pdf], "evidence.pdf", { type: "application/pdf" });

describe("uploads consumer", () => {
  it("declares, writes the bounded original once and reports the ordered argument", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);

    const [item] = controller.items();
    const attempt = server.latest();
    expect(item?.state).toBe("stored");
    expect(item?.uploadId).toBe(attempt.uploadId);

    // The declaration the service admitted is exactly the closed field set.
    const declared = JSON.parse(
      decoder.decode(server.calls[0]?.body as Uint8Array),
    );
    expect(Object.keys(declared).sort()).toEqual([
      "bytes",
      "filename",
      "mimeType",
      "requestId",
      "sha256",
    ]);
    expect(declared).toMatchObject({
      filename: "evidence.pdf",
      mimeType: "application/pdf",
      bytes: pdf.byteLength,
      sha256: pdfSha256,
    });

    // One bounded PUT of the exact original bytes, by the canonical path, under the session.
    const writes = server.calls.filter((call) => call.method === "PUT");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.url).toBe(`/api/uploads/original/${attempt.uploadId}`);
    expect(writes[0]?.body).toEqual(pdf);
    expect(writes[0]?.session).toBe(credential);

    // Stored but not yet checked: the service has not said it is clean and readable, so the
    // message does not carry it yet.
    expect(controller.sendArgument()).toEqual([]);

    // A later read re-resolves custody and availability; nothing is re-written.
    server.settling((current) =>
      storedClean(current.uploadId, current.requestId, current.original),
    );
    await controller.check(item?.requestId as string);
    expect(controller.items()[0]?.receipt).toMatchObject({
      storageStatus: "stored",
      scanStatus: "clean",
      originalBytesAvailable: true,
    });
    // The digest this page declared is the real digest, and the argument adds nothing else.
    expect(controller.sendArgument()).toEqual([
      { uploadId: attempt.uploadId, sha256: pdfSha256 },
    ]);
    expect(Object.keys(controller.sendArgument()[0] as object)).toEqual([
      "uploadId",
      "sha256",
    ]);
    const reads = server.calls.filter(
      (call) => call.url === "/api/uploads/status",
    );
    expect(reads).toHaveLength(1);
    expect(reads[0]?.body).toEqual(json({ uploadId: attempt.uploadId }));
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      1,
    );
  });

  it("repeats one exact request for the same attempt and never a second original write", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    const requestId = controller.items()[0]?.requestId as string;
    await controller.check(requestId);
    await controller.check(requestId);
    const reads = server.calls.filter(
      (call) => call.url === "/api/uploads/status",
    );
    expect(reads).toHaveLength(2);
    expect(reads[0]?.body).toEqual(reads[1]?.body);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      1,
    );
  });

  it("keeps an uncertain write out of the argument and only reads status afterwards", async () => {
    const server = createUploadServer({
      fault: (route) =>
        route === "complete"
          ? new Response("bad gateway", { status: 502 })
          : undefined,
    });
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    const item = controller.items()[0];
    expect(item?.state).toBe("unknown");
    expect(item?.refusal).toMatchObject({
      code: "UPLOAD_PUT_UNKNOWN",
      outcome: "UNKNOWN",
      uncertain: true,
    });
    expect(controller.sendArgument()).toEqual([]);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      1,
    );

    // Only a status read may re-resolve this attempt; it never re-writes the original.
    // The write had in fact landed before the reply was lost, and the service has since checked
    // it, which only the service can say.
    server.settling((current) =>
      storedClean(current.uploadId, current.requestId, current.original),
    );
    await controller.check(item?.requestId as string);
    expect(controller.items()[0]?.state).toBe("stored");
    expect(controller.sendArgument()).toHaveLength(1);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      1,
    );

    // Before the service confirms the write, a status read leaves the attempt uncertain.
    const uncertain = createUploadServer({
      fault: (route) =>
        route === "complete"
          ? new Response("bad gateway", { status: 502 })
          : undefined,
    });
    const second = controllerFor(uncertain);
    await second.controller.add([file()]);
    const secondItem = second.controller.items()[0];
    await second.controller.check(secondItem?.requestId as string);
    expect(second.controller.items()[0]?.state).toBe("unknown");
    expect(second.controller.sendArgument()).toEqual([]);
    expect(
      uncertain.calls.filter((call) => call.method === "PUT"),
    ).toHaveLength(1);
  });

  it("discards a late result once the conversation, account or client changes", async () => {
    const server = createUploadServer();
    let live = true;
    const { controller } = controllerFor(server, () => live);
    const pending = controller.add([file()]);
    live = false;
    await pending;
    // The declaration the service issued is not published into a conversation that moved on.
    expect(controller.items()[0]?.state).toBe("declaring");
    expect(controller.items()[0]?.uploadId).toBeNull();
    expect(controller.sendArgument()).toEqual([]);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      0,
    );
  });

  it("cancels before a declaration and removes an admitted attachment", async () => {
    const server = createUploadServer();
    const aborted = new AbortController();
    aborted.abort();
    const wire = createUploadWire(credential, aborted.signal, server.fetcher);
    const refused = await wire.declare(
      crypto.randomUUID(),
      file(),
      new AbortController().signal,
    );
    expect(refused.ok).toBe(false);
    expect(refused.ok ? undefined : refused.refusal.code).toBe("CANCELLED");
    expect(server.calls).toHaveLength(0);

    const { controller } = controllerFor(server);
    await controller.add([file()]);
    await controller.remove(controller.items()[0]?.requestId as string);
    expect(controller.items()[0]?.state).toBe("removed");
    expect(controller.sendArgument()).toEqual([]);
    expect(server.calls.at(-1)?.url).toBe("/api/uploads/remove");
  });

  it("reports scan and extraction limits without claiming the original or the bytes", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    const requestId = controller.items()[0]?.requestId as string;
    server.settling((current) =>
      scanUnavailable(current.uploadId, current.requestId, current.original),
    );
    await controller.check(requestId);
    expect(controller.items()[0]?.receipt).toMatchObject({
      scanStatus: "unavailable",
      scanReason: "SCANNER_OFFLINE",
      extraction: { status: "unavailable", limitations: ["SCAN_UNAVAILABLE"] },
      originalBytesAvailable: false,
    });
  });

  it("surfaces a service refusal instead of an attachment", async () => {
    const server = createUploadServer({
      fault: (route) =>
        route === "initiate"
          ? errors("UPLOAD_HASH", "NOT_DISPATCHED")
          : undefined,
    });
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    expect(controller.items()[0]?.state).toBe("refused");
    expect(controller.items()[0]?.refusal?.code).toBe("UPLOAD_HASH");
    expect(controller.sendArgument()).toEqual([]);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      0,
    );
  });

  it("refuses to write when the service expects other bytes than this page declared", async () => {
    // The service answers the declaration with a different digest: the receiver, not this page,
    // decides the attempt is uncorrelated, and no original is ever written.
    const server = createUploadServer({
      fault: (route) =>
        route === "initiate"
          ? respond(
              awaiting(crypto.randomUUID(), crypto.randomUUID(), {
                filename: "evidence.pdf",
                mimeType: "application/pdf",
                bytes: pdf.byteLength,
                sha256: "b".repeat(64),
                versionId: null,
              }),
            )
          : undefined,
    });
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    expect(controller.items()[0]?.state).toBe("unknown");
    expect(controller.items()[0]?.refusal?.uncertain).toBe(true);
    expect(controller.items()[0]?.refusal?.code).toBe("UPLOAD_CORRELATION");
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      0,
    );
  });
});

describe("the public receiver refuses what this consumer must never invent", () => {
  const original: Original = {
    filename: "evidence.pdf",
    mimeType: "application/pdf",
    bytes: pdf.byteLength,
    sha256: pdfSha256,
    versionId: null,
  };
  const requestId = crypto.randomUUID();
  const uploadId = crypto.randomUUID();

  const admittedComplete = async (): Promise<
    Readonly<{
      complete: AdmittedUploadRequest<"complete">;
      receipt: AdmittedUploadReceipt;
    }>
  > => {
    const complete = receiveUploadRequest("complete", json({ uploadId }));
    const receipt = receiveUploadResponse(
      "complete",
      200,
      json(awaiting(uploadId, requestId, original)),
      complete,
    );
    if ("error" in receipt) throw new Error("receipt must be admissible");
    return { complete, receipt };
  };

  it("refuses wrong bytes, wrong length and any second original write", async () => {
    const { complete, receipt } = await admittedComplete();
    expect(
      await refusalOf(() =>
        receiveUploadOriginal(new Uint8Array([1, 2, 3]), complete, receipt),
      ),
    ).toBe("UPLOAD_ORIGINAL_MISMATCH");
    expect(
      await refusalOf(() =>
        receiveUploadOriginal(new Uint8Array([...pdf, 0]), complete, receipt),
      ),
    ).toBe("UPLOAD_ORIGINAL_MISMATCH");
    // The same bytes are admissible exactly once; a later write of the same attempt is refused.
    const admitted = await receiveUploadOriginal(pdf, complete, receipt);
    expect(admitted).toEqual(pdf);
    const stored = receiveUploadResponse(
      "complete",
      200,
      json(storedPending(uploadId, requestId, original)),
      complete,
    );
    if ("error" in stored) throw new Error("receipt must be admissible");
    expect(
      await refusalOf(() => receiveUploadOriginal(pdf, complete, stored)),
    ).toBe("UPLOAD_ATTEMPT_ALREADY_ALLOCATED");
  });

  it("refuses a declaration that is not the closed canonical one", async () => {
    const declaration = {
      requestId,
      filename: "evidence.pdf",
      mimeType: "application/pdf",
      bytes: pdf.byteLength,
      sha256: pdfSha256,
    };
    const refuse = (value: unknown) =>
      refusalOf(() => receiveUploadRequest("initiate", json(value)));
    expect(await refuse({ ...declaration, mimeType: "text/plain" })).toBe(
      "INVALID_UPLOAD_DECLARATION",
    );
    expect(
      await refuse({ ...declaration, bytes: UPLOAD_LIMITS.originalBytes + 1 }),
    ).toBe("INVALID_UPLOAD_REQUEST");
    expect(await refuse({ ...declaration, requestId: "not-a-uuid" })).toBe(
      "INVALID_UPLOAD_REQUEST",
    );
    expect(
      await refuse({ ...declaration, url: "https://signed.example/x" }),
    ).toBe("INVALID_UPLOAD_REQUEST");
    expect(receiveUploadRequest("initiate", json(declaration)).requestId).toBe(
      requestId,
    );
  });

  it("refuses an uncorrelated, unauthorised or impossible receipt", async () => {
    const { complete } = await admittedComplete();
    const admit = (value: unknown) => () =>
      receiveUploadResponse("complete", 200, json(value), complete);
    expect(
      await refusalOf(
        admit(storedPending(crypto.randomUUID(), requestId, original)),
      ),
    ).toBe("UPLOAD_CORRELATION");
    expect(
      await refusalOf(
        admit({
          ...storedPending(uploadId, requestId, original),
          url: "https://signed.example/x",
        }),
      ),
    ).toBe("INVALID_UPLOAD_RECEIPT");
    expect(
      await refusalOf(
        admit({
          ...storedPending(uploadId, requestId, original),
          objectKey: "s3://bucket/key",
        }),
      ),
    ).toBe("INVALID_UPLOAD_RECEIPT");
    expect(
      await refusalOf(
        admit({
          ...storedPending(uploadId, requestId, original),
          original: { ...original, versionId: null },
        }),
      ),
    ).toBe("UPLOAD_STATE_MISMATCH");
    expect(
      await refusalOf(
        admit({
          ...storedPending(uploadId, requestId, original),
          originalBytesAvailable: true,
        }),
      ),
    ).toBe("UPLOAD_STATE_MISMATCH");
    expect(
      await refusalOf(() =>
        receiveUploadResponse(
          "complete",
          503,
          json({
            error: { code: "UPLOAD_PUT_UNKNOWN", outcome: "NOT_DISPATCHED" },
          }),
          complete,
        ),
      ),
    ).toBe("INVALID_UPLOAD_OUTCOME");
  });
});

describe("attachment readiness: the page re-reads a pending check, waits a bounded time, and says it plainly", () => {
  const removing = (
    uploadId: string,
    requestId: string,
    original: Original,
  ): UploadReceipt => ({
    uploadId,
    requestId,
    original: { ...original, versionId: "version-1" },
    storageStatus: "removing",
    scanStatus: "unavailable",
    scanReason: "UPLOAD_DEFINITIONS_UNAVAILABLE",
    extraction: { status: "unavailable", limitations: ["SCAN_UNAVAILABLE"] },
    originalBytesAvailable: false,
  });
  const statusReads = (server: ReturnType<typeof createUploadServer>) =>
    server.calls.filter((call) => call.url === "/api/uploads/status").length;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-reads the status while the service is still checking, and Send waits only until the verdict lands", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    const item = controller.items()[0]!;
    expect(item.state).toBe("stored");
    expect(item.receipt?.scanStatus).toBe("pending");
    // Stored but unscanned: the chip waits, Send waits, and nothing is offered to the message yet.
    expect(attachmentWording(item)).toMatchObject({
      label: "Checking the file…",
      waiting: true,
    });
    expect(controller.checking()).toBe(true);
    expect(controller.sendArgument()).toEqual([]);
    expect(statusReads(server)).toBe(0);
    // One read per interval, never more; the write is never repeated.
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS);
    expect(statusReads(server)).toBe(1);
    expect(controller.checking()).toBe(true);
    server.settling((current) =>
      storedClean(current.uploadId, current.requestId, current.original),
    );
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS);
    expect(statusReads(server)).toBe(2);
    const ready = controller.items()[0]!;
    expect(ready.receipt?.scanStatus).toBe("clean");
    expect(attachmentWording(ready)).toMatchObject({
      label: "Ready",
      waiting: false,
    });
    expect(controller.checking()).toBe(false);
    expect(controller.sendArgument()).toEqual([
      { uploadId: ready.uploadId, sha256: pdfSha256 },
    ]);
    // Settled: no further reads are scheduled.
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS * 10);
    expect(statusReads(server)).toBe(2);
    expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(
      1,
    );
  });

  it("a check that outruns the bounded wait stops holding Send and leaves the attachment out of the message", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    const requestId = controller.items()[0]!.requestId;
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_WAIT_MS - 1);
    expect(controller.checking()).toBe(true);
    expect(controller.overdue(requestId)).toBe(false);
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS + 1);
    expect(controller.overdue(requestId)).toBe(true);
    expect(controller.checking()).toBe(false);
    expect(controller.sendArgument()).toEqual([]);
    expect(attachmentWording(controller.items()[0]!, true)).toMatchObject({
      label: "Still checking — send without it or remove it",
      waiting: false,
    });
    const reads = statusReads(server);
    expect(reads).toBeGreaterThanOrEqual(
      UPLOAD_CHECK_WAIT_MS / UPLOAD_CHECK_INTERVAL_MS - 1,
    );
    expect(reads).toBeLessThanOrEqual(
      UPLOAD_CHECK_WAIT_MS / UPLOAD_CHECK_INTERVAL_MS + 1,
    );
    // The bounded wait is over: no more automatic reads.
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS * 10);
    expect(statusReads(server)).toBe(reads);
    // A manual check still works and a late verdict still lands.
    server.settling((current) =>
      storedClean(current.uploadId, current.requestId, current.original),
    );
    await controller.check(requestId);
    expect(controller.sendArgument()).toHaveLength(1);
    expect(controller.overdue(requestId)).toBe(false);
  });

  it("an unavailable verdict is settled: nothing waits on it and it is never sent as if it were ready", async () => {
    const server = createUploadServer();
    const { controller } = controllerFor(server);
    await controller.add([file()]);
    server.settling((current) =>
      scanUnavailable(current.uploadId, current.requestId, current.original),
    );
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS);
    const item = controller.items()[0]!;
    expect(item.state).toBe("stored");
    expect(item.receipt?.scanStatus).toBe("unavailable");
    expect(controller.checking()).toBe(false);
    expect(controller.sendArgument()).toEqual([]);
    const wording = attachmentWording(item);
    expect(wording.label).toBe("Could not read this file");
    expect(wording.detail).toContain("SCANNER_OFFLINE");
    await vi.advanceTimersByTimeAsync(UPLOAD_CHECK_INTERVAL_MS * 10);
    expect(statusReads(server)).toBe(1);
  });

  it("a held removal is reported as removed from this message, releases the recovery locator, and can be dismissed", async () => {
    const released: string[] = [];
    const recovery = {
      list: () => [],
      retain: () => undefined,
      release: (requestId: string) => {
        released.push(requestId);
      },
    };
    const server: ReturnType<typeof createUploadServer> = createUploadServer({
      // The service stopped serving the original but its storage hold defers physical deletion.
      fault: (route) =>
        route === "remove"
          ? respond(
              removing(
                server.latest().uploadId,
                server.latest().requestId,
                server.latest().original,
              ),
            )
          : undefined,
    });
    const lifetime = new AbortController();
    const wire = createUploadWire(credential, lifetime.signal, server.fetcher);
    const controller = createUploadController({
      wire,
      recovery,
      isCurrent: () => true,
    });
    await controller.add([file()]);
    const requestId = controller.items()[0]!.requestId;
    expect(released).toEqual([]);
    await controller.remove(requestId);
    const held = controller.items()[0]!;
    expect(held.state).toBe("removing");
    expect(controller.checking()).toBe(false);
    expect(controller.sendArgument()).toEqual([]);
    expect(attachmentWording(held).label).toBe("Removed from this message");
    expect(released).toEqual([requestId]);
    // Dismissing drops the row locally; custody is not written again.
    const writes = server.calls.length;
    controller.dismiss(requestId);
    expect(controller.items()).toEqual([]);
    expect(server.calls.length).toBe(writes);
    // A row still being checked cannot be dismissed: it keeps its Remove control instead.
    await controller.add([file()]);
    const pending = controller.items()[0]!.requestId;
    controller.dismiss(pending);
    expect(controller.items()).toHaveLength(1);
  });

  it("the chip never shows a raw code as its state", () => {
    const base = {
      requestId: "r",
      uploadId: "u",
      filename: "a.pdf",
      mimeType: "application/pdf",
      bytes: 1,
      sha256: "s",
    } as const;
    const receipt = (
      scanStatus: UploadReceipt["scanStatus"],
      extraction: UploadReceipt["extraction"],
      scanReason: string | null = null,
    ) => ({
      uploadId: "u",
      bytes: 1,
      sha256: "s",
      storageStatus: "stored" as const,
      scanStatus,
      scanReason,
      extraction,
      originalBytesAvailable: scanStatus === "clean",
    });
    const stored = (
      scanStatus: UploadReceipt["scanStatus"],
      extraction: UploadReceipt["extraction"],
      scanReason: string | null = null,
    ): UploadItem => ({
      ...base,
      state: "stored",
      receipt: receipt(scanStatus, extraction, scanReason),
    });
    const cases: readonly [UploadItem, string][] = [
      [{ ...base, state: "declaring" }, "Uploading…"],
      [stored("pending", pendingExtraction), "Checking the file…"],
      [stored("clean", pendingExtraction), "Reading the text…"],
      [
        stored("clean", { status: "partial", limitations: ["OCR_LOW_CONFIDENCE"] }),
        "Ready (parts could not be read)",
      ],
      [
        stored("infected", { status: "blocked", limitations: ["MALWARE"] }, "MALWARE_DETECTED"),
        "Blocked by the safety check",
      ],
      [
        stored("unavailable", { status: "unavailable", limitations: [] }, "UPLOAD_DEFINITIONS_UNAVAILABLE"),
        "Could not read this file",
      ],
      [
        { ...base, state: "unknown", refusal: { code: "UPLOAD_PUT_UNKNOWN", uncertain: true } },
        "Status unknown — check it",
      ],
      [{ ...base, state: "refused", refusal: { code: "UPLOAD_SIZE" } }, "Could not upload this file"],
      [{ ...base, state: "removed" }, "Removed"],
    ];
    for (const [item, label] of cases) {
      const wording = attachmentWording(item);
      expect(wording.label).toBe(label);
      expect(wording.label).not.toMatch(/[A-Z]{2,}_[A-Z_]+/u);
    }
    expect(
      attachmentWording(
        stored("unavailable", { status: "unavailable", limitations: [] }, "UPLOAD_DEFINITIONS_UNAVAILABLE"),
      ).detail,
    ).toBe("scan: unavailable · UPLOAD_DEFINITIONS_UNAVAILABLE · text: unavailable");
  });
});
