import type { ReactNode } from "react";
import type { AttemptRecord } from "../lib/attempt-journal";
import { Btn } from "./forms";

export function AttemptStatus({
  record,
  check,
}: {
  record: AttemptRecord | undefined;
  check?: () => void;
}) {
  if (!record || record.phase === "confirmed" || record.phase === "rejected")
    return null;
  return (
    <div
      role="status"
      style={{ margin: "12px 0", fontSize: 12.5, lineHeight: 1.5 }}
    >
      <b>
        {record.phase === "pending"
          ? "Waiting for confirmation"
          : "Submission outcome unknown"}
      </b>
      <p>
        {record.intent}.{" "}
        {record.detail ??
          "Keep this view open while the current response is checked."}
      </p>
      {record.phase === "unknown" && (
        <>
          {check && <Btn onClick={check}>Check current status</Btn>}
          <p>
            If current records do not resolve this submission, contact{" "}
            <a href="mailto:support@capiro.ai">support@capiro.ai</a> before
            repeating it.
          </p>
        </>
      )}
    </div>
  );
}

/** Native fields and preserved custom option/link controls freeze together. */
export function PendingFields({
  disabled,
  children,
}: {
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={disabled}
      aria-busy={disabled}
      onClickCapture={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDownCapture={(event) => {
        if (disabled && ["Enter", " "].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
    >
      {children}
    </fieldset>
  );
}
