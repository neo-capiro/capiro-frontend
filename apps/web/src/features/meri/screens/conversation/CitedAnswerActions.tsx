"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@capiro/ui/button";
import { ToastCard, ToastRegion } from "../../ui/ToastCard";
import portal from "../../ui/meri-dialog.module.css";
import styles from "../../cited-answer.module.css";

export type CopyStatus = "idle" | "copied" | "unavailable";
type SampleSource = { id: string; label: string; detail: string };

/** Answer actions (Copy, Sources; unavailable Retry/Fork/Helpful), the sample sources disclosure and the 13.23 Copy unavailable toast. */
export function CitedAnswerActions({
  copyStatus,
  onCopy,
  sources,
  sourcesOpen,
  selectedSource,
  onToggleSources,
}: {
  copyStatus: CopyStatus;
  onCopy: () => void;
  sources: readonly SampleSource[];
  sourcesOpen: boolean;
  selectedSource: string | null;
  onToggleSources: () => void;
}) {
  const [copyDismissed, setCopyDismissed] = useState(false);
  return (
    <>
      <div className={styles.messageActions} aria-label="Answer actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setCopyDismissed(false);
            onCopy();
          }}
        >
          {copyStatus === "copied" ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onToggleSources}
          aria-expanded={sourcesOpen}
          aria-controls="sample-sources"
        >
          Sources
        </Button>
        {["Retry", "Fork", "Helpful"].map((label) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            disabled
            title={`${label} requires a connected, authorized conversation`}
            className={styles.unavailable}
          >
            {label}
          </Button>
        ))}
      </div>
      {copyStatus === "unavailable" && !copyDismissed ? (
        <CopyUnavailableToast onDismiss={() => setCopyDismissed(true)} />
      ) : null}
      {sourcesOpen && (
        <section
          id="sample-sources"
          className={styles.sourcePanel}
          aria-label="Sample source references"
        >
          <h3>Sample sources</h3>
          <p>
            These references are design fixtures. No linked source record or
            current authorization is available.
          </p>
          <ul>
            {sources.map((source) => (
              <li
                key={source.id}
                className={
                  selectedSource === source.id
                    ? styles.selectedSource
                    : undefined
                }
              >
                <strong>{source.label}</strong>
                <span>{source.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** 13.23 Copy unavailable: a recoverable clipboard outcome, portalled out of the answer article's typography. */
function CopyUnavailableToast({ onDismiss }: { onDismiss: () => void }) {
  return createPortal(
    <div className={portal.portalSurface}>
      <ToastRegion>
        <ToastCard
          title="Copy unavailable"
          detail="Clipboard access was not available. Select the permitted text and copy it manually."
          onDismiss={onDismiss}
        />
      </ToastRegion>
    </div>,
    document.body,
  );
}
