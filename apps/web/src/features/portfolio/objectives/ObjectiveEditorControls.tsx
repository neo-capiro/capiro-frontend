"use client";
import { ApiError } from "@/shared/portfolio/api/http";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ObjectiveEditorSession } from "./useObjectiveEditorSession";
import styles from "./objectives.module.css";

type Props = { session: ObjectiveEditorSession };

export function ObjectiveEditorFeedback({ session }: Props) {
  const { record, validation, mutation } = session;
  return (
    <>
      {record && record.status !== "draft" && (
        <small>Saving changes reopens this objective as a draft.</small>
      )}
      {validation && (
        <p className="danger" role="alert">
          {validation}
        </p>
      )}
      <QueryState error={mutation.error} />
      {mutation.error instanceof ApiError && mutation.error.status === 409 && (
        <p>
          Another change conflicts with this version. Close and reopen the
          objective to review the latest version before saving.
        </p>
      )}
      {mutation.isPending && <p role="status">Saving objective…</p>}
      {!mutation.canWrite && !mutation.isPending && (
        <p role="status">
          A current session with permission to change client records is
          required.
        </p>
      )}
    </>
  );
}

export function ObjectiveEditorActions({ session }: Props) {
  const disabled = session.mutation.isPending || !session.mutation.canWrite;
  return (
    <div className={`formActions ${styles.editorActions}`}>
      <button className="button" disabled={disabled}>
        Save draft
      </button>
      <button
        className="button"
        type="button"
        disabled={disabled}
        onClick={() => session.submit("request_review")}
      >
        Request review
      </button>
      <button
        className="button primary"
        type="button"
        disabled={disabled}
        onClick={() => session.submit("confirm_ready")}
      >
        Confirm ready
      </button>
    </div>
  );
}

export function ObjectiveReadyConfirmation({ session }: Props) {
  const { mutation, confirming, setConfirming } = session;
  return (
    <Dialog
      open={confirming}
      onOpenChange={(value) => {
        if (!mutation.isPending) setConfirming(value);
      }}
      title="Confirm objective ready"
      description={
        session.fields.strategyIntake
          ? "Objective type, goal statement and owner are complete."
          : "Outcome, government problem, ask type and minimum win are complete."
      }
    >
      <p>
        This confirms the objective is ready. Editing it later reopens the
        draft.
      </p>
      <div className="formActions">
        <button
          className="button"
          disabled={mutation.isPending}
          onClick={() => setConfirming(false)}
        >
          Back
        </button>
        <button
          className="button primary"
          disabled={mutation.isPending || !mutation.canWrite}
          onClick={() => {
            setConfirming(false);
            mutation.mutate("confirm_ready");
          }}
        >
          Confirm ready
        </button>
      </div>
    </Dialog>
  );
}
