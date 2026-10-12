"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function AttendanceDialog({
  hearingId,
  open,
  onClose,
  onSaved,
  sourceUrl,
}: {
  hearingId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sourceUrl?: string | null;
}) {
  const route = useLegiWatchRoute(),
    assessment = useCapiroQuery(
      "legiwatch.attendance",
      { params: { id: hearingId } },
      { enabled: open },
    );
  const request = useCapiroMutation("legiwatch.attendance.request"),
    cancel = useCapiroMutation("legiwatch.attendance.cancel");
  const join = useCapiroMutation("legiwatch.browserJoin"),
    create = useCapiroMutation("legiwatch.session.create");
  const [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false);
  const busy =
    request.pending || cancel.pending || join.pending || create.pending;
  const schedule = async () => {
    setError("");
    try {
      await request.run({
        params: { id: hearingId },
        body: { mode: "automatic", consentAcknowledged: consent },
      });
      assessment.reload();
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Attendance could not be scheduled.",
      );
    }
  };
  const browser = async () => {
    setError("");
    try {
      const plan = await join.run({ params: { id: hearingId } });
      if (plan.mode === "BLOCKED") {
        setError(plan.message);
        return;
      }
      if (plan.mode === "ATTACH_CANONICAL") {
        setError(
          `A shared ${plan.captureStatus.toLowerCase()} capture already exists. Open the live transcript to attach.`,
        );
        return;
      }
      if (plan.sourceType !== "hearing" && plan.sourceType !== "markup")
        throw new Error(
          "The source has not been verified for a public hearing room.",
        );
      const session = await create.run({
        body: {
          title: plan.title,
          sourceType: plan.sourceType,
          audioSource: "browser_mic",
          recordingPolicy: "transcript_only",
          sourceUrl: plan.sourceUrl,
          hearingId: plan.hearingId,
          committeeId: plan.committeeId,
          clientId: route.clientId || undefined,
        },
      });
      onClose();
      route.navigate({ sessionId: session.id });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Browser attendance could not be opened.",
      );
    }
  };
  const cancelAttendance = async () => {
    setError("");
    try {
      await cancel.run({ params: { id: hearingId } });
      setConfirmCancel(false);
      assessment.reload();
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Attendance could not be canceled.",
      );
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Attendance & capture"
      description="Availability is checked against the official source before a request is accepted."
      footer={<ActionButton onClick={onClose}>Done</ActionButton>}
    >
      <StatusPanel
        loading={assessment.loading}
        error={assessment.error}
        onRetry={assessment.reload}
      >
        {assessment.data && (
          <div className={styles.form}>
            <Badge
              tone={
                assessment.data.state === "FAILED"
                  ? "danger"
                  : assessment.data.scheduled
                    ? "success"
                    : "neutral"
              }
            >
              {assessment.data.state.replaceAll("_", " ")}
            </Badge>
            <p>{assessment.data.message}</p>
            <div className={styles.card}>
              <h2>Server attendance</h2>
              <p>
                Capiro attends the permitted public stream and retains the
                available transcript. Following a hearing does not schedule
                attendance.
              </p>
              {assessment.data.automaticAvailable &&
              assessment.data.canRequest ? (
                <>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    I confirm I am authorized to request capture of this public
                    proceeding.
                  </label>
                  <ActionButton
                    primary
                    disabled={
                      busy || (assessment.data.consentRequired && !consent)
                    }
                    onClick={schedule}
                  >
                    Schedule server attendance
                  </ActionButton>
                </>
              ) : assessment.data.scheduled ? (
                <>
                  {confirmCancel ? (
                    <>
                      <p>
                        Cancel your server attendance? Other users’ attendance
                        will remain active.
                      </p>
                      <div className={styles.actions}>
                        <ActionButton onClick={() => setConfirmCancel(false)}>
                          Keep attendance
                        </ActionButton>
                        <ActionButton
                          disabled={busy}
                          onClick={cancelAttendance}
                        >
                          Confirm cancellation
                        </ActionButton>
                      </div>
                    </>
                  ) : (
                    <ActionButton onClick={() => setConfirmCancel(true)}>
                      Cancel my server attendance
                    </ActionButton>
                  )}
                </>
              ) : (
                <p className={styles.description}>
                  Server attendance is unavailable for this source.
                </p>
              )}
            </div>
            <div className={styles.card}>
              <h2>Browser attendance</h2>
              <p>
                Open the official player, then explicitly share that tab’s audio
                in the hearing room.
              </p>
              <SourceLink href={sourceUrl}>
                Open official Watch / Replay
              </SourceLink>
              <ActionButton
                disabled={!assessment.data.browserAvailable || busy}
                onClick={browser}
              >
                {busy ? "Opening…" : "Open browser hearing room"}
              </ActionButton>
              {!assessment.data.browserAvailable && (
                <p className={styles.description}>
                  Browser capture is unavailable for this source. Official Watch
                  / Replay remains a separate source action.
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>
        )}
      </StatusPanel>
    </Modal>
  );
}
