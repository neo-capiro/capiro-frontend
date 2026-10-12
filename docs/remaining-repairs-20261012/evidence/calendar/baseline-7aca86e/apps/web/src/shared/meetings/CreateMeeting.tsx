"use client";
import { useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import { ActionButton, Field, Modal, TextArea, TextInput } from "../module-ui";
import styles from "./meetings.module.css";
type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientId?: string;
};
type Draft = {
  subject: string;
  description: string;
  location: string;
  start: string;
  end: string;
};
export function CreateMeeting(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title="New meeting"
      description="A meeting remains private until its approved artifacts are explicitly shared."
    >
      {props.open && <MeetingForm {...props} />}
    </Modal>
  );
}
function MeetingForm({ onClose, onCreated, clientId }: Props) {
  const api = useCapiro();
  const [draft, setDraft] = useState<Draft>({
      subject: "",
      description: "",
      location: "",
      start: "",
      end: "",
    }),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.request("engagement.meeting.create", {
        body: {
          subject: draft.subject,
          description: draft.description,
          location: draft.location,
          startsAt: new Date(draft.start).toISOString(),
          endsAt: new Date(draft.end).toISOString(),
          ...(clientId ? { clientId } : {}),
        },
      });
      onCreated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create meeting.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={(event) => void submit(event)}>
      <MeetingContent draft={draft} setDraft={setDraft} />
      <MeetingDates draft={draft} setDraft={setDraft} />
      {error && (
        <p className={`${styles.error} ${styles.wide}`} role="alert">
          {error}
        </p>
      )}
      <div className={`${styles.tools} ${styles.wide}`}>
        <ActionButton type="button" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create meeting"}
        </ActionButton>
      </div>
    </form>
  );
}
function MeetingContent({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
}) {
  return (
    <>
      <div className={styles.wide}>
        <Field label="Subject" htmlFor="new-meeting-subject">
          <TextInput
            id="new-meeting-subject"
            value={draft.subject}
            onChange={(event) =>
              setDraft({ ...draft, subject: event.target.value })
            }
            required
            maxLength={240}
          />
        </Field>
      </div>
      <div className={styles.wide}>
        <Field label="Location" htmlFor="new-meeting-location">
          <TextInput
            id="new-meeting-location"
            value={draft.location}
            onChange={(event) =>
              setDraft({ ...draft, location: event.target.value })
            }
            maxLength={240}
          />
        </Field>
      </div>
      <div className={styles.wide}>
        <Field label="Description" htmlFor="new-meeting-description">
          <TextArea
            id="new-meeting-description"
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </Field>
      </div>
    </>
  );
}
function MeetingDates({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
}) {
  return (
    <>
      <Field label="Starts (your local time)" htmlFor="new-meeting-start">
        <TextInput
          type="datetime-local"
          id="new-meeting-start"
          value={draft.start}
          onChange={(event) =>
            setDraft({ ...draft, start: event.target.value })
          }
          required
        />
      </Field>
      <Field label="Ends (your local time)" htmlFor="new-meeting-end">
        <TextInput
          type="datetime-local"
          id="new-meeting-end"
          min={draft.start}
          value={draft.end}
          onChange={(event) => setDraft({ ...draft, end: event.target.value })}
          required
        />
      </Field>
    </>
  );
}
