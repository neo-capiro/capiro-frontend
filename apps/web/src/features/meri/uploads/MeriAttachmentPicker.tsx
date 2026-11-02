"use client";
import { useId, useRef } from "react";
import { PromptInputButton } from "@capiro/ui/prompt-input";
import { UPLOAD_MIME } from "../../../shared/meri-uploads/facade";
import { attachmentWording } from "../../../shared/meri-uploads/attachment-wording";
import { DesignIcon } from "../../../shared/shell/DesignIcon";
import styles from "../home.module.css";
import type { ComposerAttachments } from "./attachment-slot";
import { OfficeUploadButton } from "../office/OfficeUploadButton";

/** Only the canonical MIME values are offered; the receiver still decides admission. */
const accepted = Object.values(UPLOAD_MIME).join(",");
const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
    : `${Math.max(1, Math.round(bytes / 1024))} KiB`;

/** The composer's one attachment control: pick, show what the service said in plain words, check status, remove. */
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
          {slot.incoming.map((source, index) => (
            <li
              key={source.uploadId}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* The conversation's echo carries no file name; never show part of an upload id. */}
              <span>{`File ${index + 1}`}</span>
              <span role="status">Already in this conversation</span>
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
          {slot.items.map((item) => {
            const overdue = slot.overdue(item.requestId);
            const wording = attachmentWording(item, overdue);
            const settledOut =
              item.state === "removing" || item.state === "removed";
            return (
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
                <span
                  role="status"
                  aria-busy={wording.waiting}
                  title={wording.detail || undefined}
                >
                  {wording.label}
                </span>
                {slot.selectedTab &&
                  item.receipt?.originalBytesAvailable &&
                  item.receipt.scanStatus === "clean" &&
                  item.receipt.storageStatus === "stored" &&
                  !settledOut &&
                  /\.(docx|xlsx|pptx)$/iu.test(item.filename) && (
                    <OfficeUploadButton
                      key={`${JSON.stringify(slot.selectedTab.context)}:${item.receipt.uploadId}:${item.receipt.sha256}`}
                      context={slot.selectedTab.context}
                      filename={item.filename}
                      selection={{
                        uploadId: item.receipt.uploadId,
                        sha256: item.receipt.sha256,
                      }}
                    />
                  )}
                {item.state === "declaring" || item.state === "uploading" ? (
                  <button
                    type="button"
                    onClick={() => slot.onCancel(item.requestId)}
                    aria-label={`Cancel the upload of ${item.filename}`}
                  >
                    Cancel
                  </button>
                ) : null}
                {item.state === "unknown" ? (
                  <button
                    type="button"
                    onClick={() => slot.onCheck(item.requestId)}
                    aria-label={`Check the status of ${item.filename}`}
                  >
                    Check status
                  </button>
                ) : item.state === "stored" && overdue ? (
                  // Automatic re-reads stopped at the bounded wait; the person may still ask once more.
                  <button
                    type="button"
                    onClick={() => slot.onCheck(item.requestId)}
                    aria-label={`Check the status of ${item.filename} again`}
                  >
                    Check again
                  </button>
                ) : null}
                {settledOut ? (
                  <button
                    type="button"
                    onClick={() => slot.onDismiss(item.requestId)}
                    aria-label={`Dismiss ${item.filename}`}
                  >
                    Dismiss
                  </button>
                ) : item.uploadId || item.state === "refused" ? (
                  <button
                    type="button"
                    onClick={() => slot.onRemove(item.requestId)}
                    aria-label={`Remove ${item.filename}`}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
