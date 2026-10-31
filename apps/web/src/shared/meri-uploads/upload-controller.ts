import type { UploadAttemptReferences } from "./upload-attempt-storage";
import {
  receiveUploadRequest,
  type AdmittedUploadReceipt,
  type UploadReceipt,
} from "./facade";
import {
  createUploadLedger,
  receiptView,
  type RetainedUpload,
  type UploadReceiptView,
} from "./upload-recovery";
import type {
  UploadDeclaration,
  UploadRefusal,
  UploadWire,
} from "./upload-wire";

/**
 * States this page can observe. `unknown` is the contract's uncertain case: a dispatched original
 * write, or a declaration, with no usable reply. Nothing re-dispatches from it; only a status read
 * may re-resolve the attempt.
 */
export type UploadItemState =
  | "declaring"
  | "uploading"
  | "stored"
  | "unknown"
  | "removing"
  | "removed"
  | "refused";

export type UploadItem = Readonly<{
  requestId: string;
  uploadId: string | null;
  filename: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  state: UploadItemState;
  /** Only receipt fields the service actually returned; absent until a receipt is admitted. */
  receipt?: UploadReceiptView;
  refusal?: UploadRefusal;
}>;

/** The ordered argument the canonical conversation input takes for this draft. */
export type UploadSendArgument = Readonly<{ uploadId: string; sha256: string }>;

/**
 * A source the conversation already established, read from its own admitted request echo. It is an
 * id and a digest only: no bytes, no filename, no status and no file access travel with it.
 */
export type EstablishedUpload = Readonly<{ uploadId: string; sha256: string }>;

/** The canonical conversation input carries 1..8 ordered distinct upload ids. */
export const MAX_COMPOSER_UPLOADS = 8;

export type IncomingUpload = Readonly<{
  uploadId: string;
  sha256: string;
  selected: boolean;
}>;

const identified = (value: unknown): value is EstablishedUpload =>
  !!value &&
  typeof value === "object" &&
  typeof (value as EstablishedUpload).uploadId === "string" &&
  (value as EstablishedUpload).uploadId.length > 0 &&
  typeof (value as EstablishedUpload).sha256 === "string";

const stateOf = (receipt: UploadReceipt): UploadItemState =>
  receipt.storageStatus === "stored"
    ? "stored"
    : receipt.storageStatus === "removed"
      ? "removed"
      : receipt.storageStatus === "removing"
        ? "removing"
        : "unknown";

/**
 * One conversation's composer attachments. The service still owns custody: a retained receipt
 * neither authorizes a send nor allows a removal, a repeated declaration of the same attempt is
 * refused locally because its bytes would no longer be the admitted ones, and only a stored attempt
 * may enter a message.
 */
export function createUploadController(options: {
  wire: UploadWire;
  recovery?: UploadAttemptReferences;
  /** False once this controller's conversation, account or client is no longer on screen. */
  isCurrent: () => boolean;
  /**
   * Sources the displayed conversation already holds, read from its own admitted snapshot. Selecting
   * one reuses its exact id; nothing here can write an original again for it.
   */
  established?: () => readonly EstablishedUpload[];
  onChange?: () => void;
}) {
  const ledger = createUploadLedger();
  const items = new Map<string, UploadItem>();
  const attempts = new Map<string, AbortController>();
  const chosen = new Set<string>();
  const lifetime = new AbortController();
  const listeners = new Set<() => void>();
  let version = 0;
  let disposed = false;
  let recoveryUnavailable = false;
  try {
    if (options.isCurrent())
      for (const requestId of options.recovery?.list() ?? []) {
        items.set(
          requestId,
          Object.freeze({
            requestId,
            uploadId: null,
            filename: "Upload awaiting status",
            mimeType: "",
            bytes: 0,
            sha256: "",
            state: "unknown",
          }),
        );
      }
  } catch {
    recoveryUnavailable = true;
  }
  const current = () =>
    !disposed && !lifetime.signal.aborted && options.isCurrent();
  const changed = () => {
    version++;
    options.onChange?.();
    for (const listener of listeners) listener();
  };
  const update = (requestId: string, next: UploadItem) => {
    if (next.state === "removed") {
      try {
        options.recovery?.release(requestId);
      } catch {
        /* Check can resolve the retained locator again. */
      }
    }
    items.set(requestId, Object.freeze(next));
    changed();
  };
  /** A late reply for a conversation that is no longer on screen is discarded, not published. */
  const withReceipt = (
    item: UploadItem,
    receipt: AdmittedUploadReceipt,
  ): UploadItem => ({
    ...item,
    uploadId: receipt.uploadId,
    filename: receipt.original.filename,
    mimeType: receipt.original.mimeType,
    bytes: receipt.original.bytes,
    sha256: receipt.original.sha256,
    state: stateOf(receipt),
    receipt: receiptView(receipt),
  });

  /** Established sources in the order the conversation reported them, without duplicates or junk. */
  function sources(): readonly EstablishedUpload[] {
    const seen = new Set<string>();
    const found: EstablishedUpload[] = [];
    for (const value of options.established?.() ?? []) {
      if (!identified(value) || seen.has(value.uploadId)) continue;
      seen.add(value.uploadId);
      found.push(value);
    }
    return found;
  }

  const selectedCount = () =>
    sources().filter((source) => chosen.has(source.uploadId)).length;

  /** One in-flight attempt per row; cancelling aborts only that attempt's own bounded operation. */
  function attempt(requestId: string) {
    const controller = new AbortController();
    attempts.set(requestId, controller);
    return {
      signal: AbortSignal.any([lifetime.signal, controller.signal]),
      done: () => {
        if (attempts.get(requestId) === controller) attempts.delete(requestId);
      },
    };
  }

  async function add(
    files: readonly File[],
    onStarted?: (requestId: string) => void,
  ) {
    const room = MAX_COMPOSER_UPLOADS - (items.size + selectedCount());
    if (room < 1) return;
    for (const file of files.slice(0, room)) {
      if (!current()) return;
      const requestId = crypto.randomUUID();
      // A local handoff can correlate this exact owner-generated attempt before
      // dispatch. Throwing here refuses admission without creating a row/write.
      onStarted?.(requestId);
      const item: UploadItem = {
        requestId,
        uploadId: null,
        filename: file.name,
        mimeType: file.type,
        bytes: file.size,
        sha256: "",
        state: "declaring",
      };
      // One cancellable attempt spans declaration and original storage. Register
      // it before publishing either stage, so a subscriber can pause immediately.
      const run = attempt(requestId);
      update(requestId, item);
      try {
        await storeOriginal(item, file, run.signal);
      } finally {
        run.done();
      }
    }
  }

  /** The existing wire admits both stages under the same cancellation signal. */
  async function storeOriginal(
    item: UploadItem,
    file: File,
    signal: AbortSignal,
  ) {
    const { requestId } = item;
    try {
      if (recoveryUnavailable) throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      options.recovery?.retain(requestId);
    } catch {
      update(requestId, {
        ...item,
        state: "refused",
        refusal: { code: "UPLOAD_RECOVERY_UNAVAILABLE" },
      });
      return;
    }
    if (!current()) return;
    if (signal.aborted) {
      update(requestId, {
        ...item,
        state: "refused",
        refusal: { code: "CANCELLED" },
      });
      return;
    }
    const declared = await options.wire.declare(requestId, file, signal);
    if (!current()) return;
    if (!declared.ok) {
      update(requestId, {
        ...item,
        state: declared.refusal.uncertain ? "unknown" : "refused",
        refusal: declared.refusal,
      });
      return;
    }
    const retained = retain(requestId, declared.value);
    // Only this admitted declaration supplies the id and expected original.
    update(requestId, {
      ...withReceipt(item, declared.value.receipt),
      state: "uploading",
    });
    const written = await options.wire.write(retained, signal);
    if (!current()) return;
    const previous = items.get(requestId) ?? item;
    if (!written.ok) {
      update(requestId, {
        ...previous,
        state: written.refusal.uncertain ? "unknown" : "refused",
        refusal: written.refusal,
      });
      return;
    }
    retained.receipt = written.value;
    update(requestId, withReceipt(previous, written.value));
  }

  /** Keep the admitted declaration and the one admitted original request for this attempt. */
  function retain(
    requestId: string,
    declared: UploadDeclaration,
  ): RetainedUpload {
    // The original request is bounded to the id the service just allocated; admitted here once.
    const completeBytes = new TextEncoder().encode(
      JSON.stringify({ uploadId: declared.receipt.uploadId }),
    );
    return ledger.retain({
      requestId,
      filename: declared.receipt.original.filename,
      mimeType: declared.receipt.original.mimeType,
      bytes: declared.receipt.original.bytes,
      sha256: declared.receipt.original.sha256,
      original: declared.original,
      initiateBytes: declared.bytes,
      initiate: declared.admitted,
      completeBytes,
      complete: receiveUploadRequest("complete", completeBytes),
      uploadId: declared.receipt.uploadId,
      receipt: declared.receipt,
    });
  }

  /** The only operation allowed after an uncertain write: read custody, never write again. */
  async function check(requestId: string) {
    const item = items.get(requestId);
    const retained = ledger.byRequestId(requestId);
    if (!current() || !item || attempts.has(requestId)) return;
    const run = attempt(requestId);
    let reply;
    try {
      reply = item.uploadId
        ? await options.wire.status(item.uploadId, run.signal)
        : await options.wire.statusByRequest(requestId, run.signal);
    } finally {
      run.done();
    }
    if (!current()) return;
    const previous = items.get(requestId) ?? item;
    if (!reply.ok) {
      update(requestId, {
        ...previous,
        ...(reply.refusal.uncertain ? { state: "unknown" as const } : {}),
        refusal: reply.refusal,
      });
      return;
    }
    if (
      previous.uploadId &&
      (previous.uploadId !== reply.value.uploadId ||
        previous.sha256 !== reply.value.original.sha256)
    ) {
      update(requestId, {
        ...previous,
        state: "unknown",
        refusal: { code: "UPLOAD_CORRELATION", uncertain: true },
      });
      return;
    }
    if (retained) retained.receipt = reply.value;
    update(requestId, withReceipt(previous, reply.value));
  }

  async function remove(requestId: string) {
    const item = items.get(requestId);
    if (!current() || !item || attempts.has(requestId)) return;
    if (!item.uploadId) {
      // A missing initiate reply does not prove that no record was allocated.
      if (item.state !== "refused" || item.refusal?.uncertain) return;
      try {
        options.recovery?.release(requestId);
      } catch {
        return;
      }
      items.delete(requestId);
      changed();
      return;
    }
    const run = attempt(requestId);
    let reply;
    try {
      reply = await options.wire.remove(item.uploadId, run.signal);
    } finally {
      run.done();
    }
    if (!current()) return;
    const previous = items.get(requestId) ?? item;
    if (!reply.ok) {
      update(requestId, {
        ...previous,
        ...(reply.refusal.uncertain ? { state: "unknown" as const } : {}),
        refusal: reply.refusal,
      });
      return;
    }
    const retained = ledger.byRequestId(requestId);
    if (
      previous.uploadId &&
      (previous.uploadId !== reply.value.uploadId ||
        previous.sha256 !== reply.value.original.sha256)
    ) {
      update(requestId, {
        ...previous,
        state: "unknown",
        refusal: { code: "UPLOAD_CORRELATION", uncertain: true },
      });
      return;
    }
    if (retained) retained.receipt = reply.value;
    update(requestId, withReceipt(previous, reply.value));
  }

  /** Sources the conversation already holds, with the state of this message's selection. */
  function incoming(): readonly IncomingUpload[] {
    return sources().map((source) =>
      Object.freeze({ ...source, selected: chosen.has(source.uploadId) }),
    );
  }

  /**
   * Choosing an established source adds it to this message's argument and nothing else. Its bytes are
   * not here and are not needed: the service re-resolves custody when the message is admitted.
   */
  function toggle(uploadId: string) {
    if (disposed || lifetime.signal.aborted) return;
    if (!sources().some((source) => source.uploadId === uploadId)) return;
    if (chosen.has(uploadId)) {
      chosen.delete(uploadId);
      changed();
      return;
    }
    if (items.size + selectedCount() >= MAX_COMPOSER_UPLOADS) return;
    chosen.add(uploadId);
    changed();
  }

  /**
   * Cancels this page's own operation for one row. An attempt already in flight is aborted; if it had
   * reached the service its row becomes uncertain and only a status read may resolve it. A row whose
   * file was never allocated is simply dropped, and an allocated row keeps its canonical Check and
   * Remove operations instead of a local cancellation pretending to undo custody.
   */
  function cancel(requestId: string) {
    const running = attempts.get(requestId);
    if (running) {
      attempts.delete(requestId);
      running.abort();
      return;
    }
    const item = items.get(requestId);
    if (
      !current() ||
      !item ||
      item.uploadId ||
      item.state !== "refused" ||
      item.refusal?.uncertain
    )
      return;
    try {
      options.recovery?.release(requestId);
    } catch {
      return;
    }
    items.delete(requestId);
    changed();
  }

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
    items: (): readonly UploadItem[] => Array.from(items.values()),
    incoming,
    toggle,
    /**
     * The exact ordered argument for the canonical conversation input: distinct upload ids with the
     * digest this page declared, established sources first in the order the conversation reported
     * them. Only a stored attempt may enter it, so an uncertain write can never be sent as if it were
     * stored; custody, scan and extraction stay the service's decision.
     */
    sendArgument: (): readonly UploadSendArgument[] => {
      // A disposed or revoked session offers no argument: nothing may be sent from it.
      if (!current()) return Object.freeze([]);
      const argument: UploadSendArgument[] = [];
      const seen = new Set<string>();
      const stored = Array.from(items.values())
        .filter((item) => item.state === "stored" && item.uploadId !== null)
        .map((item) => ({
          uploadId: item.uploadId as string,
          sha256: item.sha256,
        }));
      for (const entry of [
        ...sources().filter((source) => chosen.has(source.uploadId)),
        ...stored,
      ]) {
        if (seen.has(entry.uploadId)) continue;
        if (argument.length >= MAX_COMPOSER_UPLOADS) break;
        seen.add(entry.uploadId);
        argument.push(
          Object.freeze({ uploadId: entry.uploadId, sha256: entry.sha256 }),
        );
      }
      return Object.freeze(argument);
    },
    add,
    check,
    remove,
    cancel,
    pending: () => options.wire.pending() || attempts.size > 0,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const running of attempts.values()) running.abort();
      attempts.clear();
      lifetime.abort();
      listeners.clear();
    },
  };
}

export type UploadController = ReturnType<typeof createUploadController>;
