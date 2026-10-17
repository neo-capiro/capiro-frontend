"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { OutreachRecord } from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  StatusPanel,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../shared/module-ui";
import { CampaignSession } from "./CampaignSession";
import { NewsletterDestination } from "./NewsletterDestination";
import { newsletterRecordKind } from "./newsletter-route";
import styles from "./engagement.module.css";

function defaultDateWindow() {
  const today = new Date();
  const from = new Date(today);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

function exclusiveEndDate(inclusiveDate: string) {
  const next = new Date(`${inclusiveDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export function OutreachView({
  clientId,
  initialDraft,
  initialSession,
  initialCreate = false,
  directoryContext = false,
}: {
  clientId: string;
  initialDraft?: string;
  initialSession?: string;
  initialCreate?: boolean;
  directoryContext?: boolean;
}) {
  const [session, setSession] = useState<string | null>(initialSession ?? null);
  const [previousSession, setPreviousSession] = useState(initialSession);
  if (previousSession !== initialSession) {
    setPreviousSession(initialSession);
    setSession(initialSession ?? null);
  }
  const draft = useCapiroQuery(
    "engagement.outreach.record",
    { params: { id: initialDraft ?? "" } },
    { enabled: !!initialDraft },
  );
  const [initialWindow] = useState(defaultDateWindow);
  const [search, setSearch] = useState(""),
    [from, setFrom] = useState(initialWindow.from),
    [to, setTo] = useState(initialWindow.to),
    [showDeleted, setShowDeleted] = useState(false),
    [selected, setSelected] = useState<OutreachRecord | "new" | null>(
      initialCreate ? "new" : null,
    );
  const sessions = useCampaignList(!clientId && !showDeleted && !session);
  const invalidDateWindow = Boolean(from && to && from > to);
  const query = useOutreachRecords(
    clientId,
    from,
    to,
    showDeleted,
    !invalidDateWindow,
  );
  const [loadedDraft, setLoadedDraft] = useState(() => draft.data);
  const [draftSaving, setDraftSaving] = useState(false);
  if (loadedDraft !== draft.data) {
    setLoadedDraft(draft.data);
    if (draft.data) setSelected(draft.data);
  }
  const matchesScope = (record: OutreachRecord) =>
    !clientId || record.client?.id === clientId;
  const listError = invalidDateWindow
    ? new Error("The end date must be on or after the start date.")
    : query.data?.some((record) => !matchesScope(record))
      ? new Error("The returned outreach does not match this client scope.")
      : query.error;
  const rows =
    (!listError ? query.data : undefined)?.filter((record) =>
      record.title.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  if (draft.error || draft.loading)
    return (
      <StatusPanel
        loading={draft.loading}
        error={draft.error}
        onRetry={draft.reload}
      />
    );
  if (
    initialDraft &&
    draft.data &&
    (draft.data.id !== initialDraft || !matchesScope(draft.data))
  )
    return (
      <StatusPanel error="The returned outreach does not match this link." />
    );
  if (
    selected &&
    typeof selected === "object" &&
    newsletterRecordKind(selected) !== "ordinary"
  )
    return (
      <NewsletterDestination
        onBack={initialDraft ? undefined : () => setSelected(null)}
        destination={
          newsletterRecordKind(selected) === "candidate"
            ? { kind: "record", id: selected.id }
            : { kind: "invalid" }
        }
      />
    );
  if (session)
    return (
      <CampaignSession sessionId={session} onBack={() => setSession(null)} />
    );
  return (
    <div className={styles.stack}>
      <div className={styles.tools}>
        <TextInput
          type="search"
          aria-label="Search outreach"
          placeholder="Search outreach…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ActionButton
          primary
          className={styles.end}
          onClick={() => setSelected("new")}
        >
          + New outreach
        </ActionButton>
      </div>
      <div className={styles.tools} aria-label="Outreach record filters">
        <Field label="From" htmlFor="outreach-from">
          <TextInput
            id="outreach-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="outreach-to">
          <TextInput
            id="outreach-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <label>
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(event) => setShowDeleted(event.target.checked)}
          />{" "}
          Show deleted
        </label>
      </div>
      {!showDeleted && !clientId && (
        <CampaignList sessions={sessions} onSelect={setSession} />
      )}
      {!showDeleted && clientId && (
        <p className={styles.note}>
          V3 campaign records are read-only here. Campaign sessions are
          available under All permitted clients; the session list cannot filter
          them to one client.
        </p>
      )}
      <OutreachRecords
        query={{ ...query, error: listError }}
        rows={rows}
        onSelect={setSelected}
        deletedOnly={showDeleted}
      />
      {showDeleted && (
        <p className={styles.note}>
          Showing deleted records only. Deleted drafts cannot be opened here.
        </p>
      )}
      <p className={styles.note}>
        Editing a draft does not send mail. Delivery requires an audited
        immutable draft and a reviewed send intent.
      </p>
      <Modal
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !draftSaving) setSelected(null);
        }}
        title={selected === "new" ? "New outreach" : "Outreach draft"}
        description={
          directoryContext
            ? "Created from a directory selection. Review the draft before saving."
            : undefined
        }
      >
        {selected && (
          <OutreachForm
            key={typeof selected === "object" ? selected.id : "new"}
            record={typeof selected === "object" ? selected : undefined}
            clientId={clientId}
            onClose={() => setSelected(null)}
            onSaved={query.reload}
            onBusyChange={setDraftSaving}
          />
        )}
      </Modal>
    </div>
  );
}
function OutreachForm({
  record,
  clientId,
  onClose,
  onSaved,
  onBusyChange,
}: {
  record?: OutreachRecord;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const api = useCapiro();
  const [title, setTitle] = useState(record?.title ?? ""),
    [subject, setSubject] = useState(record?.subject ?? ""),
    [body, setBody] = useState(record?.body ?? ""),
    [type, setType] = useState<
      "campaign" | "follow_up" | "prep" | "outbound_campaign"
    >("follow_up"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusyChange(true);
    setError(undefined);
    try {
      if (record)
        await api.request("engagement.outreach.update", {
          params: { id: record.id },
          body: { title, subject, body },
        });
      else
        await api.request("engagement.outreach.create", {
          body: {
            title,
            subject,
            body,
            type,
            ...(clientId ? { clientId } : {}),
          },
        });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save outreach.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  return (
    <form
      className={styles.stack}
      aria-busy={busy}
      onSubmit={(event) => void submit(event)}
    >
      <Field label="Title" htmlFor="outreach-title">
        <TextInput
          id="outreach-title"
          disabled={busy}
          required
          maxLength={240}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {!record && (
        <OutreachType value={type} onChange={setType} disabled={busy} />
      )}
      <Field label="Subject" htmlFor="outreach-subject">
        <TextInput
          id="outreach-subject"
          disabled={busy}
          maxLength={300}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </Field>
      <Field label="Body" htmlFor="outreach-body">
        <TextArea
          id="outreach-body"
          disabled={busy}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      {record && (
        <UnavailableAction reason="Sending needs the versioned draft review and send-intent workflow.">
          Send outreach
        </UnavailableAction>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <ActionButton type="button" onClick={onClose} disabled={busy}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          {busy ? "Saving draft…" : "Save draft"}
        </ActionButton>
      </div>
    </form>
  );
}

function useCampaignList(enabled: boolean) {
  return useCapiroQuery(
    "engagement.sessions",
    { query: { limit: 100 } },
    { enabled },
  );
}
function CampaignList({
  sessions,
  onSelect: setSession,
}: {
  sessions: ReturnType<typeof useCampaignList>;
  onSelect: (id: string) => void;
}) {
  const rows = sessions.data ?? [];
  const drafts = rows.filter(
    (row) =>
      row.recordStatus !== "sent" &&
      row.recordStatus !== "failed" &&
      !row.sentAt,
  );
  const sent = rows.filter(
    (row) =>
      row.recordStatus !== "failed" &&
      (row.recordStatus === "sent" || Boolean(row.sentAt)),
  );
  const needsAttention = rows.filter((row) => row.recordStatus === "failed");
  return (
    <StatusPanel
      loading={sessions.loading}
      error={sessions.error}
      onRetry={sessions.reload}
    >
      <section className={styles.stack} aria-label="Campaign drafts">
        <h2>Campaign drafts</h2>
        <CampaignTable
          rows={drafts}
          onSelect={setSession}
          caption="Outreach campaigns"
        />
      </section>
      {sent.length > 0 && (
        <section className={styles.stack} aria-label="Sent campaigns">
          <h2>Sent campaigns</h2>
          <CampaignTable
            rows={sent}
            onSelect={setSession}
            caption="Sent outreach campaigns"
          />
        </section>
      )}
      {needsAttention.length > 0 && (
        <section
          className={styles.stack}
          aria-label="Campaigns needing attention"
        >
          <h2>Needs attention</h2>
          <CampaignTable
            rows={needsAttention}
            onSelect={setSession}
            caption="Campaigns needing attention"
          />
        </section>
      )}
    </StatusPanel>
  );
}

type CampaignRow = NonNullable<
  ReturnType<typeof useCampaignList>["data"]
>[number];
function CampaignTable({
  rows,
  onSelect,
  caption,
}: {
  rows: CampaignRow[];
  onSelect: (id: string) => void;
  caption: string;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      caption={caption}
      columns={[
        {
          key: "campaign",
          label: "Campaign",
          render: (row) => (
            <button className={styles.name} onClick={() => onSelect(row.id)}>
              {row.topic ?? row.title ?? "New outreach campaign"}
            </button>
          ),
        },
        {
          key: "goal",
          label: "Goal",
          render: (row) => row.goal ?? "Not set",
        },
        {
          key: "targets",
          label: "Targets",
          render: (row) => row.targetCount,
        },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge>{row.recordStatus ?? row.status}</Badge>,
        },
        {
          key: "date",
          label: "Date",
          render: (row) => (row.sentAt ?? row.updatedAt).slice(0, 10),
        },
      ]}
    />
  );
}

function OutreachType({
  value,
  onChange,
  disabled,
}: {
  value: "campaign" | "follow_up" | "prep" | "outbound_campaign";
  onChange: (
    value: "campaign" | "follow_up" | "prep" | "outbound_campaign",
  ) => void;
  disabled: boolean;
}) {
  return (
    <Field label="Type" htmlFor="outreach-type">
      <select
        id="outreach-type"
        disabled={disabled}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as typeof value)}
      >
        {["campaign", "follow_up", "prep", "outbound_campaign"].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </Field>
  );
}

function useOutreachRecords(
  clientId: string,
  from: string,
  to: string,
  deletedOnly: boolean,
  enabled: boolean,
) {
  return useCapiroQuery(
    "engagement.outreach",
    {
      query: {
        clientId: clientId || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? exclusiveEndDate(to) : undefined,
        deleted: deletedOnly ? "true" : "false",
        limit: 500,
      },
    },
    { enabled },
  );
}
function OutreachRecords({
  query,
  rows,
  onSelect: setSelected,
  deletedOnly,
}: {
  query: ReturnType<typeof useOutreachRecords>;
  rows: OutreachRecord[];
  onSelect: (record: OutreachRecord) => void;
  deletedOnly: boolean;
}) {
  const drafts = rows.filter((row) => row.status === "draft");
  const sent = rows.filter((row) => row.status === "sent");
  const needsAttention = rows.filter(
    (row) => row.status !== "draft" && row.status !== "sent",
  );
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {deletedOnly ? (
        <section className={styles.stack} aria-label="Deleted outreach">
          <h2>Deleted outreach</h2>
          <OutreachTable
            rows={rows}
            caption="Outreach records"
            onSelect={setSelected}
            readOnly
          />
        </section>
      ) : (
        <>
          <section className={styles.stack} aria-label="Outreach drafts">
            <h2>Outreach record drafts</h2>
            <OutreachTable
              rows={drafts}
              caption="Outreach records"
              onSelect={setSelected}
            />
          </section>
          {sent.length > 0 && (
            <section className={styles.stack} aria-label="Sent outreach">
              <h2>Sent outreach records</h2>
              <OutreachTable
                rows={sent}
                caption="Sent outreach records"
                onSelect={setSelected}
                readOnly
              />
            </section>
          )}
          {needsAttention.length > 0 && (
            <section
              className={styles.stack}
              aria-label="Outreach needing attention"
            >
              <h2>Needs attention</h2>
              <OutreachTable
                rows={needsAttention}
                caption="Outreach needing attention"
                onSelect={setSelected}
                readOnly
              />
            </section>
          )}
        </>
      )}
    </StatusPanel>
  );
}

function OutreachTable({
  rows,
  caption,
  onSelect,
  readOnly = false,
}: {
  rows: OutreachRecord[];
  caption: string;
  onSelect: (record: OutreachRecord) => void;
  readOnly?: boolean;
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      caption={caption}
      columns={[
        {
          key: "title",
          label: "Outreach",
          render: (row) =>
            readOnly || row.type === "outreach_v3" ? (
              row.title
            ) : (
              <button className={styles.name} onClick={() => onSelect(row)}>
                {row.title}
              </button>
            ),
        },
        {
          key: "client",
          label: "Client",
          render: (row) => row.client?.name ?? "Unassigned",
        },
        {
          key: "type",
          label: "Type",
          render: (row) => row.type.replaceAll("_", " "),
        },
        {
          key: "recipients",
          label: "Recipients",
          render: (row) => row.recipients?.length ?? 0,
        },
        {
          key: "status",
          label: "Status",
          render: (row) => <Badge>{row.status.replaceAll("_", " ")}</Badge>,
        },
        {
          key: "date",
          label: "Created",
          render: (row) => row.createdAt?.slice(0, 10) ?? "Unknown",
        },
      ]}
    />
  );
}
