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
 * neither authorizes a send nor allows a removal, and a repeated declaration of the same attempt is
 * refused locally because its bytes would no longer be the admitted ones.
 */
export function createUploadController(options: {
  wire: UploadWire;
  /** False once this controller's conversation, account or client is no longer on screen. */
  isCurrent: () => boolean;
  onChange?: () => void;
}) {
  const ledger = createUploadLedger();
  const items = new Map<string, UploadItem>();
  const lifetime = new AbortController();
  const listeners = new Set<() => void>();
  let version = 0;
  let disposed = false;
  const current = () => !disposed && !lifetime.signal.aborted && options.isCurrent();
  const changed = () => {
    version++;
    options.onChange?.();
    for (const listener of listeners) listener();
  };
  const update = (requestId: string, next: UploadItem) => {
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

  async function add(files: readonly File[]) {
    for (const file of files) {
      if (!current()) return;
      const requestId = crypto.randomUUID();
      const item: UploadItem = {
        requestId,
        uploadId: null,
        filename: file.name,
        mimeType: file.type,
        bytes: file.size,
        sha256: "",
        state: "declaring",
      };
      update(requestId, item);
      const declared = await options.wire.declare(
        requestId,
        file,
        lifetime.signal,
      );
      if (!current()) return;
      if (!declared.ok) {
        update(requestId, {
          ...item,
          state: declared.refusal.uncertain ? "unknown" : "refused",
          refusal: declared.refusal,
        });
        continue;
      }
      const retained = retain(requestId, file, declared.value);
      // The declaration reply is the only source of the allocated id and of the original it expects.
      update(requestId, {
        ...withReceipt(item, declared.value.receipt),
        state: "uploading",
      });
      const written = await options.wire.write(retained, lifetime.signal);
      if (!current()) return;
      const previous = items.get(requestId) ?? item;
      if (!written.ok) {
        update(requestId, {
          ...previous,
          state: written.refusal.uncertain ? "unknown" : "refused",
          refusal: written.refusal,
        });
        continue;
      }
      retained.receipt = written.value;
      update(requestId, withReceipt(previous, written.value));
    }
  }

  /** Keep the admitted declaration and the one admitted original request for this attempt. */
  function retain(
    requestId: string,
    file: File,
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
    if (!current() || !item?.uploadId || !retained) return;
    const reply = await options.wire.status(item.uploadId, lifetime.signal);
    if (!current()) return;
    const previous = items.get(requestId) ?? item;
    if (!reply.ok) {
      update(requestId, { ...previous, refusal: reply.refusal });
      return;
    }
    retained.receipt = reply.value;
    update(requestId, withReceipt(previous, reply.value));
  }

  async function remove(requestId: string) {
    const item = items.get(requestId);
    if (!current() || !item) return;
    if (!item.uploadId) {
      // Nothing was ever allocated for this file; dropping the local row disposes of it.
      items.delete(requestId);
      changed();
      return;
    }
    const reply = await options.wire.remove(item.uploadId, lifetime.signal);
    if (!current()) return;
    const previous = items.get(requestId) ?? item;
    if (!reply.ok) {
      update(requestId, { ...previous, refusal: reply.refusal });
      return;
    }
    const retained = ledger.byRequestId(requestId);
    if (retained) retained.receipt = reply.value;
    update(requestId, withReceipt(previous, reply.value));
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
    /**
     * The exact ordered argument for the canonical conversation input: distinct upload ids with the
     * digest this page declared. Custody, scan and extraction stay the service's decision.
     */
    sendArgument: (): readonly UploadSendArgument[] =>
      Array.from(items.values())
        .filter((item) => item.state === "stored" && item.uploadId !== null)
        .map((item) => ({
          uploadId: item.uploadId as string,
          sha256: item.sha256,
        })),
    add,
    check,
    remove,
    pending: () => options.wire.pending(),
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      listeners.clear();
    },
  };
}

export type UploadController = ReturnType<typeof createUploadController>;
