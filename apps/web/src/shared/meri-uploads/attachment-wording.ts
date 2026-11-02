import type { UploadItem } from "./upload-controller";

/**
 * What the composer says about one attachment, in plain words. The service's closed codes
 * (scan status, scan reason, extraction limitations, refusal code) are never shown as the state;
 * they travel in `detail` for a tooltip and for support, so the chip reads "Checking the file…"
 * rather than "SCAN_PENDING · EXTRACTION_PENDING · ORIGINAL_UNAVAILABLE".
 */
export type AttachmentWording = Readonly<{
  /** The visible state. */
  label: string;
  /** The service's own codes for this state, for the tooltip; empty when there are none. */
  detail: string;
  /** Whether the person should still wait on this attachment. */
  waiting: boolean;
}>;

/** Whether a stored attachment may enter a message: scanned clean and readable (fully or in part). */
export const attachmentReady = (item: UploadItem): boolean =>
  item.state === "stored" &&
  item.receipt?.scanStatus === "clean" &&
  (item.receipt.extraction.status === "available" ||
    item.receipt.extraction.status === "partial");

/** Whether the service is still genuinely checking a stored attachment (scan, then text extraction). */
export const attachmentChecking = (item: UploadItem): boolean =>
  item.state === "stored" &&
  (item.receipt?.scanStatus === "pending" ||
    (item.receipt?.scanStatus === "clean" &&
      item.receipt.extraction.status === "pending"));

const codes = (...values: readonly (string | null | undefined)[]) =>
  values.filter((value): value is string => !!value).join(" · ");

export function attachmentWording(
  item: UploadItem,
  /** True once the bounded wait for a check has passed; the person may send without it or remove it. */
  overdue = false,
): AttachmentWording {
  const refusal = item.refusal?.code;
  if (item.state === "declaring" || item.state === "uploading")
    return { label: "Uploading…", detail: "", waiting: true };
  if (item.state === "removed")
    return { label: "Removed", detail: "", waiting: false };
  if (item.state === "removing")
    return {
      label: "Removed from this message",
      detail: codes("storage: removing", refusal),
      waiting: false,
    };
  if (item.state === "unknown")
    return {
      label: "Status unknown — check it",
      detail: codes(refusal ?? "UNKNOWN_OUTCOME"),
      waiting: false,
    };
  if (item.state === "refused")
    return {
      label: "Could not upload this file",
      detail: codes(
        refusal,
        item.refusal?.recoveryCleanupFailed
          ? "recovery reference could not be cleared"
          : null,
      ),
      waiting: false,
    };
  const receipt = item.receipt;
  if (!receipt) return { label: "Stored", detail: "", waiting: false };
  const detail = codes(
    `scan: ${receipt.scanStatus}`,
    receipt.scanReason,
    `text: ${receipt.extraction.status}`,
    ...receipt.extraction.limitations,
  );
  if (receipt.scanStatus === "pending")
    return overdue
      ? {
          label: "Still checking — send without it or remove it",
          detail,
          waiting: false,
        }
      : { label: "Checking the file…", detail, waiting: true };
  if (receipt.scanStatus === "infected")
    return { label: "Blocked by the safety check", detail, waiting: false };
  if (receipt.scanStatus === "unavailable")
    return { label: "Could not read this file", detail, waiting: false };
  switch (receipt.extraction.status) {
    case "pending":
      return overdue
        ? {
            label: "Still reading — send without it or remove it",
            detail,
            waiting: false,
          }
        : { label: "Reading the text…", detail, waiting: true };
    case "available":
      return { label: "Ready", detail, waiting: false };
    case "partial":
      return { label: "Ready (parts could not be read)", detail, waiting: false };
    default:
      return { label: "Could not read this file", detail, waiting: false };
  }
}
