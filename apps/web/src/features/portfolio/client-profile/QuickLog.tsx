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
  const { mutation, receipt, clearReceipt, canCreate, uncertain } = useQuickLog(
    clientId,
    open,
    () => onOpenChange(false),
  );
  const canOpenMeeting = open && canCreate && !mutation.isPending && !uncertain;
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) onOpenChange(value);
        }}
        title="Quick log"
        description={`Record activity for ${clientName}.`}
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
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
            mutation.mutate(input.data);
          }}
        >
          <label>
            Activity type
            <select name="kind">
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
            <input name="title" required maxLength={300} autoFocus />
          </label>
          <TextareaField label="Details" name="body" maxLength={5000} />
          <small>
            Logged email records history; it does not send a message.
          </small>
          {validation && <p role="alert">{validation}</p>}
          <QueryState error={mutation.error} />
          {uncertain && (
            <p role="alert">
              The save result is uncertain. Inspect the timeline before logging
              again. This request will not be resent and Undo is unavailable
              without a verified saved entry.
            </p>
          )}
          <div className="formActions">
            <button
              className="button primary"
              disabled={!canCreate || mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save activity"}
            </button>
          </div>
        </form>
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
