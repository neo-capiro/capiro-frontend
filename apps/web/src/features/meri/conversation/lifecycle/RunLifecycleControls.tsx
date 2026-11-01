import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { useRunLifecycle } from "./useRunLifecycle";
import type { TurnView } from "../conversation-view";
import ui from "../../ui/meri-ui.module.css";
import styles from "../live.module.css";

type Lifecycle = ReturnType<typeof useRunLifecycle>;

function LifecycleError({ lifecycle }: { lifecycle: Lifecycle }) {
  return lifecycle.error ? (
    <p role="alert" className={styles.muted}>
      {lifecycle.error}
    </p>
  ) : null;
}

/** A verified checkpoint grants no authority on its own: continuing or forking is a separate click. */
function VerifiedCheckpoint({
  lifecycle,
  held,
  resumable,
}: {
  lifecycle: Lifecycle;
  held: boolean;
  resumable: boolean;
}) {
  const checkpoint = lifecycle.checkpoint;
  if (!checkpoint) return null;
  return (
    <div className={styles.statusRow}>
      <p role="status">
        Checkpoint verified for this run. Meri will recheck access when
        continuing.
      </p>
      {resumable && (
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={held}
          onClick={() =>
            lifecycle.send({
              intent: "resume",
              checkpointId: checkpoint.checkpointId,
              checkpointSha256: checkpoint.checkpointSha256,
            })
          }
        >
          Resume
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        disabled={held}
        onClick={() =>
          lifecycle.send({
            intent: "fork",
            checkpointId: checkpoint.checkpointId,
            checkpointSha256: checkpoint.checkpointSha256,
          })
        }
      >
        Fork into new chat
      </Button>
    </div>
  );
}

/**
 * Controls for a run that is still going or paused, plus recovery of a pending control. A
 * finished turn renders nothing here; its checkpoint lives in the conversation details.
 */
export function RunLifecycleControls({
  lifecycle,
  turn,
  disabled,
}: {
  lifecycle: Lifecycle;
  turn: TurnView | null;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const checkpointId =
    lifecycle.receipt?.checkpointId ?? turn?.checkpointIds.at(-1);
  const held = disabled || lifecycle.busy || !lifecycle.available;
  const running = turn?.runState === "running";
  const paused = turn?.runState === "paused";
  const mutable = !held && !lifecycle.command && running;
  if (!lifecycle.command && !lifecycle.error && !running && !paused)
    return null;
  const content = (
    <>
      <LifecycleError lifecycle={lifecycle} />
      {lifecycle.command ? (
        <div className={styles.statusRow}>
          <p role="status">
            {lifecycle.receipt?.state === "APPLIED"
              ? "The control applied. Recover its destination."
              : "A control is awaiting confirmation."}
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={held}
            onClick={lifecycle.retry}
          >
            Retry same control
          </Button>
        </div>
      ) : (
        <>
          {running && (
            <>
              <Button
                type="button"
                variant="outline"
                className={ui.outline}
                disabled={!mutable}
                onClick={() => lifecycle.send({ intent: "pause" })}
              >
                Pause
              </Button>
              <label>
                Steer this run
                <textarea
                  value={text}
                  disabled={!mutable}
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className={ui.outline}
                disabled={!mutable || !text.trim()}
                onClick={() =>
                  lifecycle.send({ intent: "steer", text: text.trim() })
                }
              >
                Send guidance
              </Button>
            </>
          )}
          {checkpointId ? (
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              disabled={held}
              onClick={() => void lifecycle.inspect(checkpointId)}
            >
              Inspect latest checkpoint
            </Button>
          ) : (
            paused && (
              <p className={styles.muted}>
                No verified checkpoint is available yet.
              </p>
            )
          )}
          <VerifiedCheckpoint
            lifecycle={lifecycle}
            held={held}
            resumable={paused}
          />
        </>
      )}
    </>
  );
  // A healthy running run keeps its controls folded; a pause, an error or a pending control stays open.
  return running && !lifecycle.command && !lifecycle.error ? (
    <details className={styles.runControls}>
      <summary>Pause or steer this run</summary>
      {content}
    </details>
  ) : (
    <section className={styles.runControls} aria-label="Run controls">
      {content}
    </section>
  );
}

/** A finished run's verified checkpoint: a quiet link to inspect it, then fork from it. Details only. */
export function CheckpointActions({
  lifecycle,
  checkpointId,
  disabled,
}: {
  lifecycle: Lifecycle;
  checkpointId: string;
  disabled: boolean;
}) {
  if (lifecycle.command) return null;
  const held = disabled || lifecycle.busy || !lifecycle.available;
  return (
    <section className={styles.runControls} aria-label="Checkpoint">
      <LifecycleError lifecycle={lifecycle} />
      <button
        type="button"
        className={styles.textLink}
        disabled={held}
        onClick={() => void lifecycle.inspect(checkpointId)}
      >
        Inspect latest checkpoint
      </button>
      <VerifiedCheckpoint lifecycle={lifecycle} held={held} resumable={false} />
    </section>
  );
}
