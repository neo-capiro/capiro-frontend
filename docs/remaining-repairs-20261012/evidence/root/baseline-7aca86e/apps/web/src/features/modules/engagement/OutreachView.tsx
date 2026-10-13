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
import styles from "./engagement.module.css";
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
  const sessions = useCampaignList();
  const draft = useCapiroQuery(
    "engagement.outreach.record",
    { params: { id: initialDraft ?? "" } },
    { enabled: !!initialDraft },
  );
  const query = useCapiroQuery("engagement.outreach", {
    query: { clientId: clientId || undefined, limit: 500 },
  });
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [selected, setSelected] = useState<OutreachRecord | "new" | null>(
      initialCreate ? "new" : null,
    );
  const [loadedDraft, setLoadedDraft] = useState(() => draft.data);
  if (loadedDraft !== draft.data) {
    setLoadedDraft(draft.data);
    if (draft.data) setSelected(draft.data);
  }
  const rows =
    query.data?.filter(
      (record) =>
        record.title.toLowerCase().includes(search.toLowerCase()) &&
        (!type || record.type === type),
    ) ?? [];
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
        <select
          className={styles.select}
          aria-label="Outreach type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">All types</option>
          {["campaign", "follow_up", "prep", "outbound_campaign"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <ActionButton
          primary
          className={styles.end}
          onClick={() => setSelected("new")}
        >
          + New outreach
        </ActionButton>
      </div>
      <CampaignList sessions={sessions} onSelect={setSession} />
      <OutreachRecords query={query} rows={rows} onSelect={setSelected} />
      <p className={styles.note}>
        Editing a draft does not send mail. Delivery requires an audited
        immutable draft and a reviewed send intent.
      </p>
      <Modal
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
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
}: {
  record?: OutreachRecord;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
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
    setBusy(true);
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
    }
  };
  return (
    <form className={styles.stack} onSubmit={(event) => void submit(event)}>
      <Field label="Title" htmlFor="outreach-title">
        <TextInput
          id="outreach-title"
          required
          maxLength={240}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {!record && <OutreachType value={type} onChange={setType} />}
      <Field label="Subject" htmlFor="outreach-subject">
        <TextInput
          id="outreach-subject"
          maxLength={300}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </Field>
      <Field label="Body" htmlFor="outreach-body">
        <TextArea
          id="outreach-body"
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
        <ActionButton type="button" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={busy}>
          Save draft
        </ActionButton>
      </div>
    </form>
  );
}

function useCampaignList() {
  return useCapiroQuery("engagement.sessions", { query: { limit: 100 } });
}
function CampaignList({
  sessions,
  onSelect: setSession,
}: {
  sessions: ReturnType<typeof useCampaignList>;
  onSelect: (id: string) => void;
}) {
  return (
    <StatusPanel
      loading={sessions.loading}
      error={sessions.error}
      onRetry={sessions.reload}
    >
      <DataTable
        rows={sessions.data ?? []}
        rowKey={(row) => row.id}
        caption="Outreach campaigns"
        columns={[
          {
            key: "campaign",
            label: "Campaign",
            render: (row) => (
              <button
                className={styles.name}
                onClick={() => setSession(row.id)}
              >
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
        ]}
      />
    </StatusPanel>
  );
}

function OutreachType({
  value,
  onChange,
}: {
  value: "campaign" | "follow_up" | "prep" | "outbound_campaign";
  onChange: (
    value: "campaign" | "follow_up" | "prep" | "outbound_campaign",
  ) => void;
}) {
  return (
    <Field label="Type" htmlFor="outreach-type">
      <select
        id="outreach-type"
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

function useOutreachRecords(clientId: string) {
  return useCapiroQuery("engagement.outreach", {
    query: { clientId: clientId || undefined, limit: 500 },
  });
}
function OutreachRecords({
  query,
  rows,
  onSelect: setSelected,
}: {
  query: ReturnType<typeof useOutreachRecords>;
  rows: OutreachRecord[];
  onSelect: (record: OutreachRecord) => void;
}) {
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        caption="Outreach records"
        columns={[
          {
            key: "title",
            label: "Outreach",
            render: (row) => (
              <button className={styles.name} onClick={() => setSelected(row)}>
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
        ]}
      />
    </StatusPanel>
  );
}
