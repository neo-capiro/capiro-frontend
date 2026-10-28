import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  NativeBillTextSourceEvent,
  NativeHearingSourceEvent,
} from "@capiro/meri-contracts/conversation-sources";
import {
  receiveUploadRequest,
  uploadDisposition,
  uploadRequestPath,
  type UploadReceipt,
} from "../../src/shared/meri-uploads/facade";
import { createUploadAccess } from "../../src/shared/meri-uploads/access";
import { uploadReferenceChanged } from "../../src/shared/meri-uploads/current-read";
import {
  uploadFailure,
  uploadSizeLabel,
} from "../../src/features/meri/conversation/evidence/upload-source";
import { UploadSourceView } from "../../src/features/meri/conversation/evidence/UploadSourceView";
import { ConversationEvidence } from "../../src/features/meri/conversation/evidence/ConversationEvidence";
import {
  turnFromEvents,
  type NativeUploadSourceEvent,
  type TurnView,
} from "../../src/features/meri/conversation/conversation-view";
import { createConversationReads } from "../../src/shared/meri-conversations/current-reads";
import type { ConversationContext } from "../../src/shared/meri-conversations/session";
import { actionSessionHeader } from "../../src/shared/meri-actions/session-header";

/**
 * The saved upload source consumer, driven end to end on its own surface.
 *
 * A `source.native-upload` event is metadata: this suite shows the fold keeping it as a native
 * source, the evidence surface stating exactly what the saved record carries, and the current read
 * re-querying the session's own upload owner before any byte moves. Nothing here asserts that an
 * answer cited the file, that the saved record states extracted text, or that a saved reference is
 * access. The credential is a placeholder shape, never a real session.
 */

const encoder = new TextEncoder();
const credential = `action_session_${"A".repeat(43)}`;
const uploadId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const otherRunId = "33333333-3333-4333-8333-333333333333";
const tenantId = "tenant-1111";
const actorId = "actor-2222";
const conversationId = "44444444-4444-4444-8444-444444444444";
const filename = "hearing-brief.pdf";
const mimeType = "application/pdf";
const versionId = "version-1";
const original = encoder.encode("%PDF-1.7 one stored original\n");
const originalSha256 = createHash("sha256").update(original).digest("hex");

const conversation: ConversationContext = {
  tenantId,
  actorId,
  conversationId,
  runId,
  selectedClientId: null,
};

const binding = (run = runId) => ({
  tenantId,
  actorId,
  conversationId,
  runId: run,
  attemptId: "55555555-5555-4555-8555-555555555555",
  workerId: "worker-1",
  writerFence: 1,
});
const scope = () => ({
  tenantId,
  kind: "private-user" as const,
  resourceId: actorId,
  policyRevision: "policy-1",
});
const hash = (seed: string) => createHash("sha256").update(seed).digest("hex");

/** The canonical upload source event, exactly as the generated union states it. */
const uploadSourceEvent = (run = runId): NativeUploadSourceEvent => ({
  contractVersion: "0.1.0",
  eventId: "66666666-6666-4666-8666-666666666666",
  binding: binding(run),
  sequence: 3,
  createdAt: "2026-10-27T04:00:00.000Z",
  scopes: [scope()],
  type: "source.native-upload",
  data: {
    schemaVersion: "meri.native-upload-source/1",
    deliveryId: "77777777-7777-4777-8777-777777777777",
    operation: { id: "read_upload_source", version: "0.2.0" },
    requestSha256: hash("request"),
    argumentsSha256: hash("arguments"),
    resultSha256: hash("result"),
    executionSha256: hash("execution"),
    policyRevision: "policy-1",
    source: {
      authoritativeOwner: "upload_custody",
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
      extractedSourceSha256: hash("extracted"),
      extractionStatus: "partial",
      limitations: ["OCR_PAGES_BELOW_CONFIDENCE"],
    },
    page: {
      number: 0,
      count: 2,
      sha256: hash("page"),
      nextPage: 1,
      fragmentCount: 3,
      extractionStatus: "partial",
      limitations: ["PAGE_TEXT_BELOW_CONFIDENCE"],
    },
  },
});

const billTextEvent = (): NativeBillTextSourceEvent => ({
  contractVersion: "0.1.0",
  eventId: "88888888-8888-4888-8888-888888888888",
  binding: binding(),
  sequence: 1,
  createdAt: "2026-10-27T04:00:00.000Z",
  scopes: [scope()],
  type: "source.native-bill-text",
  data: {
    schemaVersion: "meri.native-bill-text-source/1",
    deliveryId: "99999999-9999-4999-8999-999999999999",
    operation: { id: "read_bill_text", version: "0.2.0" },
    requestSha256: hash("bill-request"),
    argumentsSha256: hash("bill-arguments"),
    resultSha256: hash("bill-result"),
    executionSha256: hash("bill-execution"),
    policyRevision: "policy-1",
    source: {
      authoritativeOwner: "federal_evidence_current",
      billId: "H.R. 1234",
      versionCode: "IH",
      revisionId: "revision-1",
      packageId: "package-1",
      provider: "congress",
      lineageKey: "lineage-1",
      versionHash: hash("bill-version"),
      textHash: hash("bill-text"),
    },
    page: {
      offset: 0,
      endOffset: 120,
      totalCharacters: 120,
      textSha256: hash("bill-page"),
      pageComplete: true,
      contentComplete: true,
      paginationComplete: true,
      truncated: false,
    },
  },
});

const hearingEvent = (): NativeHearingSourceEvent => ({
  contractVersion: "0.1.0",
  eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  binding: binding(),
  sequence: 2,
  createdAt: "2026-10-27T04:00:00.000Z",
  scopes: [scope()],
  type: "source.native-hearing-record",
  data: {
    schemaVersion: "meri.native-hearing-source/1",
    deliveryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    operation: { id: "search_committee_hearings", version: "0.2.0" },
    requestSha256: hash("hearing-request"),
    argumentsSha256: hash("hearing-arguments"),
    resultSha256: hash("hearing-result"),
    executionSha256: hash("hearing-execution"),
    policyRevision: "policy-1",
    source: {
      recordId: "record-2",
      provenance: {
        adapter: "hearings",
        sourceTable: "committee_hearing",
        sourceRecordId: "record-2",
        hearingId: "hearing-7",
        contentHash: hash("hearing-content"),
      },
    },
    page: {
      part: 0,
      format: "json",
      characterStart: 0,
      characterEnd: 400,
      totalCharacters: 400,
      contentComplete: true,
      payloadSha256: hash("hearing-page"),
    },
    selection: {
      recordsView: "published",
      hearingId: "hearing-7",
      recordId: "record-2",
      clientId: null,
      asOf: null,
      cursor: null,
    },
    coverage: {
      requestedDomains: ["hearings"],
      searchedDomains: ["hearings"],
      requestedEntityCount: 3,
      searchedEntityCount: 3,
      recordsEvaluated: 3,
      recordsReturned: 1,
      paginationComplete: true,
      unavailableSources: [],
      sources: [
        {
          domain: "hearings",
          sourceStatus: "healthy",
          returned: 1,
          recordsEvaluated: 3,
          requestedEntityCount: 3,
          searchedEntityCount: 3,
          pagesRead: 1,
          hasMore: false,
          truncated: false,
          paginationComplete: true,
          coverageComplete: false,
          stopReason: "complete",
        },
      ],
      complete: false,
      stopReason: "complete",
    },
  },
});

const turnOf = (events: Parameters<typeof turnFromEvents>[0]): TurnView =>
  turnFromEvents(events, { runId }, "summarise the brief", "completed", false);

/* ------------------------------------------------------------------ the uploads wire stand-in */

/** The canonical paths this owner dispatches; taken from the producer, never written by hand. */
const pathOf = (route: "inspect" | "read") =>
  uploadRequestPath(
    route,
    receiveUploadRequest(route, encoder.encode(JSON.stringify({ uploadId }))),
  );

type Call = Readonly<{ url: string; body: string; session: string | null }>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A canonical original-download response: the exact headers the receiver admits, and nothing else. */
const downloadBytes = (
  body: Uint8Array<ArrayBuffer> = original,
  headers: Record<string, string> = {},
) =>
  new Response(body, {
    status: 200,
    headers: {
      "content-type": mimeType,
      "content-length": String(body.byteLength),
      "content-disposition": uploadDisposition(filename),
      "x-meri-upload-id": uploadId,
      "x-meri-upload-sha256": originalSha256,
      "x-meri-upload-version": encodeURIComponent(versionId),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });

const receipt = (overrides: Partial<UploadReceipt> = {}): UploadReceipt => ({
  uploadId,
  requestId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  original: {
    filename,
    mimeType,
    bytes: original.byteLength,
    sha256: originalSha256,
    versionId,
  },
  storageStatus: "stored",
  scanStatus: "clean",
  scanReason: null,
  extraction: {
    status: "partial",
    limitations: ["OCR_PAGES_BELOW_CONFIDENCE"],
  },
  originalBytesAvailable: true,
  ...overrides,
});

/** A transport stand-in for the uploads wire: it answers only what a case installed. */
const wire = (
  answer: (
    call: Call,
    signal: AbortSignal | undefined,
  ) => Response | Promise<Response>,
) => {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    const body =
      typeof init?.body === "string"
        ? init.body
        : init?.body instanceof Uint8Array
          ? new TextDecoder().decode(init.body)
          : "";
    const call = Object.freeze({
      url: String(input),
      body,
      session: headers.get(actionSessionHeader),
    });
    calls.push(call);
    return answer(
      call,
      init?.signal instanceof AbortSignal ? init.signal : undefined,
    );
  };
  return { fetcher, calls };
};

/** The session's own upload access, bound to a stand-in wire and a session that stays current. */
const accessOf = (
  answer: (
    call: Call,
    signal: AbortSignal | undefined,
  ) => Response | Promise<Response>,
  isCurrent: () => boolean = () => true,
) => {
  const lifetime = new AbortController();
  const wireStandIn = wire(answer);
  return {
    ...wireStandIn,
    lifetime,
    access: createUploadAccess({
      credential,
      lifetime: lifetime.signal,
      isCurrent,
      fetcher: wireStandIn.fetcher,
    }),
  };
};

/** The evidence surface reads the saved source and usage through the conversation's own reads. */
const readsOf = () => {
  const lifetime = new AbortController();
  return createConversationReads(
    conversation,
    lifetime.signal,
    () => true,
    () => undefined,
    () => Promise.reject(new Error("no conversation read is dispatched here")),
  );
};

const until = async (ready: () => boolean) => {
  const deadline = Date.now() + 2_000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error("the read was never dispatched");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

/* ------------------------------------------------------------------------------- the fold */

describe("the saved upload in the run fold", () => {
  it("keeps the canonical upload event a native source beside bill text and hearing records", () => {
    const turn = turnOf([billTextEvent(), hearingEvent(), uploadSourceEvent()]);
    expect(turn.nativeSources.map((event) => event.type)).toEqual([
      "source.native-bill-text",
      "source.native-hearing-record",
      "source.native-upload",
    ]);
    expect(turn.throughSequence).toBe(3);
  });

  it("shows an upload that is the run's only source, and never folds it as a legacy UI event", () => {
    const turn = turnOf([uploadSourceEvent()]);
    expect(turn.nativeSources.map((event) => event.eventId)).toEqual([
      "66666666-6666-4666-8666-666666666666",
    ]);
    // Nothing about the upload event may appear anywhere else in the fold: it is one native source.
    expect(turn.messages).toEqual([]);
    expect(turn.tools).toEqual([]);
    expect(turn.sources).toEqual([]);
    expect(turn.artifacts).toEqual([]);
    expect(turn.approvals).toEqual([]);
    expect(turn.checkpointIds).toEqual([]);
    expect(turn.errors).toEqual([]);
    expect(turn.reasonCode).toBeNull();
  });

  it("keeps a source of another run out of this run's native sources", () => {
    const turn = turnOf([
      uploadSourceEvent(runId),
      uploadSourceEvent(otherRunId),
    ]);
    expect(turn.nativeSources).toHaveLength(1);
    expect(turn.nativeSources[0]!.binding.runId).toBe(runId);
  });
});

/* --------------------------------------------------------------------------- the surface */

describe("the saved upload on the sources surface", () => {
  it("states the saved file, its coverage and its limits without any extracted text", () => {
    const { access } = accessOf(() =>
      json({ error: { code: "NOT_FOUND", outcome: "NOT_DISPATCHED" } }),
    );
    const markup = renderToStaticMarkup(
      createElement(UploadSourceView, {
        event: uploadSourceEvent(),
        uploads: access,
      }),
    );
    expect(markup).toContain("Uploaded file");
    expect(markup).toContain(filename);
    expect(markup).toContain(mimeType);
    expect(markup).toContain(uploadSizeLabel(original.byteLength));
    expect(markup).toContain(uploadId);
    expect(markup).toContain(originalSha256);
    expect(markup).toContain(versionId);
    expect(markup).toContain("Partial extraction");
    expect(markup).toContain("1 of 2 · 3 fragment(s) · next page 2");
    expect(markup).toContain("OCR_PAGES_BELOW_CONFIDENCE");
    expect(markup).toContain(
      "does not establish that the answer used or cited the file",
    );
    // The saved record states no extracted text, so none is presented and none is claimed.
    expect(markup).not.toContain("Extraction available");
    // Nothing is read on selection: the custody check is a person's action, not a mount effect.
    expect(markup).not.toContain("Current file");
    expect(markup).not.toContain("Download the original");
  });

  it("lists a saved upload in the run's sources and keeps the bill-text and hearing wording", () => {
    const { access } = accessOf(() =>
      json({ error: { code: "NOT_FOUND", outcome: "NOT_DISPATCHED" } }),
    );
    const reads = readsOf();
    const uploads = renderToStaticMarkup(
      createElement(ConversationEvidence, {
        reads,
        uploads: access,
        turn: turnOf([uploadSourceEvent()]),
        earlier: [],
      }),
    );
    expect(uploads).toContain("Saved uploaded files");
    expect(uploads).toContain(`Uploaded file · ${filename}`);
    expect(uploads).toContain("Open saved file");

    const bills = renderToStaticMarkup(
      createElement(ConversationEvidence, {
        reads,
        uploads: access,
        turn: turnOf([billTextEvent()]),
        earlier: [],
      }),
    );
    expect(bills).toContain("Saved bill-text pages");
    expect(bills).toContain("Bill text · H.R. 1234");
    expect(bills).toContain("Open saved page");
    expect(bills).not.toContain("Open saved file");

    const mixed = renderToStaticMarkup(
      createElement(ConversationEvidence, {
        reads,
        uploads: access,
        turn: turnOf([billTextEvent(), hearingEvent()]),
        earlier: [],
      }),
    );
    expect(mixed).toContain("Saved source pages");
    expect(mixed).toContain("Hearing record · hearing-7");
    expect(mixed).toContain("Open saved page");
  });
});

/* ------------------------------------------------------------------------ the current read */

describe("the current read of a saved upload original", () => {
  it("re-reads current custody, then hands over exactly the inspected bytes", async () => {
    const { access, calls } = accessOf((call) =>
      call.url === pathOf("inspect") ? json(receipt()) : downloadBytes(),
    );
    const saved = {
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
    };
    const inspected = await access.current.inspect(
      saved,
      new AbortController().signal,
    );
    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.value.matchesSaved).toBe(true);
      expect(inspected.value.storageStatus).toBe("stored");
      expect(inspected.value.scanStatus).toBe("clean");
      expect(inspected.value.originalBytesAvailable).toBe(true);
      // Extraction may stay partial while the original is readable; the read never claims more.
      expect(inspected.value.extraction.status).toBe("partial");
    }
    const read = await access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.filename).toBe(filename);
      expect(read.value.mimeType).toBe(mimeType);
      expect(read.value.bytes).toEqual(original);
    }
    // The explicit inspect, then the fresh inspect inside original(), then exactly one read.
    expect(calls.map((call) => call.url)).toEqual([
      pathOf("inspect"),
      pathOf("inspect"),
      pathOf("read"),
    ]);
    for (const call of calls) {
      expect(call.body).toBe(JSON.stringify({ uploadId }));
      expect(call.session).toBe(credential);
    }
    expect(access.current.pending()).toBe(false);
  });

  it("re-queries the owner on every read instead of reusing what the saved event said", async () => {
    let stored = receipt();
    const { access, calls } = accessOf((call) =>
      call.url === pathOf("inspect") ? json(stored) : downloadBytes(),
    );
    const saved = {
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
    };
    expect(
      (await access.current.original(saved, new AbortController().signal)).ok,
    ).toBe(true);
    // The file was stored again: current custody no longer carries the saved original.
    stored = receipt({
      original: { ...receipt().original, versionId: "version-2" },
    });
    const again = await access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.refusal.code).toBe(uploadReferenceChanged);
    // One read for the first attempt, none for the second, and one fresh inspect each time.
    expect(calls.filter((call) => call.url === pathOf("read"))).toHaveLength(1);
    expect(calls.filter((call) => call.url === pathOf("inspect"))).toHaveLength(
      2,
    );
    expect(uploadFailure(uploadReferenceChanged).retry).toBe(false);
  });

  it("withholds everything when current custody does not carry the saved original", async () => {
    const changed = receipt({
      original: {
        ...receipt().original,
        sha256: hash("a different original"),
        bytes: 12,
      },
    });
    const { access, calls } = accessOf(() => json(changed));
    const reply = await access.current.original(
      {
        uploadId,
        sha256: originalSha256,
        versionId,
        filename,
        mimeType,
        bytes: original.byteLength,
      },
      new AbortController().signal,
    );
    expect(reply.ok).toBe(false);
    if (!reply.ok) expect(reply.refusal.code).toBe(uploadReferenceChanged);
    expect(calls.map((call) => call.url)).toEqual([pathOf("inspect")]);
  });

  it("withholds the bytes when current state does not allow the original to be read", async () => {
    const saved = {
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
    };
    const removed = accessOf(() =>
      json(
        receipt({
          storageStatus: "removed",
          scanStatus: "unavailable",
          scanReason: "UPLOAD_REMOVED",
          extraction: {
            status: "unavailable",
            limitations: ["UPLOAD_REMOVED"],
          },
          originalBytesAvailable: false,
        }),
      ),
    );
    const gone = await removed.access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.refusal.code).toBe("UPLOAD_NOT_STORED");
    expect(removed.calls.map((call) => call.url)).toEqual([pathOf("inspect")]);

    const unscanned = accessOf(() =>
      json(
        receipt({
          scanStatus: "pending",
          extraction: { status: "pending", limitations: [] },
          originalBytesAvailable: false,
        }),
      ),
    );
    const held = await unscanned.access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(held.ok).toBe(false);
    if (!held.ok) expect(held.refusal.code).toBe("UPLOAD_NOT_CLEAN");
    expect(unscanned.calls.map((call) => call.url)).toEqual([
      pathOf("inspect"),
    ]);
    expect(uploadFailure("UPLOAD_NOT_CLEAN").retry).toBe(true);
  });

  it("reports a current-session refusal instead of bytes", async () => {
    const { access, calls } = accessOf(() =>
      json(
        { error: { code: "UPLOAD_ACCESS_DENIED", outcome: "NOT_DISPATCHED" } },
        403,
      ),
    );
    const reply = await access.current.original(
      {
        uploadId,
        sha256: originalSha256,
        versionId,
        filename,
        mimeType,
        bytes: original.byteLength,
      },
      new AbortController().signal,
    );
    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(reply.refusal.code).toBe("UPLOAD_ACCESS_DENIED");
      expect(reply.refusal.accessDenied).toBe(true);
      expect(reply.refusal.status).toBe(403);
    }
    expect(calls.map((call) => call.url)).toEqual([pathOf("inspect")]);
    expect(uploadFailure("UPLOAD_ACCESS_DENIED").retry).toBe(false);
  });

  it("refuses a reply the canonical download receiver does not admit", async () => {
    const saved = {
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
    };
    const substitutedHeaders = accessOf((call) =>
      call.url === pathOf("inspect")
        ? json(receipt())
        : downloadBytes(original, {
            "content-disposition": uploadDisposition("another-file.pdf"),
          }),
    );
    const wrongHeaders = await substitutedHeaders.access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(wrongHeaders.ok).toBe(false);
    if (!wrongHeaders.ok)
      expect(wrongHeaders.refusal.code).toBe("UPLOAD_DOWNLOAD_HEADERS");

    // Same admitted length and headers, different bytes: only the digest check can refuse it.
    const substitutedBytes = accessOf((call) =>
      call.url === pathOf("inspect")
        ? json(receipt())
        : downloadBytes(encoder.encode("%PDF-1.7 one stored originaX\n")),
    );
    const wrongBytes = await substitutedBytes.access.current.original(
      saved,
      new AbortController().signal,
    );
    expect(wrongBytes.ok).toBe(false);
    if (!wrongBytes.ok)
      expect(wrongBytes.refusal.code).toBe("UPLOAD_DOWNLOAD_INTEGRITY");
  });

  it("withholds a read the caller cancels, or one that lands after the session moved on", async () => {
    const saved = {
      uploadId,
      sha256: originalSha256,
      versionId,
      filename,
      mimeType,
      bytes: original.byteLength,
    };
    const cancelledCaller = accessOf((call, signal) =>
      call.url === pathOf("inspect")
        ? json(receipt())
        : new Promise<Response>((_, reject) =>
            signal?.addEventListener(
              "abort",
              () => reject(new Error("caller aborted")),
              { once: true },
            ),
          ),
    );
    const caller = new AbortController();
    const pending = cancelledCaller.access.current.original(
      saved,
      caller.signal,
    );
    await until(() => cancelledCaller.calls.length === 2);
    caller.abort();
    const cancelled = await pending;
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.refusal.code).toBe("CANCELLED");

    let released: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => (released = resolve));
    let current = true;
    const late = accessOf(
      (call) => {
        if (call.url === pathOf("inspect")) return json(receipt());
        return gate.then(() => downloadBytes());
      },
      () => current,
    );
    const settled = late.access.current.original(
      saved,
      new AbortController().signal,
    );
    await until(() => late.calls.length === 2);
    // The bytes arrived after this session stopped being the current one: they are discarded.
    current = false;
    released?.();
    const withheld = await settled;
    expect(withheld.ok).toBe(false);
    if (!withheld.ok) expect(withheld.refusal.code).toBe("CANCELLED");
    expect(
      late.calls.filter((call) => call.url === pathOf("read")),
    ).toHaveLength(1);

    const alreadyAborted = accessOf(() => json(receipt()));
    const aborted = new AbortController();
    aborted.abort();
    const nothing = await alreadyAborted.access.current.original(
      saved,
      aborted.signal,
    );
    expect(nothing.ok).toBe(false);
    if (!nothing.ok) expect(nothing.refusal.code).toBe("CANCELLED");
    expect(alreadyAborted.calls).toEqual([]);
    expect(uploadFailure("CANCELLED").retry).toBe(true);
  });
});
