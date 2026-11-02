import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@capiro/ui/button";
import type { useRunLifecycle } from "./useRunLifecycle";
import type { TurnView } from "../conversation-view";
import ui from "../../ui/meri-ui.module.css";
import styles from "../live.module.css";

type Lifecycle = ReturnType<typeof useRunLifecycle>;
const inlineButton = `${ui.outline} ${styles.inlineButton}`;

function LifecycleError({ lifecycle }: { lifecycle: Lifecycle }) {
  return lifecycle.error ? (
    <p role="alert" className={`${styles.muted} ${styles.fullRow}`}>
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
    <div className={`${styles.statusRow} ${styles.fullRow}`}>
      <p role="status">Progress saved.</p>
      {resumable && (
        <Button
          type="button"
          className={inlineButton}
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
        className={inlineButton}
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

/** The steer control a typed guidance becomes: trimmed text only, never an empty control. */
export function guidanceCommand(text: string) {
  const guidance = text.trim();
  return guidance ? ({ intent: "steer", text: guidance } as const) : undefined;
}

/**
 * Controls for a run that is still going or paused, plus recovery of a pending control. They sit
 * in the current answer's heading beside its working status; a finished turn renders nothing here
 * and its checkpoint lives in the conversation details.
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
  const [steering, setSteering] = useState(false);
  const fieldId = useId();
  const checkpointId =
    lifecycle.receipt?.checkpointId ?? turn?.checkpointIds.at(-1);
  const held = disabled || lifecycle.busy || !lifecycle.available;
  const running = turn?.runState === "running";
  const paused = turn?.runState === "paused";
  const mutable = !held && !lifecycle.command && running;
  if (!lifecycle.command && !lifecycle.error && !running && !paused)
    return null;
  // Any other control closes the guidance field so it never reopens with stale text.
  const send: Lifecycle["send"] = (command) => {
    setSteering(false);
    setText("");
    return lifecycle.send(command);
  };
  const sendGuidance = (event: FormEvent) => {
    event.preventDefault();
    const command = guidanceCommand(text);
    if (!command || !mutable) return;
    send(command);
  };
  const guidanceKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    sendGuidance(event);
  };
  return (
    <>
      <LifecycleError lifecycle={lifecycle} />
      {lifecycle.command ? (
        <div className={`${styles.statusRow} ${styles.fullRow}`}>
          <p role="status">
            {lifecycle.receipt?.state === "APPLIED"
              ? "The control applied. Recover its destination."
              : "A control is awaiting confirmation."}
          </p>
          <Button
            type="button"
            className={inlineButton}
            disabled={held}
            onClick={lifecycle.retry}
          >
            Retry same control
          </Button>
        </div>
      ) : (
        <>
          {running && (
            <div className={styles.inlineRow} aria-label="Run controls">
              <Button
                type="button"
                className={inlineButton}
                disabled={!mutable}
                onClick={() => send({ intent: "pause" })}
              >
                Pause
              </Button>
              <Button
                type="button"
                className={inlineButton}
                disabled={!mutable}
                aria-expanded={steering}
                aria-controls={fieldId}
                onClick={() => setSteering((open) => !open)}
              >
                Steer
              </Button>
            </div>
          )}
          {running && steering && (
            <form
              id={fieldId}
              className={styles.steerField}
              onSubmit={sendGuidance}
            >
              <textarea
                className={styles.inlineInput}
                aria-label="Steer this run"
                placeholder="Guidance for the rest of this answer (Enter sends, Shift+Enter for a new line)"
                rows={1}
                value={text}
                disabled={!mutable}
                autoFocus
                onChange={(event) => setText(event.target.value)}
                onKeyDown={guidanceKey}
              />
              <Button
                type="submit"
                className={`${ui.primary} ${styles.inlineButton}`}
                disabled={!mutable || !guidanceCommand(text)}
              >
                Send guidance
              </Button>
            </form>
          )}
          {checkpointId ? (
            <button
              type="button"
              className={styles.textLink}
              disabled={held}
              onClick={() => void lifecycle.inspect(checkpointId)}
            >
              Inspect latest checkpoint
            </button>
          ) : (
            paused && (
              <p className={styles.muted}>
                No verified checkpoint is available yet.
              </p>
            )
          )}
          <VerifiedCheckpoint
            lifecycle={{ ...lifecycle, send }}
            held={held}
            resumable={paused}
          />
        </>
      )}
    </>
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
