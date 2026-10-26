"use client";
import { useState } from "react";
import type { NewsletterOutreachRecord } from "@capiro/shared/newsletter";
import type { SendingMailbox } from "../../../portfolio/relationships/email/mailboxes";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  TextInput,
} from "../../../../shared/module-ui";
import {
  newsletterPrepareInput,
  type NewsletterPrepareInput,
  type NewsletterDestinationInput,
} from "../../../../shared/capiro/operations/newsletter-delivery";
import { DestinationPicker } from "./DestinationPicker";
import {
  addDestination,
  copyAddresses,
  savedDestinations,
} from "./destinations";
import styles from "./newsletter-delivery.module.css";

export function NewsletterDestinations({
  record,
  mailboxes,
  disabled,
  onPrepare,
}: {
  record: NewsletterOutreachRecord;
  mailboxes: SendingMailbox[];
  disabled: boolean;
  onPrepare: (input: NewsletterPrepareInput, mailbox: SendingMailbox) => void;
}) {
  const [recipients, setRecipients] = useState(() => savedDestinations(record));
  const [senderId, setSenderId] = useState(record.senderConnectionId ?? "");
  const [subject, setSubject] = useState(record.subject);
  const [error, setError] = useState("");
  const [editingCopies, setEditingCopies] = useState<string[]>([]);
  const add = (value: NewsletterDestinationInput) => {
    if (recipients.length < 500)
      setRecipients((rows) => addDestination(rows, value));
  };
  function prepare() {
    const mailbox = mailboxes.find((row) => row.id === senderId);
    const parsed = newsletterPrepareInput.safeParse({
      recipients,
      targets: recipients,
      subject: subject.trim(),
      senderConnectionId: senderId,
    });
    if (!parsed.success || !mailbox || /[\r\n]/.test(subject)) {
      setError(
        "Select a connected mailbox, a subject, and between 1 and 500 valid destinations.",
      );
      return;
    }
    setError("");
    onPrepare(parsed.data, mailbox);
  }
  return (
    <DestinationPicker
      clientId={record.stage.config.clientId ?? undefined}
      selected={recipients}
      onAdd={add}
      disabled={disabled || recipients.length >= 500}
    >
      <section className={styles.card} aria-label="Selected destinations">
        <h2>Selected destinations</h2>
        <p>
          Each destination receives a separate copy. Repeated email addresses
          are combined.
        </p>
        <div className={styles.stack}>
          <span className={styles.label}>
            To · {recipients.length} selected
          </span>
          {recipients.length === 0 ? (
            <p>No destinations selected.</p>
          ) : (
            recipients.map((row) => (
              <SelectedDestination
                key={row.email}
                value={row}
                disabled={disabled}
                onRemove={() => {
                  setRecipients((rows) =>
                    rows.filter((item) => item.email !== row.email),
                  );
                  setEditingCopies((rows) =>
                    rows.filter((email) => email !== row.email),
                  );
                }}
                onEditing={(editing) =>
                  setEditingCopies((rows) =>
                    editing
                      ? [...new Set([...rows, row.email])]
                      : rows.filter((email) => email !== row.email),
                  )
                }
                onChange={(value) =>
                  setRecipients((rows) =>
                    rows.map((item) =>
                      item.email === row.email ? value : item,
                    ),
                  )
                }
              />
            ))
          )}
        </div>
        <Field
          label="Send from"
          htmlFor="newsletter-sender"
          description="The selected connected mailbox will be checked again before preparation and sending."
        >
          <SelectInput
            id="newsletter-sender"
            value={senderId}
            disabled={disabled || mailboxes.length === 0}
            onValueChange={setSenderId}
            placeholder="Select a connected mailbox"
            options={mailboxes.map((row) => ({
              value: row.id,
              label: `${row.displayName ? `${row.displayName} · ` : ""}${row.accountEmail}`,
            }))}
          />
        </Field>
        {mailboxes.length === 0 && (
          <p role="status">
            No connected sending mailbox is available. Connect a mailbox in
            Settings, then refresh this newsletter.
          </p>
        )}
        <Field
          label="Subject"
          htmlFor="newsletter-subject"
          description="Recipients, sender, or subject changes require a fresh prepared preview."
        >
          <TextInput
            id="newsletter-subject"
            value={subject}
            maxLength={300}
            disabled={disabled}
            onChange={(event) => setSubject(event.target.value)}
          />
        </Field>
        {error && <p role="alert">{error}</p>}
        {editingCopies.length > 0 && (
          <p>Apply or close the copy fields before preparing.</p>
        )}
        <div className={styles.actions}>
          <ActionButton
            primary
            disabled={
              disabled ||
              !mailboxes.length ||
              !recipients.length ||
              editingCopies.length > 0
            }
            onClick={prepare}
          >
            Prepare preview
          </ActionButton>
        </div>
      </section>
    </DestinationPicker>
  );
}
function SelectedDestination({
  value,
  disabled,
  onRemove,
  onChange,
  onEditing,
}: {
  value: NewsletterDestinationInput;
  disabled: boolean;
  onRemove: () => void;
  onChange: (value: NewsletterDestinationInput) => void;
  onEditing: (editing: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cc, setCc] = useState((value.cc ?? []).join(", "));
  const [bcc, setBcc] = useState((value.bcc ?? []).join(", "));
  const [error, setError] = useState("");
  const id = `copies-${encodeURIComponent(value.email)}`;
  function apply() {
    try {
      onChange({ ...value, cc: copyAddresses(cc), bcc: copyAddresses(bcc) });
      setOpen(false);
      onEditing(false);
      setError("");
    } catch {
      setError(
        "Use valid email addresses separated by commas, up to 50 per field.",
      );
    }
  }
  return (
    <div className={styles.recipient}>
      <div className={styles.destination}>
        <div>
          <strong>{value.name || value.email}</strong>
          <p>{value.email}</p>
          {value.cc?.length || value.bcc?.length ? (
            <p>
              Cc: {value.cc?.join(", ") || "None"} · Bcc:{" "}
              {value.bcc?.join(", ") || "None"}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <ActionButton
            disabled={disabled}
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              onEditing(!open);
              setCc((value.cc ?? []).join(", "));
              setBcc((value.bcc ?? []).join(", "));
              setError("");
            }}
          >
            Cc or Bcc
          </ActionButton>
          <ActionButton
            disabled={disabled}
            aria-label={`Remove ${value.email}`}
            onClick={onRemove}
          >
            Remove
          </ActionButton>
        </div>
      </div>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onEditing(next);
        }}
        title="Add Cc or Bcc"
        description={`Apply to ${value.email} only. Enter email addresses separated by commas.`}
        className={styles.copyDialog}
        footer={
          <>
            <ActionButton
              onClick={() => {
                setOpen(false);
                onEditing(false);
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton primary disabled={disabled} onClick={apply}>
              Apply to selected recipient
            </ActionButton>
          </>
        }
      >
        <div className={styles.card}>
          <h2>Adding as</h2>
          <Field label="Cc" htmlFor={`${id}-cc`}>
            <TextInput
              id={`${id}-cc`}
              value={cc}
              disabled={disabled}
              onChange={(event) => setCc(event.target.value)}
            />
          </Field>
          <Field label="Bcc" htmlFor={`${id}-bcc`}>
            <TextInput
              id={`${id}-bcc`}
              value={bcc}
              disabled={disabled}
              onChange={(event) => setBcc(event.target.value)}
            />
          </Field>
          {error && <p role="alert">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
