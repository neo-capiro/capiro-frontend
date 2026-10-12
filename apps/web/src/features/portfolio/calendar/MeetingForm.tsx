"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { useSaveMeeting } from "./mutations";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClients } from "@/features/portfolio/index/public";
import type { Meeting } from "./contracts";
import { dateTimeInstant, type CalendarZone } from "./range";
export function MeetingForm({
  open,
  onOpenChange,
  clientId,
  clientScopeAvailable = true,
  zone,
  meeting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientScopeAvailable?: boolean;
  zone: CalendarZone;
  meeting?: Meeting;
}) {
  const clients = useClients();
  const currentClients = clients.isSuccess ? clients.data : [];
  const [selectedClientId, setSelectedClientId] = useState(
    meeting?.client?.id ?? "",
  );
  const clientAvailable =
    clientScopeAvailable &&
    (Boolean(clientId) ||
      (clients.isSuccess &&
        !clients.isFetching &&
        (!selectedClientId ||
          currentClients.some((client) => client.id === selectedClientId))));
  const [validation, setValidation] = useState("");
  const mutation = useSaveMeeting(meeting?.id, () => onOpenChange(false));
  const local = (instant: string | undefined) =>
    instant
      ? Temporal.Instant.from(instant)
          .toZonedDateTimeISO(zone)
          .toPlainDateTime()
          .toString({ smallestUnit: "minute" })
      : "";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientAvailable) {
      setValidation("Refresh the client list before saving the meeting.");
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      const start = String(form.get("start"));
      const end = String(form.get("end"));
      const startsAt = dateTimeInstant(
        start.slice(0, 10),
        start.slice(11),
        zone,
      );
      const endsAt = dateTimeInstant(end.slice(0, 10), end.slice(11), zone);
      if (Temporal.Instant.compare(startsAt, endsAt) >= 0) {
        setValidation("The end must be after the start.");
        return;
      }
      const scope = clientId ?? selectedClientId;
      const location = String(form.get("location")).trim();
      setValidation("");
      mutation.mutate({
        subject: String(form.get("subject")).trim(),
        description: form.get("description"),
        startsAt,
        endsAt,
        ...(scope ? { clientId: scope } : {}),
        ...(location ? { location } : {}),
      });
    } catch {
      setValidation("Enter valid start and end date/times.");
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) onOpenChange(value);
      }}
      title={meeting ? "Edit meeting" : "New meeting"}
      description={`Meeting times use ${zone}. New meetings are private until explicitly shared.`}
    >
      <form className="stack" onSubmit={submit}>
        <label>
          Subject
          <input
            name="subject"
            required
            maxLength={240}
            autoFocus
            defaultValue={meeting?.subject}
          />
        </label>
        {!clientId && (
          <label>
            Client
            <select
              name="clientId"
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              disabled={!clients.isSuccess || clients.isFetching}
            >
              <option value="">No client</option>
              {currentClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
              {selectedClientId &&
                !currentClients.some(
                  (client) => client.id === selectedClientId,
                ) && (
                  <option value={selectedClientId}>
                    Selected client unavailable
                  </option>
                )}
            </select>
          </label>
        )}
        {(!clientId || !clientScopeAvailable) && (
          <QueryState
            pending={clients.isPending || clients.isFetching}
            error={clients.error}
            retry={() => void clients.refetch()}
          />
        )}
        {!clientScopeAvailable &&
          !clients.error &&
          !clients.isPending &&
          !clients.isFetching && (
            <p role="status">
              The selected client is unavailable. Return to Calendar and choose
              an available client.
            </p>
          )}
        <div className="formGrid">
          <label>
            Starts
            <input
              name="start"
              type="datetime-local"
              required
              defaultValue={local(meeting?.startsAt)}
            />
          </label>
          <label>
            Ends
            <input
              name="end"
              type="datetime-local"
              required
              defaultValue={local(meeting?.endsAt)}
            />
          </label>
        </div>
        <label>
          Location or join URL
          <input
            name="location"
            maxLength={240}
            defaultValue={meeting?.location ?? ""}
          />
        </label>
        <TextareaField
          label="Description"
          name="description"
          defaultValue={meeting?.description ?? ""}
        />
        {validation && (
          <p className="danger" role="alert">
            {validation}
          </p>
        )}
        <QueryState error={mutation.error} />
        <button
          className="button primary"
          disabled={mutation.isPending || !clientAvailable}
        >
          {mutation.isPending ? "Saving…" : "Save meeting"}
        </button>
      </form>
    </Dialog>
  );
}
