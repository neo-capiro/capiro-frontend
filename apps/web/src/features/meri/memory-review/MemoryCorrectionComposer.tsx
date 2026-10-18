"use client";

import { useState } from "react";
import { Notice } from "../ui/Notice";
import ui from "../ui/meri-ui.module.css";
import { useOwnerCorrection } from "./useOwnerCorrection";
import styles from "./owner-review.module.css";

/** A correction is created against one Core-selected controlling personal row. */
export function MemoryCorrectionComposer({ enabled }: { enabled: boolean }) {
  const {
    items,
    refresh,
    loadMore,
    propose,
    workingId,
    feedback,
    holdStatus,
    unknownIds,
  } = useOwnerCorrection(enabled);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const selected =
    items.state === "ready"
      ? items.items.find((item) => item.id === selectedId)
      : undefined;

  return (
    <section className={ui.page} aria-labelledby="memory-correction-heading">
      <div>
        <h2 id="memory-correction-heading">Correct a personal memory</h2>
        <p className={ui.muted}>
          Select the current Core memory, review its text, and submit a proposed
          correction. The current version stays in place while your proposal is
          reviewed.
        </p>
      </div>
      {!enabled ? (
        <Notice title="Correction creation unavailable">
          The governed memory connection is not enabled for this workspace.
        </Notice>
      ) : (
        <>
          {holdStatus === "unavailable" ? (
            <Notice tone="danger" title="Corrections paused">
              This browser cannot preserve an uncertain submission across
              reloads. Corrections are held until recovery storage is available.
            </Notice>
          ) : null}
          {unknownIds.size > 0 ? (
            <Notice tone="danger" title="Correction outcome needs verification">
              {unknownIds.size} correction{" "}
              {unknownIds.size === 1 ? "submission is" : "submissions are"} held
              in this browser after an uncertain result. A Core review receipt
              is needed before resubmitting, even if the source item no longer
              appears below.
            </Notice>
          ) : null}
          {feedback ? (
            <p role="status" className={styles.feedback}>
              {feedback}
            </p>
          ) : null}
          {items.state === "loading" ? (
            <p role="status">Checking current personal memories…</p>
          ) : items.state === "error" ? (
            <Notice tone="danger" title="Current memory unavailable">
              {items.message}
            </Notice>
          ) : (
            <>
              <div className={ui.row}>
                <p role="status" className={ui.muted}>
                  {items.items.length} current personal{" "}
                  {items.items.length === 1 ? "memory" : "memories"} loaded
                  {items.nextCursor ? "; more may exist." : "."}
                </p>
                <button
                  type="button"
                  className={ui.outline}
                  disabled={!!workingId || items.moreLoading}
                  onClick={() => {
                    setSelectedId(null);
                    setDraft("");
                    refresh();
                  }}
                >
                  Refresh current memory
                </button>
              </div>
              {items.items.length === 0 ? (
                <Notice title="No current personal memory returned">
                  Core returned no controlling personal memories in this page.
                </Notice>
              ) : (
                <div
                  className={styles.list}
                  role="group"
                  aria-label="Current personal memories"
                >
                  {items.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.memoryChoice}
                      aria-pressed={selectedId === item.id}
                      disabled={!!workingId}
                      onClick={() => {
                        setSelectedId(item.id);
                        setDraft(item.value);
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span className={ui.muted}>
                        {item.clientId
                          ? `Personal · client ${item.clientId}`
                          : "Personal · firm-wide"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {items.moreError ? (
                <p role="alert" className={styles.feedback}>
                  {items.moreError}
                </p>
              ) : null}
              {items.nextCursor ? (
                <button
                  type="button"
                  className={ui.outline}
                  disabled={items.moreLoading || !!workingId}
                  onClick={() => void loadMore()}
                >
                  {items.moreLoading
                    ? "Loading…"
                    : "Load more personal memories"}
                </button>
              ) : null}
              {selected ? (
                <form
                  className={styles.card}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void propose(selected, draft).then((outcome) => {
                      if (outcome === "confirmed") {
                        setSelectedId(null);
                        setDraft("");
                      }
                    });
                  }}
                >
                  <h3>Propose a correction to {selected.title}</h3>
                  <p className={ui.muted}>Current canonical text</p>
                  <p className={styles.value}>{selected.value}</p>
                  {unknownIds.has(selected.id) ? (
                    <p role="status" className={styles.versionNotice}>
                      A correction for this item may already have been
                      submitted. Its outcome must be verified in Core before
                      resubmission.
                    </p>
                  ) : null}
                  <label>
                    Corrected text
                    <textarea
                      className={styles.reason}
                      value={draft}
                      maxLength={8_000}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className={ui.primary}
                    disabled={
                      holdStatus !== "ready" ||
                      unknownIds.has(selected.id) ||
                      workingId !== null ||
                      !draft.trim() ||
                      draft.trim() === selected.value.trim()
                    }
                  >
                    {workingId === selected.id
                      ? "Submitting…"
                      : "Submit correction for review"}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
