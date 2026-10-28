import type {
  AdmittedUploadReceipt,
  AdmittedUploadRequest,
  UploadReceipt,
} from "./facade";

/**
 * Exact-attempt ledger. The canonical receiver brands an admitted request in a module-local
 * WeakMap, and that brand is deliberately not serializable, storable or restorable; a retained
 * attempt therefore keeps the admitted objects and the exact bytes it was admitted from, so a
 * repeated read re-uses the same request instead of rebuilding an equivalent one.
 */
export type RetainedUpload = {
  readonly requestId: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly sha256: string;
  /**
   * The exact declared original bytes. The canonical preflight verifies these bytes against the
   * receipt before every write, so a repeated or mismatched attempt cannot be written twice.
   */
  readonly original: Uint8Array;
  /** The exact bytes admitted for `initiate`, repeated verbatim on every later read. */
  readonly initiateBytes: Uint8Array;
  readonly initiate: AdmittedUploadRequest<"initiate">;
  readonly completeBytes: Uint8Array;
  readonly complete: AdmittedUploadRequest<"complete">;
  readonly uploadId: string;
  /** Latest receipt this page received for the attempt; never a grant of access or retry. */
  receipt: AdmittedUploadReceipt;
};

/** A second, different declaration for the same attempt is a local contradiction, not a server reply. */
export class UploadAttemptConflict extends Error {
  constructor() {
    super("This upload attempt was already declared with different bytes.");
    this.name = "UploadAttemptConflict";
  }
}

export function createUploadLedger() {
  const byRequest = new Map<string, RetainedUpload>();
  const byUpload = new Map<string, RetainedUpload>();
  const identity = (upload: {
    requestId: string;
    filename: string;
    mimeType: string;
    bytes: number;
    sha256: string;
    initiateBytes: Uint8Array;
  }) =>
    JSON.stringify([
      upload.requestId,
      upload.filename,
      upload.mimeType,
      upload.bytes,
      upload.sha256,
      Array.from(upload.initiateBytes),
    ]);
  return {
    retain(upload: RetainedUpload) {
      const existing = byRequest.get(upload.requestId);
      if (existing && identity(existing) !== identity(upload))
        throw new UploadAttemptConflict();
      byRequest.set(upload.requestId, upload);
      byUpload.set(upload.uploadId, upload);
      return upload;
    },
    byRequestId: (requestId: string) => byRequest.get(requestId),
    byUploadId: (uploadId: string) => byUpload.get(uploadId),
    /** Locally forgetting an attempt never disposes of it; the server still holds its custody. */
    release(requestId: string) {
      const found = byRequest.get(requestId);
      if (!found) return;
      byRequest.delete(requestId);
      byUpload.delete(found.uploadId);
    },
    size: () => byRequest.size,
  };
}

export type UploadLedger = ReturnType<typeof createUploadLedger>;

/** The receipt fields the composer may present; no access, download or retry authority is implied. */
export type UploadReceiptView = Readonly<{
  uploadId: string;
  bytes: number;
  sha256: string;
  storageStatus: UploadReceipt["storageStatus"];
  scanStatus: UploadReceipt["scanStatus"];
  scanReason: string | null;
  extraction: UploadReceipt["extraction"];
  originalBytesAvailable: boolean;
}>;

export const receiptView = (receipt: AdmittedUploadReceipt): UploadReceiptView =>
  Object.freeze({
    uploadId: receipt.uploadId,
    bytes: receipt.original.bytes,
    sha256: receipt.original.sha256,
    storageStatus: receipt.storageStatus,
    scanStatus: receipt.scanStatus,
    scanReason: receipt.scanReason,
    extraction: receipt.extraction,
    originalBytesAvailable: receipt.originalBytesAvailable,
  });
