"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ReviewMeeting } from "../review/contracts";
import { useSharing } from "./useSharing";
import type { ShareAction } from "./contracts";
import type { SharingTarget } from "./targets";
import styles from "./sharing.module.css";

export function MeetingSharing({
  meeting,
  onClose,
}: {
  meeting: ReviewMeeting;
  onClose: () => void;
}) {
  const state = useSharing(meeting);
  const [action, setAction] = useState<ShareAction>("share");
  const [selected, setSelected] = useState<SharingTarget[]>([]);
  const [confirm, setConfirm] = useState(false);
  const current =
    state.allowed &&
    state.query.isSuccess &&
    !state.query.isFetching &&
    !state.query.error;
  const blocked =
    state.attempt.status === "pending" || state.attempt.status === "uncertain";
  const targets = current && state.query.data ? state.query.data.targets : [];
  const chosen = selected;
  const eligible =
    chosen.length > 0 &&
    chosen.every(
      (row) => !(action === "share" ? row.shareReason : row.unshareReason),
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        confirm && action === "unshare"
          ? "Unshare artifacts?"
          : "Share artifacts with your organization?"
      }
      className={styles.dialog}
    >
      <div className="stack">
        <p>
          {meeting.client?.name ?? "No associated client"} · Choose saved
          meeting artifacts.
        </p>
        <p className="muted">
          Shared artifacts appear in this client&apos;s shared meeting feed for
          your organization. Only the selected artifacts change; your saved
          records are retained.
        </p>
        <div className="row" aria-label="Sharing action">
          {(["share", "unshare"] as const).map((value) => (
            <button
              className="button"
              key={value}
              aria-pressed={action === value}
              disabled={blocked}
              onClick={() => {
                setAction(value);
                setSelected([]);
                setConfirm(false);
              }}
            >
              {value === "share" ? "Share" : "Unshare"}
            </button>
          ))}
        </div>
        <QueryState
          pending={
            state.identity.isPending ||
            state.identity.isFetching ||
            (state.allowed && (state.query.isPending || state.query.isFetching))
          }
          error={state.identity.error ?? state.query.error}
          retry={() =>
            void (state.identity.error
              ? state.identity.refetch()
              : state.query.refetch())
          }
        />
        {!state.allowed && !state.identity.isPending && (
          <p role="alert">
            Sharing is unavailable for the current session or role.
          </p>
        )}
        {state.attempt.error && (
          <p role="alert">{state.attempt.error.message}</p>
        )}
        {current && (
          <fieldset disabled={blocked || confirm} className={styles.choices}>
            <legend>Saved artifacts</legend>
            {targets.map((row) => {
              const id = `${row.type}:${row.id}`;
              const reason =
                action === "share" ? row.shareReason : row.unshareReason;
              return (
                <label key={id} className={styles.choice}>
                  <input
                    type="checkbox"
                    checked={selected.some(
                      (value) => `${value.type}:${value.id}` === id,
                    )}
                    disabled={Boolean(reason)}
                    onChange={(event) =>
                      setSelected((previous) =>
                        event.target.checked
                          ? [...previous, row]
                          : previous.filter(
                              (value) => `${value.type}:${value.id}` !== id,
                            ),
                      )
                    }
                  />
                  <span>
                    {row.label}
                    <small>
                      {reason ?? (row.shared ? "Shared" : "Private")}
                    </small>
                  </span>
                </label>
              );
            })}
            {!targets.length && <p>No saved artifacts are available.</p>}
          </fieldset>
        )}
        {confirm && (
          <p role="status">
            {action === "share" ? "Share" : "Unshare"} {chosen.length} selected
            artifacts {action === "share" ? "with" : "from"}{" "}
            {meeting.client?.name ?? "this client"}?
          </p>
        )}
        <div className="row">
          <button
            className="button"
            onClick={() => (confirm ? setConfirm(false) : onClose())}
            disabled={state.attempt.status === "pending"}
          >
            {confirm ? "Back" : "Cancel"}
          </button>
          <button
            className="button primary"
            disabled={!current || blocked || !eligible}
            onClick={() =>
              confirm ? state.submit(action, chosen, onClose) : setConfirm(true)
            }
          >
            {state.attempt.status === "pending"
              ? "Saving…"
              : `${confirm ? "Confirm: " : ""}${action === "share" ? "Share" : "Unshare"} selected artifacts`}
          </button>
          <button
            className="button"
            disabled={
              !state.allowed ||
              state.query.isFetching ||
              state.attempt.status === "pending"
            }
            onClick={() => {
              setConfirm(false);
              setSelected([]);
              void state.query.refetch();
            }}
          >
            Refresh saved artifacts
          </button>
        </div>
      </div>
    </Dialog>
  );
}
