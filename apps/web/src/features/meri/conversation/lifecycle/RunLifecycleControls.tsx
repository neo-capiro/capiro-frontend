import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { useRunLifecycle } from "./useRunLifecycle";
import type { TurnView } from "../conversation-view";
import styles from "../live.module.css";

/** Each click is explicit; checkpoint inspection grants no authority to resume or fork. */
export function RunLifecycleControls({
  lifecycle,
  turn,
  disabled,
}: {
  lifecycle: ReturnType<typeof useRunLifecycle>;
  turn: TurnView | null;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const checkpointId =
    lifecycle.receipt?.checkpointId ?? turn?.checkpointIds?.at(-1);
  const checkpoint = lifecycle.checkpoint;
  const held = disabled || lifecycle.busy || !lifecycle.available;
  const mutable = !held && !lifecycle.command && turn?.runState === "running";
  return (
    <details>
      <summary>Pause and recovery</summary>
      {lifecycle.error && (
        <p role="alert" className={styles.muted}>
          {lifecycle.error}
        </p>
      )}
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
            disabled={held}
            onClick={lifecycle.retry}
          >
            Retry same control
          </Button>
        </div>
      ) : (
        <>
          {turn?.runState === "running" && (
            <>
              <Button
                type="button"
                variant="outline"
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
              disabled={held}
              onClick={() => void lifecycle.inspect(checkpointId)}
            >
              Inspect latest checkpoint
            </Button>
          ) : (
            <p className={styles.muted}>
              No verified checkpoint is available yet.
            </p>
          )}
          {checkpoint && (
            <div className={styles.statusRow}>
              <p role="status">
                Checkpoint verified for this run. Meri will recheck access when
                continuing.
              </p>
              {turn?.runState === "paused" && (
                <Button
                  type="button"
                  variant="outline"
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
          )}
        </>
      )}
    </details>
  );
}
