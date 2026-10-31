import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
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
import { createUploadController } from "../../src/shared/meri-uploads/upload-controller";
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

    // The digest this page declared is the real digest, and the argument adds nothing else.
    expect(controller.sendArgument()).toEqual([
      { uploadId: attempt.uploadId, sha256: pdfSha256 },
    ]);
    expect(Object.keys(controller.sendArgument()[0] as object)).toEqual([
      "uploadId",
      "sha256",
    ]);

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
    // The write had in fact landed before the reply was lost, which only the service can say.
    server.settling((current) =>
      storedPending(current.uploadId, current.requestId, current.original),
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
