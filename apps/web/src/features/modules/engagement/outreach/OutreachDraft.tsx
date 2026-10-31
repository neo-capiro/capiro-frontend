"use client";
import { useRef, useState } from "react";
import type { OutreachRecord } from "../../../../shared/capiro/operations/engagement";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  PageHeader,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import { recordTypeLabel } from "./outreach-list-model";
import { CapiroApiError } from "../../../../shared/capiro/http";
import styles from "./outreach-overview.module.css";

export function OutreachDraft({
  record,
  clientId,
  onExit,
  onContinue,
  initialPending = false,
}: {
  record?: OutreachRecord;
  clientId: string;
  onExit: () => void;
  onContinue: (id: string) => void;
  initialPending?: boolean;
}) {
  const clients = useCapiroQuery("clients.list", {});
  const create = useCapiroMutation("engagement.outreach.create");
  const update = useCapiroMutation("engagement.outreach.update");
  const [saved, setSaved] = useState(record);
  const [title, setTitle] = useState(record?.title ?? "");
  const [type, setType] = useState<
    "campaign" | "follow_up" | "prep" | "outbound_campaign"
  >((record?.type as "follow_up") ?? "follow_up");
  const [client, setClient] = useState(record?.client?.id ?? clientId);
  const [subject, setSubject] = useState(record?.subject ?? "");
  const [body, setBody] = useState(record?.body ?? "");
  const [uncertain, setUncertain] = useState(initialPending);
  const [error, setError] = useState<string>();
  const active = useRef(false);
  const busy = create.pending || update.pending;
  const readOnly = !!saved && saved.status !== "draft";
  const disabled = busy || uncertain || readOnly;
  const dirty =
    !saved ||
    title !== saved.title ||
    subject !== (saved.subject ?? "") ||
    body !== (saved.body ?? "") ||
    client !== (saved.client?.id ?? "");
  const save = async () => {
    if (active.current || disabled || !title.trim() || !dirty) return;
    active.current = true;
    setError(undefined);
    const pendingUrl = new URL(window.location.href);
    pendingUrl.searchParams.set("outreachSave", "pending");
    window.history.replaceState(window.history.state, "", pendingUrl);
    try {
      const row = saved
        ? await update.run({
            params: { id: saved.id },
            body: {
              title: title.trim(),
              clientId: client || null,
              subject: subject || null,
              body: body || null,
            },
          })
        : await create.run({
            body: {
              title: title.trim(),
              type,
              ...(client ? { clientId: client } : {}),
              ...(subject ? { subject } : {}),
              ...(body ? { body } : {}),
            },
          });
      if (
        (saved && row.id !== saved.id) ||
        row.title !== title.trim() ||
        (row.client?.id ?? "") !== client ||
        (row.subject ?? "") !== subject ||
        (row.body ?? "") !== body
      )
        throw new Error(
          "The saved response differs from this draft. Check the record before making further changes.",
        );
      setTitle(row.title);
      setSaved(row);
      const url = new URL(window.location.href);
      url.searchParams.delete("outreachSave");
      url.searchParams.delete("create");
      url.searchParams.set("draft", row.id);
      url.searchParams.set("detail", "overview");
      window.history.replaceState(window.history.state, "", url);
    } catch (caught) {
      const rejected =
        caught instanceof CapiroApiError &&
        [400, 401, 403, 404, 409, 422, 429].includes(caught.status);
      setUncertain(!rejected);
      if (rejected) {
        const url = new URL(window.location.href);
        url.searchParams.delete("outreachSave");
        window.history.replaceState(window.history.state, "", url);
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "The save outcome could not be confirmed.",
      );
    } finally {
      active.current = false;
    }
  };
  return (
    <section className={styles.screen} aria-label="Outreach draft">
      <PageHeader
        title={saved ? "Outreach draft" : "New outreach"}
        description="Create a draft. Saving a draft never sends email."
      />
      <ActionButton className={styles.back} disabled={busy} onClick={onExit}>
        ← All outreach
      </ActionButton>
      <div className={`${styles.card} ${styles.form}`}>
        <Field label="Title" htmlFor="outreach-draft-title">
          <TextInput
            id="outreach-draft-title"
            maxLength={240}
            value={title}
            disabled={disabled}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="outreach-draft-type">
          <select
            id="outreach-draft-type"
            value={type}
            disabled={disabled || !!saved}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            {["follow_up", "campaign", "outbound_campaign", "prep"].map(
              (value) => (
                <option key={value} value={value}>
                  {recordTypeLabel(value)}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Client" htmlFor="outreach-draft-client">
          <select
            id="outreach-draft-client"
            value={client}
            disabled={
              disabled || !!clientId || clients.loading || !!clients.error
            }
            onChange={(event) => setClient(event.target.value)}
          >
            <option value="">My firm / no client</option>
            {client && !clients.data?.some((row) => row.id === client) && (
              <option value={client}>
                {saved?.client?.name ?? "Selected client"}
              </option>
            )}
            {clients.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <StatusPanel error={clients.error} onRetry={clients.reload} />
        <Field label="Subject" htmlFor="outreach-draft-subject">
          <TextInput
            id="outreach-draft-subject"
            maxLength={300}
            value={subject}
            disabled={disabled}
            onChange={(event) => setSubject(event.target.value)}
          />
        </Field>
        <Field label="Body" htmlFor="outreach-draft-body">
          <TextArea
            id="outreach-draft-body"
            rows={1}
            maxLength={40000}
            value={body}
            disabled={disabled}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {uncertain && (
          <p role="status">
            The save result needs confirmation. Return to all outreach and
            reopen the saved record before trying again.
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton disabled={busy} onClick={onExit}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={disabled || !title.trim() || !dirty}
            onClick={save}
          >
            Save draft
          </ActionButton>
          {saved && !uncertain && (
            <ActionButton
              disabled={busy || dirty}
              onClick={() => onContinue(saved.id)}
            >
              Open campaign
            </ActionButton>
          )}
        </div>
        <ActionButton disabled>Send outreach</ActionButton>
        <p className={styles.hint}>
          Sending requires an audited immutable draft and a reviewed send
          intent. Saving this draft does not send email.
        </p>
        {saved && !dirty && !uncertain && (
          <p role="status" className={styles.hint}>
            Draft saved.
          </p>
        )}
      </div>
    </section>
  );
}
