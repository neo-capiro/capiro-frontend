import {
  receiveDocumentRequest,
  type AdmittedDocumentRequest,
  type AdmittedDocumentVersion,
  type DocumentContentRequest,
  type DocumentErrorResponse,
  type DocumentResponseMap,
} from "@capiro/meri-contracts/document-application";
import type { ActionSessionReceipt } from "../meri-actions/session-receipt";
import type { DocumentAttemptJournal } from "./attempt-journal";
import type { FederalWorkbenchPort } from "./federal-workbench";
import {
  DocumentAccessUnavailable,
  type DocumentTransport,
} from "./workflow-transport";
import type {
  DocumentWorkflowPort,
  DocumentReply,
  DocumentProblem,
  DocumentVersionView,
  DocumentDownloadView,
} from "./workflow-port";

type Options = {
  federal?: FederalWorkbenchPort;
  session: Pick<ActionSessionReceipt, "context" | "expiresAtMs">;
  operation: DocumentContentRequest["operation"];
  transport: DocumentTransport;
  journal: DocumentAttemptJournal;
  onAccessLost: () => void;
  isCurrent?: () => boolean;
  now?: () => number;
};
class NativeRevisionUnavailable extends Error {}

type Receipt = DocumentResponseMap["create"] | DocumentResponseMap["inspect"];
type GeneratedVersion = Extract<AdmittedDocumentVersion, { filename: string }>;
type Held = { version: GeneratedVersion; view: DocumentVersionView };
const refused = <T>(problem: DocumentProblem): DocumentReply<T> => ({
  ok: false,
  problem,
});
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
// Only receiver-admitted JSON reaches this intent/immutable-identity serializer.
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
const sameId = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

/** One host lifetime owns branded receipts; the canonical cache owns uncertainty. */
export class DocumentWorkflow implements DocumentWorkflowPort {
  readonly federal?: FederalWorkbenchPort;
  private readonly lifetime = new AbortController();
  private handles = new WeakMap<object, Held>();
  private known = new Map<string, GeneratedVersion>();
  private busy = false;
  private readonly options: Options;
  constructor(options: Options) {
    this.federal = options.federal;
    this.options = {
      ...options,
      session: {
        context: Object.freeze({ ...options.session.context }),
        expiresAtMs: options.session.expiresAtMs,
      },
    };
  }
  snapshot() {
    return this.options.journal.read();
  }
  dispose() {
    this.federal?.dispose();
    this.lifetime.abort();
    this.handles = new WeakMap();
    this.known.clear();
  }
  private loseAccess() {
    if (!this.lifetime.signal.aborted) {
      this.dispose();
      this.options.onAccessLost();
    }
  }
  private current(signal: AbortSignal) {
    signal.throwIfAborted();
    this.lifetime.signal.throwIfAborted();
    if (
      (this.options.now ?? Date.now)() >= this.options.session.expiresAtMs ||
      this.snapshot().problem === "access-lost"
    ) {
      this.loseAccess();
      throw new Error("Document session unavailable");
    }
    if (this.options.isCurrent?.() === false)
      throw new Error("Current client unavailable");
  }
  private preflight(signal: AbortSignal): DocumentProblem | undefined {
    if (signal.aborted || this.busy || this.options.isCurrent?.() === false)
      return "not-dispatched";
    try {
      this.current(signal);
    } catch {
      return "access-lost";
    }
  }
  private adopt(
    receipt: Receipt,
    base?: GeneratedVersion,
  ): DocumentVersionView {
    if ("kind" in receipt)
      throw new NativeRevisionUnavailable(
        "Native workspace files are not generated revision targets",
      );
    const { version, inspection } = receipt;
    const context = this.options.session.context;
    const expectedFormat =
      this.options.operation === "create_excel"
        ? inspection.format === "xlsx"
        : inspection.format !== "xlsx";
    const known = this.known.get(version.versionId.toLowerCase());
    if (
      !expectedFormat ||
      version.binding.tenantId !== context.tenantId ||
      version.binding.actorId !== context.actorId ||
      !sameId(version.binding.conversationId, context.conversationId) ||
      !sameId(version.binding.runId, context.runId) ||
      !version.scopes.some(
        (scope) =>
          scope.kind === "client" &&
          sameId(scope.resourceId, context.selectedClientId),
      ) ||
      version.scopes.some(
        (scope) =>
          scope.kind === "client" &&
          !sameId(scope.resourceId, context.selectedClientId),
      ) ||
      (known && canonical(known) !== canonical(version)) ||
      (base &&
        (!sameId(version.artifactId, base.artifactId) ||
          sameId(version.versionId, base.versionId)))
    )
      throw new Error("Document receipt does not match this view");
    const handle = Object.freeze({});
    const view: DocumentVersionView = Object.freeze({
      handle,
      inspection,
      metadata: Object.freeze({
        artifactId: version.artifactId,
        versionId: version.versionId,
        parentVersionId: version.parentVersionId,
        filename: version.filename,
        mimeType: version.mimeType,
        bytes: version.object.bytes,
        sha256: version.object.sha256,
        createdAt: version.createdAt,
        format: inspection.format,
      }),
    });
    this.known.set(version.versionId.toLowerCase(), version);
    this.handles.set(handle, { version, view });
    return view;
  }
  private error(value: DocumentErrorResponse, status: number): DocumentProblem {
    if (status === 401 || status === 403) {
      this.loseAccess();
      return "access-lost";
    }
    switch (value.error.outcome) {
      case "NOT_DISPATCHED":
        return "not-dispatched";
      case "RESULT_NOT_RELEASED":
        return "result-withheld";
      case "READ_UNAVAILABLE":
        return "read-unavailable";
      default:
        return "unknown";
    }
  }
  private settle(attemptId: string, problem?: DocumentProblem) {
    const state = this.snapshot();
    if (state.attemptId === attemptId)
      this.options.journal.write({
        ...state,
        status: problem && problem !== "not-dispatched" ? "unresolved" : "idle",
        problem,
      });
  }
  private async write<R extends "create" | "revise">(
    route: R,
    request: AdmittedDocumentRequest<R>,
    caller: AbortSignal,
    base?: GeneratedVersion,
  ): Promise<DocumentReply<DocumentVersionView>> {
    const blocked = this.preflight(caller);
    if (blocked) return refused(blocked);
    const state = this.snapshot();
    if (state.status !== "idle") return refused(state.problem ?? "unknown");
    if (state.fingerprints.length >= 256) return refused("not-dispatched");
    const attemptId = request.deliveryId;
    this.busy = true;
    this.options.journal.write({
      ...state,
      status: "pending",
      attemptId,
      problem: undefined,
    });
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    let dispatched = false;
    try {
      const intent = {
        request: request.request,
        ...("baseVersionId" in request
          ? { baseVersionId: request.baseVersionId }
          : {}),
      };
      const hash = await crypto.subtle.digest(
        "SHA-256",
        encode(canonical({ route, ...intent })),
      );
      const fingerprint = Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      this.current(signal);
      if (
        this.snapshot().attemptId !== attemptId ||
        this.snapshot().status !== "pending"
      )
        return refused("access-lost");
      if (state.fingerprints.includes(fingerprint)) {
        this.settle(attemptId);
        return refused("not-dispatched");
      }
      this.options.journal.write({
        ...this.snapshot(),
        fingerprints: [...state.fingerprints, fingerprint],
      });
      this.current(signal);
      if (
        this.snapshot().attemptId !== attemptId ||
        this.snapshot().status !== "pending"
      )
        return refused("access-lost");
      dispatched = true;
      const { status, value } = await this.options.transport.request(
        route,
        request,
        signal,
      );
      this.current(signal);
      if ("error" in value) {
        // Preserve the validated remote disposition before local access disposal.
        const outcome = value.error.outcome;
        this.settle(
          attemptId,
          outcome === "NOT_DISPATCHED"
            ? "not-dispatched"
            : outcome === "RESULT_NOT_RELEASED"
              ? "result-withheld"
              : "unknown",
        );
        return refused(this.error(value, status));
      }
      const view = this.adopt(value, base);
      this.current(signal);
      this.settle(attemptId);
      this.current(signal);
      return { ok: true, value: view };
    } catch (error) {
      this.settle(attemptId, dispatched ? "unknown" : "not-dispatched");
      if (error instanceof DocumentAccessUnavailable && !signal.aborted)
        this.loseAccess();
      return refused(
        error instanceof DocumentAccessUnavailable
          ? "access-lost"
          : dispatched
            ? "unknown"
            : "not-dispatched",
      );
    } finally {
      this.busy = false;
    }
  }
  create(
    content: unknown,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>> {
    try {
      const request = receiveDocumentRequest(
        "create",
        encode({ deliveryId: crypto.randomUUID(), request: content }),
      );
      if (request.request.operation !== this.options.operation)
        return Promise.resolve(refused("not-dispatched"));
      return this.write("create", request, signal);
    } catch {
      return Promise.resolve(refused("not-dispatched"));
    }
  }
  revise(
    handle: object,
    content: unknown,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>> {
    const held = this.handles.get(handle);
    if (!held) return Promise.resolve(refused("not-dispatched"));
    try {
      const request = receiveDocumentRequest(
        "revise",
        encode({
          deliveryId: crypto.randomUUID(),
          baseVersionId: held.version.versionId,
          request: content,
        }),
      );
      if (request.request.operation !== this.options.operation)
        return Promise.resolve(refused("not-dispatched"));
      return this.write("revise", request, signal, held.version);
    } catch {
      return Promise.resolve(refused("not-dispatched"));
    }
  }
  private async read<T>(
    caller: AbortSignal,
    receive: (signal: AbortSignal) => Promise<T>,
  ): Promise<DocumentReply<T>> {
    const blocked = this.preflight(caller);
    if (blocked) return refused(blocked);
    this.busy = true;
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    try {
      const value = await receive(signal);
      this.current(signal);
      return { ok: true, value };
    } catch (error) {
      if (error instanceof DocumentAccessUnavailable && !signal.aborted)
        this.loseAccess();
      return refused(
        error instanceof DocumentAccessUnavailable
          ? "access-lost"
          : error instanceof NativeRevisionUnavailable
            ? "native-revision-unavailable"
            : "read-unavailable",
      );
    } finally {
      this.busy = false;
    }
  }
  inspect(
    handle: object,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>> {
    const held = this.handles.get(handle);
    return held
      ? this.inspectVersion(held.version.versionId, signal)
      : Promise.resolve(refused("not-dispatched"));
  }
  inspectVersion(
    versionId: string,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentVersionView>> {
    let request: AdmittedDocumentRequest<"inspect">;
    try {
      request = receiveDocumentRequest("inspect", encode({ versionId }));
    } catch {
      return Promise.resolve(refused("not-dispatched"));
    }
    return this.read(signal, async (current) => {
      const { status, value } = await this.options.transport.request(
        "inspect",
        request,
        current,
      );
      this.current(current);
      if ("error" in value) {
        if (this.error(value, status) === "access-lost")
          throw new DocumentAccessUnavailable();
        throw new Error("Document read unavailable");
      }
      return this.adopt(value);
    });
  }
  download(
    handle: object,
    signal: AbortSignal,
  ): Promise<DocumentReply<DocumentDownloadView>> {
    const held = this.handles.get(handle);
    if (!held) return Promise.resolve(refused("not-dispatched"));
    const request = receiveDocumentRequest(
      "download",
      encode({ versionId: held.version.versionId }),
    );
    return this.read(signal, async (current) => {
      const { status, value } = await this.options.transport.download(
        request,
        held.version,
        current,
      );
      this.current(current);
      if ("error" in value) {
        if (this.error(value, status) === "access-lost")
          throw new DocumentAccessUnavailable();
        throw new Error("Document download unavailable");
      }
      if (value.version !== held.version)
        throw new Error("Foreign downloaded version");
      return Object.freeze({ version: held.view, bytes: value.bytes });
    });
  }
}
