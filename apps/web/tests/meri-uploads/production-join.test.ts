import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { receiveConversationInputRequest } from "@capiro/meri-contracts/conversation-input";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import {
  receiveUploadOriginal,
  receiveUploadRequest,
  receiveUploadResponse,
  type UploadReceipt,
} from "../../src/shared/meri-uploads/facade";
import { createUploadAccess } from "../../src/shared/meri-uploads/access";
import {
  ConversationHostController,
  type MeriConversationPort,
} from "../../src/shared/meri-conversations/host-controller";
import type { ConversationIntent } from "../../src/shared/meri-conversations/query-journal";
import {
  matchesStoredRequest,
  recoverRequest,
  sendRequest,
  type IntentRecord,
} from "../../src/features/meri/conversation/run-commands";
import { useComposerAttachments } from "../../src/features/meri/uploads/useComposerAttachments";

/**
 * Production-join proof for the session that owns attachments.
 *
 * These cases build the real `ConversationHostController` and drive the real send/recover selectors
 * against a transport stand-in that admits every payload with the canonical public receivers, so the
 * session port, its own upload access and the exact dispatched conversation input are what is under
 * test. Nothing here asserts onto the port or hands a wire to the composer.
 */

const encoder = new TextEncoder();
const asBytes = (value: unknown): Uint8Array | null => {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return encoder.encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
};
const respond = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

/** The exact placeholder credential shape; never a real session. */
const credential = `action_session_${"A".repeat(43)}`;
const tenantId = "tenant-1111";
const actorId = "actor-2222";
const conversationId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const settledAt = 1_700_000_000_000;

const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10, 1, 2, 3]);
const pdfSha256 = sha256(pdf);
const file = () => new File([pdf], "evidence.pdf", { type: "application/pdf" });

/**
 * The canonical attachments field is a 1..8 tuple while this page builds it dynamically; the public
 * receiver admits the built request in production, and every case below asserts what it admits.
 */
const uploadsField = (
  argument: readonly { uploadId: string; sha256: string }[],
): NonNullable<ConversationStoredRequest["uploads"]> =>
  argument as NonNullable<ConversationStoredRequest["uploads"]>;

type Original = UploadReceipt["original"];
type Attempt = {
  uploadId: string;
  requestId: string;
  original: Original;
  receipt: UploadReceipt;
};
type Call = Readonly<{
  url: string;
  method: string;
  body: Uint8Array | null;
  session: string | null;
}>;

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
  extraction: { status: "pending", limitations: [] },
  originalBytesAvailable: false,
});
const stored = (
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
  extraction: { status: "pending", limitations: [] },
  originalBytesAvailable: false,
});

const failed = (code: string, outcome: string) =>
  respond({ error: { code, outcome } }, 400);

/**
 * The service stand-in: it answers the canonical session receipt, admits every upload command with
 * the same public receiver the page used, verifies the bounded original against its own declared
 * expectation, and answers the conversation admit route with a refusal whose dispatched bytes are
 * what the caller asserts. It invents no acceptance.
 */
function createJoinServer(
  options: { holdComplete?: boolean; unknownWrite?: boolean } = {},
) {
  const calls: Call[] = [];
  const admit: { body: Uint8Array | null; session: string | null }[] = [];
  const attempts = new Map<string, Attempt>();
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const body = asBytes(init?.body);
    if (url === "/api/action-followthrough/session")
      return respond({
        credential,
        expiresAtMs: settledAt + 600_000,
        context: {
          tenantId,
          actorId,
          conversationId,
          runId,
          selectedClientId: null,
        },
      });
    if (url === "/api/conversations/input/admit") {
      admit.push({ body, session: headers.get("x-meri-action-session") });
      return respond({ error: { code: "CONVERSATION_UNAVAILABLE" } }, 503);
    }
    calls.push(
      Object.freeze({
        url,
        method,
        body,
        session: headers.get("x-meri-action-session"),
      }),
    );
    if (url.startsWith("/api/uploads/original/") && body) {
      const uploadId = url.split("/").at(-1) as string;
      const attempt = attempts.get(uploadId);
      if (!attempt) return failed("UPLOAD_NOT_FOUND", "NOT_DISPATCHED");
      if (options.holdComplete)
        // An in-flight original write the caller may cancel: it only ends when its signal aborts.
        return await new Promise<Response>((_, reject) =>
          (init?.signal as AbortSignal | undefined)?.addEventListener(
            "abort",
            () => reject(new Error("caller aborted the original write")),
            { once: true },
          ),
        );
      if (options.unknownWrite)
        return respond(
          { error: { code: "UPLOAD_PUT_UNKNOWN", outcome: "UNKNOWN" } },
          503,
        );
      const complete = receiveUploadRequest(
        "complete",
        encoder.encode(JSON.stringify({ uploadId })),
      );
      const expected = receiveUploadResponse(
        "complete",
        200,
        encoder.encode(JSON.stringify(attempt.receipt)),
        complete,
      );
      if ("error" in expected)
        throw new Error("this transport answered a receipt it cannot admit");
      // The service verifies the bounded original against its own expectation before storing it.
      await receiveUploadOriginal(body, complete, expected);
      const committed = stored(uploadId, attempt.requestId, attempt.original);
      attempts.set(uploadId, { ...attempt, receipt: committed });
      return respond(committed);
    }
    if (url === "/api/uploads/initiate" && body) {
      const declared = receiveUploadRequest("initiate", body);
      const uploadId = crypto.randomUUID();
      const original: Original = {
        filename: declared.filename,
        mimeType: declared.mimeType,
        bytes: declared.bytes,
        sha256: declared.sha256,
        versionId: null,
      };
      attempts.set(uploadId, {
        uploadId,
        requestId: declared.requestId,
        original,
        receipt: awaiting(uploadId, declared.requestId, original),
      });
      return respond(awaiting(uploadId, declared.requestId, original));
    }
    if (
      (url === "/api/uploads/status" || url === "/api/uploads/remove") &&
      body
    ) {
      const id = receiveUploadRequest(
        url.endsWith("status") ? "status" : "remove",
        body,
      );
      const attempt = attempts.get(id.uploadId);
      if (!attempt) return failed("UPLOAD_NOT_FOUND", "READ_UNAVAILABLE");
      return respond(attempt.receipt);
    }
    return failed("INVALID_COMMAND", "NOT_DISPATCHED");
  };
  return {
    fetcher,
    calls,
    admit,
    writes: () =>
      calls.filter((call) => call.url.startsWith("/api/uploads/original/")),
  };
}

/** The real session owner, bound to the transport stand-in on a fixed clock. */
async function connectedPort(server: ReturnType<typeof createJoinServer>) {
  const controller = new ConversationHostController({
    hints: { clientId: null, conversationId },
    account: { tenantId, actorId },
    fetcher: server.fetcher,
    now: () => settledAt,
    retryDelaysMs: [],
  });
  const detach = controller.attach();
  await controller.connect();
  const snapshot = controller.getSnapshot();
  if (snapshot.status !== "ready")
    throw new Error(`conversation session did not bind: ${snapshot.status}`);
  return { controller, detach, port: snapshot.port };
}

/** The command journal the send selectors write through; no receipt and no authority in it. */
function memoryIntent(initial: ConversationIntent = {}): IntentRecord {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}

describe("the session's own attachment access", () => {
  it("sends the exact ordered argument through the real conversation port", async () => {
    const server = createJoinServer();
    const { port, detach } = await connectedPort(server);
    const record = memoryIntent();

    expect(port.uploads.items()).toEqual([]);
    await port.uploads.add([file()]);
    const argument = port.uploads.sendArgument();
    expect(argument).toHaveLength(1);
    expect(argument[0]?.sha256).toBe(pdfSha256);
    expect(server.writes()).toHaveLength(1);

    await expect(
      sendRequest(port, record, "read the evidence", false),
    ).rejects.toBeDefined();

    // The bytes the SDK actually dispatched are canonical conversation input, uploads included.
    expect(server.admit).toHaveLength(1);
    const dispatched = receiveConversationInputRequest(server.admit[0]!.body!);
    expect(dispatched.uploads).toEqual(argument);
    expect(dispatched.prompt).toBe("read the evidence");
    expect(server.admit[0]!.session).toBe(credential);
    // A refused admission leaves the exact request uncertain, attachments included, and never a
    // second original write.
    expect(record.read().submit?.state).toBe("unknown");
    expect(record.read().submit?.uploads).toEqual(argument);
    expect(server.writes()).toHaveLength(1);
    detach();
  });

  it("recovers the stored request with the same uploads and writes nothing again", async () => {
    const server = createJoinServer();
    const { port, detach } = await connectedPort(server);
    await port.uploads.add([file()]);
    const argument = port.uploads.sendArgument();
    const requestId = "33333333-3333-4333-8333-333333333333";
    const retained = {
      requestId,
      prompt: "recovered message",
      uploads: uploadsField(argument),
      state: "unknown" as const,
    };
    const record = memoryIntent({ submit: retained });
    const storedRequest: ConversationStoredRequest = {
      requestId,
      prompt: retained.prompt,
      skill: null,
      window: null,
      windowRequest: null,
      uploads: uploadsField(argument),
    };

    expect(matchesStoredRequest(retained, storedRequest)).toBe(true);
    // Equality correlation covers the attachments: any other id or digest is a mismatch, not a retry.
    expect(
      matchesStoredRequest(retained, {
        ...storedRequest,
        uploads: uploadsField([
          { uploadId: argument[0]!.uploadId, sha256: "b".repeat(64) },
        ]),
      }),
    ).toBe(false);

    await expect(
      recoverRequest(port, record, storedRequest),
    ).rejects.toBeDefined();
    const recovered = receiveConversationInputRequest(
      server.admit.at(-1)!.body!,
    );
    expect(recovered.requestId).toBe(requestId);
    expect(recovered.uploads).toEqual(argument);
    expect(server.writes()).toHaveLength(1);
    detach();
  });

  it("keeps an uncertain write out of the message, resolves it only by reading, and never replays it", async () => {
    const server = createJoinServer({ unknownWrite: true });
    const first = await connectedPort(server);
    await first.port.uploads.add([file()]);
    const item = first.port.uploads.items()[0]!;
    expect(item.state).toBe("unknown");
    expect(server.writes()).toHaveLength(1);
    // An uncertain attempt is not an argument, and repeating the read is still not a write.
    expect(first.port.uploads.sendArgument()).toEqual([]);
    await first.port.uploads.check(item.requestId);
    expect(server.writes()).toHaveLength(1);

    // A renewed or remounted session starts with no attempts at all: nothing can replay for it.
    first.detach();
    const second = await connectedPort(server);
    expect(second.port.uploads.items()).toEqual([]);
    expect(second.port.uploads.sendArgument()).toEqual([]);
    const record = memoryIntent();
    await expect(
      sendRequest(second.port, record, "after renewal", false),
    ).rejects.toBeDefined();
    const dispatched = receiveConversationInputRequest(
      server.admit.at(-1)!.body!,
    );
    expect(dispatched.uploads).toBeUndefined();
    expect(server.writes()).toHaveLength(1);
    second.detach();
  });

  it("cancels an in-flight original write and keeps the canonical read option", async () => {
    const server = createJoinServer({ holdComplete: true });
    const { port, detach } = await connectedPort(server);
    const pending = port.uploads.add([file()]);
    const deadline = Date.now() + 2_000;
    while (port.uploads.items()[0]?.state !== "uploading") {
      if (Date.now() > deadline)
        throw new Error("the original write never started");
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const item = port.uploads.items()[0]!;
    port.uploads.cancel(item.requestId);
    await pending;
    const cancelled = port.uploads.items()[0]!;
    expect(cancelled.state).toBe("unknown");
    expect(cancelled.refusal?.code).toBe("CANCELLED");
    expect(cancelled.refusal?.uncertain).toBe(true);
    // Nothing uncertain may be sent, and the row keeps its id for a canonical status read.
    expect(port.uploads.sendArgument()).toEqual([]);
    expect(cancelled.uploadId).not.toBeNull();
    detach();
  });

  it("re-selects a source the conversation already holds without writing an original again", async () => {
    const server = createJoinServer();
    const lifetime = new AbortController();
    const established = {
      uploadId: "44444444-4444-4444-8444-444444444444",
      sha256: "c".repeat(64),
    };
    const access = createUploadAccess({
      credential,
      lifetime: lifetime.signal,
      isCurrent: () => true,
      established: () => [established, established],
      fetcher: server.fetcher,
    });
    expect(access.incoming()).toEqual([{ ...established, selected: false }]);
    expect(access.sendArgument()).toEqual([]);
    access.toggle(established.uploadId);
    expect(access.incoming()).toEqual([{ ...established, selected: true }]);
    // The canonical input admits the exact selected pair; no upload call was made for it.
    expect(access.sendArgument()).toEqual([established]);
    expect(server.calls).toEqual([]);
    const admitted = receiveConversationInputRequest(
      encoder.encode(
        JSON.stringify({
          requestId: "55555555-5555-4555-8555-555555555555",
          prompt: "with the file already here",
          uploads: access.sendArgument(),
        }),
      ),
    );
    expect(admitted.uploads).toEqual([established]);
    // A closed session stops publishing and stops accepting selections.
    access.dispose();
    access.toggle(established.uploadId);
    lifetime.abort();
    expect(access.sendArgument()).toEqual([]);
  });

  it("mounts the composer against the real port instead of a hand-injected wire", async () => {
    const server = createJoinServer();
    const { controller, detach, port } = await connectedPort(server);
    await port.uploads.add([file()]);
    const Harness = ({ binding }: { binding: MeriConversationPort }) => {
      const slot = useComposerAttachments(
        binding,
        "attachments are unavailable",
      );
      return createElement(
        "div",
        null,
        createElement("p", null, `available:${slot.available}`),
        createElement("p", null, `argument:${slot.sendArgument.length}`),
        createElement("p", null, `incoming:${slot.incoming.length}`),
        createElement(
          "ul",
          null,
          slot.items.map((row) =>
            createElement(
              "li",
              { key: row.requestId, "data-state": row.state },
              row.filename,
            ),
          ),
        ),
      );
    };
    const markup = renderToStaticMarkup(
      createElement(Harness, { binding: port }),
    );
    expect(markup).toContain("available:true");
    expect(markup).toContain("argument:1");
    expect(markup).toContain('data-state="stored"');
    expect(markup).toContain("evidence.pdf");
    // With no session on screen the composer keeps its existing unavailable control.
    expect(
      renderToStaticMarkup(
        createElement(Harness, {
          binding: null as unknown as MeriConversationPort,
        }),
      ),
    ).toContain("available:false");
    detach();
    expect(controller.getSnapshot().status).toBe("idle");
  });
});
