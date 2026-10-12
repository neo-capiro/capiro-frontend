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
export function QuickLog({
  clientId,
  clientName,
  open,
  onOpenChange,
  personId,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId?: string;
}) {
  const router = useRouter();
  const meetingHint = useId();
  const [validation, setValidation] = useState("");
  const [followUpRequested, setFollowUpRequested] = useState(false);
  const command = useFollowUpCommand(clientId, open);
  const withFollowUp = followUpRequested || Boolean(command.pending);
  const { mutation, receipt, clearReceipt, canCreate, uncertain } = useQuickLog(
    clientId,
    open,
    () => onOpenChange(false),
  );
  const canOpenMeeting =
    open && canCreate && !mutation.isPending && !uncertain && !command.pending;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending && !command.busy) onOpenChange(value);
        }}
        title="Quick log"
        description={`Record activity for ${clientName}.`}
      >
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
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (command.pending || command.checking || command.blocked)
                return;
              const form = new FormData(event.currentTarget);
              const input = quickLogInputSchema.safeParse({
                kind: form.get("kind"),
                title: String(form.get("title")).trim(),
                body: String(form.get("body")).trim(),
                ...(personId ? { personId } : {}),
              });
              if (!input.success) {
                setValidation(
                  input.error.issues[0]?.message ?? "Review this activity.",
                );
                return;
              }
              setValidation("");
              if (withFollowUp) {
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
            <label>
              Activity type
              <select
                name="kind"
                disabled={Boolean(command.pending)}
                defaultValue={command.pending?.input.activity.kind ?? "note"}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Logged email</option>
                <option value="decision">Decision</option>
                <option value="request">Request</option>
              </select>
            </label>
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
            <small>
              Logged email records history; it does not send a message.
            </small>
            <label className="row">
              <input
                type="checkbox"
                checked={withFollowUp}
                disabled={
                  mutation.isPending || uncertain || Boolean(command.pending)
                }
                onChange={(event) => setFollowUpRequested(event.target.checked)}
              />
              Add generic follow-up
            </label>
            {withFollowUp && (
              <FollowUpFields
                disabled={Boolean(command.pending) || !canCreate}
                initial={command.pending?.input.followUp}
              />
            )}
            {validation && <p role="alert">{validation}</p>}
            <QueryState error={mutation.error} />
            <FollowUpStatus
              command={command}
              onDone={() => {
                setFollowUpRequested(false);
                onOpenChange(false);
              }}
            />
            {uncertain && (
              <p role="alert">
                The save result is uncertain. Inspect the timeline before
                logging again. This request will not be resent and Undo is
                unavailable without a verified saved entry.
              </p>
            )}
            <div className="formActions">
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
