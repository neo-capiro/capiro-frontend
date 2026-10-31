"use client";
import { useId, useRef } from "react";
import { PromptInputButton } from "@capiro/ui/prompt-input";
import { UPLOAD_MIME } from "../../../shared/meri-uploads/facade";
import type { UploadItem } from "../../../shared/meri-uploads/upload-controller";
import { DesignIcon } from "../../../shared/shell/DesignIcon";
import styles from "../home.module.css";
import type { ComposerAttachments } from "./attachment-slot";

/** Only the canonical MIME values are offered; the receiver still decides admission. */
const accepted = Object.values(UPLOAD_MIME).join(",");
const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.max(1, Math.round(bytes / 1024))} KiB`;

/** Presentation of the state this page observed; it never claims a scan or extraction result. */
function describe(item: UploadItem) {
  if (item.state === "refused" || item.state === "unknown")
    return `${item.refusal?.code ?? "UNKNOWN_OUTCOME"}${item.refusal?.uncertain ? " — outcome unverified" : ""}`;
  if (item.state === "declaring") return "DECLARING";
  if (item.state === "uploading") return "WRITING_ORIGINAL";
  if (item.state === "removing") return "REMOVING";
  if (item.state === "removed") return "REMOVED";
  const receipt = item.receipt;
  if (!receipt) return "STORED";
  const scan = {
    pending: "SCAN_PENDING",
    clean: "SCAN_CLEAN",
    infected: `SCAN_INFECTED${receipt.scanReason ? `:${receipt.scanReason}` : ""}`,
    unavailable: `SCAN_UNAVAILABLE${receipt.scanReason ? `:${receipt.scanReason}` : ""}`,
  }[receipt.scanStatus];
  const extraction = {
    pending: "EXTRACTION_PENDING",
    available: "EXTRACTION_AVAILABLE",
    partial: `EXTRACTION_PARTIAL:${receipt.extraction.limitations.join("+")}`,
    unavailable: `EXTRACTION_UNAVAILABLE${receipt.extraction.limitations.length ? `:${receipt.extraction.limitations.join("+")}` : ""}`,
    blocked: `EXTRACTION_BLOCKED${receipt.extraction.limitations.length ? `:${receipt.extraction.limitations.join("+")}` : ""}`,
  }[receipt.extraction.status];
  return [
    scan,
    extraction,
    receipt.originalBytesAvailable
      ? "ORIGINAL_AVAILABLE"
      : "ORIGINAL_UNAVAILABLE",
  ].join(" · ");
}

/** The composer's one attachment control: pick, show what the service said, check status, remove. */
export function MeriAttachmentPicker({
  slot,
  assetSet,
}: {
  slot: ComposerAttachments;
  assetSet: "home" | "cited-answer";
}) {
  const label = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const full = slot.items.length >= slot.limit;
  return (
    <>
      <input
        ref={input}
        id={label}
        className="sr-only"
        type="file"
        multiple
        accept={accepted}
        onChange={(event) => {
          const picked = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (picked.length) slot.onPick(picked);
        }}
      />
      <PromptInputButton
        className={styles.toolButton}
        type="button"
        disabled={slot.busy || full}
        title={
          full
            ? `A message carries at most ${slot.limit} files`
            : (slot.unavailable ?? "Attach a file to this message")
        }
        onClick={() => input.current?.click()}
      >
        <DesignIcon
          name={assetSet === "home" ? "plus" : "plus-secondary"}
          assetSet={assetSet}
        />
        Attach
      </PromptInputButton>
      {slot.incoming.length > 0 && (
        <ul
          className={styles.tools}
          aria-label="Files this conversation already holds"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            width: "100%",
          }}
        >
          {slot.incoming.map((source) => (
            <li
              key={source.uploadId}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>{`file in this conversation: ${source.uploadId.slice(0, 8)}`}</span>
              <span role="status">IN_CONVERSATION</span>
              <button
                type="button"
                aria-pressed={source.selected}
                disabled={slot.busy}
                aria-label={
                  source.selected
                    ? "Leave this file out of the next message"
                    : "Include this file in the next message"
                }
                onClick={() => slot.onToggleIncoming(source.uploadId)}
              >
                {source.selected ? "Included" : "Include"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {slot.items.length > 0 && (
        <ul
          className={styles.tools}
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            width: "100%",
          }}
        >
          {slot.items.map((item) => (
            <li
              key={item.requestId}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>{item.filename}</span>
              <span>
                {item.bytes > 0 ? size(item.bytes) : "Awaiting status"}
              </span>
              <span role="status">{describe(item)}</span>
              {item.state === "declaring" || item.state === "uploading" ? (
                <button
                  type="button"
                  onClick={() => slot.onCancel(item.requestId)}
                  aria-label={`Cancel the upload of ${item.filename}`}
                >
                  Cancel
                </button>
              ) : null}
              {item.state === "unknown" || item.state === "removing" ? (
                <button
                  type="button"
                  onClick={() => slot.onCheck(item.requestId)}
                  aria-label={`Check the status of ${item.filename}`}
                >
                  Check status
                </button>
              ) : null}
              {item.state !== "removed" &&
              (item.uploadId || item.state === "refused") ? (
                <button
                  type="button"
                  onClick={() => slot.onRemove(item.requestId)}
                  aria-label={`Remove ${item.filename}`}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
