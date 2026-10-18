"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import {
  QuickLogUndo,
  quickLogInputSchema,
  useQuickLog,
} from "./quick-log/public";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import meetingEntryStyles from "./quick-log/meeting-entry.module.css";
import { followUpInputSchema } from "./quick-log/command-contracts";
import { useFollowUpCommand } from "./quick-log/useFollowUpCommand";
import { FollowUpFields } from "./quick-log/FollowUpFields";
import { FollowUpStatus } from "./quick-log/FollowUpStatus";
import styles from "./quick-log/quick-log-dialog.module.css";
export function QuickLog({
  clientId,
  clientName,
  open,
  onOpenChange,
  onChangeClient,
  personId,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeClient?: () => void;
  personId?: string;
}) {
  const router = useRouter();
  const meetingHint = useId();
  const [validation, setValidation] = useState("");
  const [kind, setKind] = useState("note");
  const [when, setWhen] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [followUpRequested, setFollowUpRequested] = useState(false);
  const close = () => {
    setKind("note");
    setWhen("");
    setDueDate("");
    setValidation("");
    setFollowUpRequested(false);
    onOpenChange(false);
  };
  const command = useFollowUpCommand(clientId, open);
  const combinedUnavailable =
    kind === "commitment" || Boolean(when) || Boolean(dueDate);
  const withFollowUp =
    Boolean(command.pending) || (followUpRequested && !combinedUnavailable);
  const { mutation, receipt, clearReceipt, canCreate, uncertain } = useQuickLog(
    clientId,
    open,
    close,
  );
  const canOpenMeeting =
    open && canCreate && !mutation.isPending && !uncertain && !command.pending;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending && !command.busy) {
            if (value) onOpenChange(true);
            else close();
          }
        }}
        title="Quick log"
        description={`Record activity for ${clientName}.`}
        className={styles.dialog}
        headerActions={
          <span className={styles.info} aria-hidden="true">
            i
          </span>
        }
      >
        <div className={styles.destination}>
          <span className="eyebrow">Log to</span>
          <span className={styles.destinationPill}>Client</span>
        </div>
        <div className={styles.clientField}>
          <span>Client</span>
          <div className={styles.clientValue}>
            <output>{clientName}</output>
            {onChangeClient && (
              <button
                type="button"
                disabled={
                  mutation.isPending ||
                  command.busy ||
                  Boolean(command.pending) ||
                  uncertain
                }
                onClick={onChangeClient}
              >
                Change client
              </button>
            )}
          </div>
        </div>
        {command.checking ? (
          <p role="status">Checking saved follow-up recovery…</p>
        ) : command.blocked ? (
          <div role="alert">
            <p>{command.recoveryError}</p>
            <button
              type="button"
              className="button"
              onClick={command.retryRecovery}
            >
              Retry saved-command recovery
            </button>
          </div>
        ) : (
          <form
            key={command.pending?.input.requestId ?? "new-activity"}
            className={`${styles.form} stack`}
            onSubmit={(event) => {
              event.preventDefault();
              if (command.pending || command.checking || command.blocked)
                return;
              const form = new FormData(event.currentTarget);
              const whenValue = String(form.get("occurredAt") ?? "");
              const dueDate = String(form.get("dueDate") ?? "");
              const occurredAt = whenValue ? new Date(whenValue) : null;
              const dueAt = dueDate ? new Date(`${dueDate}T23:59:59`) : null;
              if (
                (occurredAt && !Number.isFinite(occurredAt.getTime())) ||
                (dueAt && !Number.isFinite(dueAt.getTime()))
              ) {
                setValidation("Enter a valid activity date and due date.");
                return;
              }
              const input = quickLogInputSchema.safeParse({
                kind: form.get("kind"),
                title: String(form.get("title")).trim(),
                body: String(form.get("body")).trim(),
                ...(personId ? { personId } : {}),
                ...(occurredAt ? { occurredAt: occurredAt.toISOString() } : {}),
                ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
              });
              if (!input.success) {
                setValidation(
                  input.error.issues[0]?.message ?? "Review this activity.",
                );
                return;
              }
              setValidation("");
              if (withFollowUp) {
                if (
                  input.data.kind === "commitment" ||
                  input.data.occurredAt ||
                  input.data.dueAt
                ) {
                  setValidation(
                    "The combined follow-up command cannot save commitments or custom activity dates. Save the activity without a follow-up, then create a Planner task separately.",
                  );
                  return;
                }
                const dueOn = String(form.get("followUpDate") ?? "");
                const dueTime = String(form.get("followUpTime") ?? "");
                const timeZone = String(form.get("followUpZone") ?? "").trim();
                const followUp = followUpInputSchema.safeParse({
                  assigneeUserId: form.get("followUpAssignee"),
                  ...(dueOn ? { dueOn } : {}),
                  ...(dueTime ? { dueTime } : {}),
                  ...(timeZone ? { timeZone } : {}),
                });
                if (!followUp.success) {
                  setValidation(
                    followUp.error.issues[0]?.message ??
                      "Review the follow-up fields.",
                  );
                  return;
                }
                command.start(input.data, followUp.data);
                return;
              }
              mutation.mutate(input.data);
            }}
          >
            <label className={styles.kindField}>
              What kind of log
              <select
                name="kind"
                aria-label="Activity type"
                disabled={Boolean(command.pending)}
                value={command.pending?.input.activity.kind ?? kind}
                onChange={(event) => {
                  const nextKind = event.target.value;
                  setKind(nextKind);
                  if (nextKind !== "commitment" && nextKind !== "request")
                    setDueDate("");
                  if (nextKind === "commitment") setFollowUpRequested(false);
                }}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Logged email</option>
                <option value="decision">Decision</option>
                <option value="request">Request</option>
                <option value="commitment">Commitment</option>
              </select>
            </label>
            <small className={styles.filingHint}>
              Files to: {kind === "commitment" ? "Commitments and " : ""}
              {clientName} timeline
            </small>
            <div className={meetingEntryStyles.entry}>
              <button
                type="button"
                className="button"
                aria-describedby={meetingHint}
                disabled={!canOpenMeeting}
                onClick={() => {
                  if (canOpenMeeting)
                    router.push(
                      `/portfolio/${encodeURIComponent(clientId)}/calendar?new=meeting`,
                    );
                }}
              >
                Record a meeting
              </button>
              <small id={meetingHint} className={meetingEntryStyles.hint}>
                Enter the required start and end times in Calendar.
              </small>
            </div>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={300}
                autoFocus
                disabled={Boolean(command.pending)}
                defaultValue={command.pending?.input.activity.title ?? ""}
              />
            </label>
            <TextareaField
              label="Details"
              name="body"
              maxLength={5000}
              disabled={Boolean(command.pending)}
              defaultValue={command.pending?.input.activity.body ?? ""}
            />
            <label>
              When
              <input
                type="datetime-local"
                name="occurredAt"
                aria-label="When"
                value={when}
                disabled={Boolean(command.pending)}
                onChange={(event) => {
                  setWhen(event.target.value);
                  if (event.target.value) setFollowUpRequested(false);
                }}
              />
              {!when && (
                <small>Leave blank to record the time when saved.</small>
              )}
            </label>
            {(kind === "commitment" || kind === "request") && (
              <label>
                Due (optional)
                <input
                  type="date"
                  name="dueDate"
                  aria-label="Due date"
                  value={dueDate}
                  disabled={Boolean(command.pending)}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    if (event.target.value) setFollowUpRequested(false);
                  }}
                />
                <small>Due at 11:59 p.m. in your local time.</small>
              </label>
            )}
            {kind === "email" && (
              <small>
                Logged email records history; it does not send a message.
              </small>
            )}
            <label className={`${styles.followUpToggle} row`}>
              <input
                type="checkbox"
                checked={withFollowUp}
                disabled={
                  mutation.isPending ||
                  uncertain ||
                  Boolean(command.pending) ||
                  combinedUnavailable
                }
                onChange={(event) => setFollowUpRequested(event.target.checked)}
              />
              Add generic follow-up
            </label>
            {combinedUnavailable && (
              <small>
                The combined follow-up command cannot save commitments or custom
                activity dates. Save this activity first, then create a Planner
                task separately.
              </small>
            )}
            {withFollowUp && (
              <div className={styles.followUpFields}>
                <FollowUpFields
                  disabled={Boolean(command.pending) || !canCreate}
                  initial={command.pending?.input.followUp}
                />
              </div>
            )}
            {validation && <p role="alert">{validation}</p>}
            <QueryState error={mutation.error} />
            <FollowUpStatus
              command={command}
              onDone={() => {
                close();
              }}
            />
            {uncertain && (
              <p role="alert">
                The save result is uncertain. Inspect the timeline before
                logging again. This request will not be resent and Undo is
                unavailable without a verified saved entry.
              </p>
            )}
            <div className={`${styles.formActions} formActions`}>
              <button
                type="button"
                className="button"
                disabled={mutation.isPending || command.busy}
                onClick={close}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={
                  !canCreate ||
                  mutation.isPending ||
                  Boolean(command.pending) ||
                  (withFollowUp && !command.ready)
                }
              >
                {mutation.isPending || command.busy
                  ? "Saving…"
                  : withFollowUp
                    ? "Save activity and follow-up"
                    : "Save activity"}
              </button>
            </div>
          </form>
        )}
      </Dialog>
      {receipt && (
        <QuickLogUndo
          key={receipt.id}
          receipt={receipt}
          clientName={clientName}
          onDismiss={clearReceipt}
        />
      )}
    </>
  );
}
