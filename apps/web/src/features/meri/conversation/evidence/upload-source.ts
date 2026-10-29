import type {
  SavedUploadOriginal,
  UploadCurrentCustody,
} from "../../../../shared/meri-uploads/current-read";
import type { FieldRow } from "../../ui/FieldTable";
import type { SourceSummary } from "../../ui/SourceCard";
import type { NativeUploadSourceEvent } from "../conversation-view";

/**
 * What one saved upload source event states, projected into what this surface may show.
 *
 * The event is metadata only: a filename and type, the saved original's identity and digest, one
 * extracted page's coverage and the limitations the reader recorded. It carries no extracted text
 * and no fragment text, and this app has no public extracted-fragment route to ask for any, so no
 * reader of these helpers may present them as source text. Nothing here establishes that an answer
 * cited the file, that this client may still open it, or that extraction is complete.
 */

/** The saved original identity a read must still find in current custody. Never access. */
export function uploadSavedReference(
  event: NativeUploadSourceEvent,
): SavedUploadOriginal {
  const { source } = event.data;
  return Object.freeze({
    uploadId: source.uploadId,
    sha256: source.sha256,
    versionId: source.versionId,
    filename: source.filename,
    mimeType: source.mimeType,
    bytes: source.bytes,
  });
}

export function uploadSizeLabel(bytes: number): string {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const extraction = (
  status: "available" | "partial" | "pending" | "unavailable" | "blocked",
): string =>
  status === "available"
    ? "Extraction available"
    : status === "partial"
      ? "Partial extraction"
      : status === "pending"
        ? "Extraction pending"
        : status === "blocked"
          ? "Extraction blocked"
          : "Extraction unavailable";

const limitations = (values: readonly string[]): string =>
  values.length === 0 ? "None recorded" : values.join(" · ");

/** The saved observation's own coverage: one page of the private extracted read, never the file. */
export function uploadSavedCoverage(event: NativeUploadSourceEvent): string {
  const { page } = event.data;
  return `${page.number + 1} of ${page.count} · ${page.fragmentCount} fragment(s) · ${
    page.nextPage === null
      ? "no further page observed"
      : `next page ${page.nextPage + 1}`
  }`;
}

export function uploadSavedSummary(event: NativeUploadSourceEvent): string {
  const { page, source } = event.data;
  return `Saved upload reference · ${extraction(source.extractionStatus).toLowerCase()} · extracted page ${page.number + 1} of ${page.count} observed (${page.fragmentCount} fragment(s))`;
}

/** One card for the saved upload; `saved` is the shared "Saved <time>" label of the run fold. */
export function savedUploadSource(
  event: NativeUploadSourceEvent,
  saved: string,
): SourceSummary {
  const { source } = event.data;
  return {
    id: event.eventId,
    title: `Uploaded file · ${source.filename}`,
    meta: `${source.mimeType} · ${uploadSizeLabel(source.bytes)} · ${saved}`,
    summary: uploadSavedSummary(event),
  };
}

/** Everything the saved event itself states, including the limits of what it establishes. */
export function uploadSavedRows(
  event: NativeUploadSourceEvent,
): readonly FieldRow[] {
  const { page, source } = event.data;
  return [
    { label: "File", value: source.filename },
    { label: "Type", value: source.mimeType },
    { label: "Size", value: uploadSizeLabel(source.bytes) },
    { label: "Saved upload", value: source.uploadId },
    { label: "Saved original digest", value: source.sha256 },
    { label: "Saved original version", value: source.versionId },
    { label: "Extracted text", value: extraction(source.extractionStatus) },
    { label: "Extracted page observed", value: uploadSavedCoverage(event) },
    {
      label: "Limitations recorded then",
      value: limitations([...source.limitations, ...page.limitations]),
    },
  ];
}

export function uploadCustodyRows(
  custody: UploadCurrentCustody,
): readonly FieldRow[] {
  return [
    { label: "Custody", value: uploadStorageLabel(custody.storageStatus) },
    {
      label: "Scan",
      value:
        custody.scanReason === null
          ? uploadScanLabel(custody.scanStatus)
          : `${uploadScanLabel(custody.scanStatus)} · ${custody.scanReason}`,
    },
    { label: "Extracted text", value: extraction(custody.extraction.status) },
    {
      label: "Extraction limitations",
      value: limitations(custody.extraction.limitations),
    },
    {
      label: "Original bytes",
      value: custody.originalBytesAvailable
        ? "Available to read"
        : "Not available to read",
    },
  ];
}

export function uploadStorageLabel(
  status: UploadCurrentCustody["storageStatus"],
): string {
  return status === "stored"
    ? "Stored"
    : status === "awaiting_upload"
      ? "Awaiting upload"
      : status === "removing"
        ? "Being removed"
        : status === "removed"
          ? "Removed"
          : "Unknown";
}

export function uploadScanLabel(
  status: UploadCurrentCustody["scanStatus"],
): string {
  return status === "clean"
    ? "Scan clean"
    : status === "pending"
      ? "Scan pending"
      : status === "infected"
        ? "Scan found a threat"
        : "Scan unavailable";
}

export function uploadStorageTone(
  status: UploadCurrentCustody["storageStatus"],
): "neutral" | "success" | "warning" | "danger" {
  return status === "stored"
    ? "success"
    : status === "removing" || status === "removed"
      ? "danger"
      : "warning";
}

export function uploadScanTone(
  status: UploadCurrentCustody["scanStatus"],
): "neutral" | "success" | "warning" | "danger" {
  return status === "clean"
    ? "success"
    : status === "pending"
      ? "warning"
      : "danger";
}

/** Presentation of a refusal the canonical receivers reported; it invents no outcome. */
export function uploadFailure(code: string): {
  title: string;
  detail: string;
  retry: boolean;
} {
  if (code === "UPLOAD_REFERENCE_CHANGED" || code === "UPLOAD_CHANGED")
    return {
      title: "The saved file has changed",
      detail:
        "Current custody no longer carries exactly the original this saved reference names. Nothing was read or downloaded.",
      retry: false,
    };
  if (code === "UPLOAD_ACCESS_DENIED" || code === "ACCESS_DENIED")
    return {
      title: "File access is unavailable",
      detail: "You cannot open this file with your current access.",
      retry: false,
    };
  if (
    code === "UPLOAD_NOT_FOUND" ||
    code === "NOT_FOUND" ||
    code === "CONVERSATION_NOT_FOUND"
  )
    return {
      title: "Saved file is unavailable",
      detail: "This saved upload reference cannot be opened.",
      retry: false,
    };
  if (code === "UPLOAD_NOT_STORED")
    return {
      title: "The original is no longer stored",
      detail:
        "Current custody does not hold the original bytes of this saved file.",
      retry: false,
    };
  if (code === "UPLOAD_NOT_CLEAN")
    return {
      title: "The original is not available to read",
      detail:
        "Current scan or retention state does not allow reading this original. The file itself is still recorded.",
      retry: true,
    };
  if (code === "CANCELLED")
    return {
      title: "The check was cancelled",
      detail:
        "This file was not read. Check it again to re-query current custody.",
      retry: true,
    };
  return {
    title: "File custody is unavailable",
    detail:
      "This saved file could not be checked. This does not mean that the file is absent.",
    retry: true,
  };
}
