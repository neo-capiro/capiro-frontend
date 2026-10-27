"use client";
import { useState, type ReactNode } from "react";
import type { OutreachRecord } from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { NewsletterDestination } from "./NewsletterDestination";
import { newsletterRecordKind } from "./newsletter-route";
import { OutreachWorkflow } from "./outreach/OutreachWorkflow";
import styles from "./engagement.module.css";

function navigateDraft(id: string | null) {
  const url = new URL(window.location.href);
  for (const key of [
    "draft",
    "session",
    "create",
    "campaignRequest",
    "generationRequest",
    "sendRequest",
  ])
    url.searchParams.delete(key);
  if (id === "new") url.searchParams.set("create", "draft");
  else if (id) url.searchParams.set("draft", id);
  window.history.replaceState(window.history.state, "", url);
}
/** One workflow serves new records, historic drafts and V3 campaign links. */
export function OutreachView({
  clientId,
  initialDraft,
  initialSession,
  initialCreate = false,
  directoryContext = false,
  listHeader,
}: {
  clientId: string;
  initialDraft?: string;
  initialSession?: string;
  initialCreate?: boolean;
  directoryContext?: boolean;
  listHeader?: ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(
    initialDraft ?? initialSession ?? (initialCreate ? "new" : null),
  );
  const [newsletter, setNewsletter] = useState<OutreachRecord | null>(null);
  const [search, setSearch] = useState(""),
    [showDeleted, setShowDeleted] = useState(false);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const invalid = !!from && !!to && from > to;
  const query = useCapiroQuery(
    "engagement.outreach",
    {
      query: {
        ...(clientId ? { clientId } : {}),
        ...(from ? { from: new Date(from + "T00:00:00Z").toISOString() } : {}),
        ...(to
          ? {
              to: new Date(
                Date.parse(to + "T00:00:00Z") + 86400000,
              ).toISOString(),
            }
          : {}),
        deleted: showDeleted ? "true" : "false",
        limit: 500,
      },
    },
    { enabled: !selected && !invalid },
  );
  const sessions = useCapiroQuery(
    "engagement.sessions",
    { query: { limit: 100 } },
    { enabled: !selected && !clientId && !showDeleted },
  );
  const deepRecord = useCapiroQuery(
    "engagement.outreach.record",
    { params: { id: initialDraft ?? "" } },
    { enabled: !!initialDraft },
  );
  const back = () => {
    setSelected(null);
    setNewsletter(null);
    navigateDraft(null);
    query.reload();
    sessions.reload();
  };
  const open = (id: string) => {
    setSelected(id);
    navigateDraft(id);
  };
  if (
    selected === initialDraft &&
    deepRecord.data &&
    deepRecord.data.id.toLowerCase() === initialDraft?.toLowerCase() &&
    (!clientId ||
      deepRecord.data.client?.id.toLowerCase() === clientId.toLowerCase()) &&
    newsletterRecordKind(deepRecord.data) !== "ordinary"
  )
    return (
      <NewsletterDestination
        destination={
          newsletterRecordKind(deepRecord.data) === "candidate"
            ? { kind: "record", id: deepRecord.data.id }
            : { kind: "invalid" }
        }
        onBack={back}
      />
    );
  if (newsletter)
    return (
      <NewsletterDestination
        destination={
          newsletterRecordKind(newsletter) === "candidate"
            ? { kind: "record", id: newsletter.id }
            : { kind: "invalid" }
        }
        onBack={back}
      />
    );
  if (selected)
    return (
      <OutreachWorkflow
        key={selected}
        id={selected === "new" ? undefined : selected}
        clientId={clientId}
        onExit={back}
      />
    );
  const mismatch = query.data?.some(
    (row) =>
      clientId && row.client?.id.toLowerCase() !== clientId.toLowerCase(),
  );
  const records = !mismatch
    ? (query.data ?? []).filter((row) =>
        row.title.toLowerCase().includes(search.toLowerCase()),
      )
    : [];
  const existing = new Set(records.map((row) => row.id));
  const campaigns = (sessions.data ?? []).filter(
    (row) =>
      !existing.has(row.id) &&
      (row.title ?? row.topic ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className={styles.stack}>
      {listHeader}
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
          onClick={() => open("new")}
        >
          + New outreach
        </ActionButton>
      </div>
      {directoryContext && (
        <p>Choose a current directory recipient in the Recipients step.</p>
      )}
      <div className={styles.tools}>
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
      <StatusPanel
        loading={query.loading}
        error={
          invalid
            ? "The end date must be on or after the start date."
            : mismatch
              ? "The returned outreach does not match this client scope."
              : query.error
        }
        onRetry={query.reload}
      />
      <DataTable
        rows={records}
        rowKey={(row) => row.id}
        caption={showDeleted ? "Deleted outreach" : "Outreach records"}
        columns={[
          {
            key: "title",
            label: "Campaign",
            render: (row) =>
              showDeleted ? (
                <span>{row.title}</span>
              ) : (
                <button
                  className={styles.name}
                  onClick={() =>
                    newsletterRecordKind(row) === "ordinary"
                      ? open(row.id)
                      : setNewsletter(row)
                  }
                >
                  {row.title}
                </button>
              ),
          },
          {
            key: "client",
            label: "Client",
            render: (row) => row.client?.name ?? "My firm",
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <Badge>{row.status}</Badge>,
          },
          {
            key: "subject",
            label: "Subject",
            render: (row) => row.subject ?? "—",
          },
        ]}
      />
      {!clientId && !showDeleted && (
        <>
          <StatusPanel
            loading={sessions.loading}
            error={sessions.error}
            onRetry={sessions.reload}
          />
          {!!campaigns.length && (
            <DataTable
              rows={campaigns}
              rowKey={(row) => row.id}
              caption="Outreach campaigns"
              columns={[
                {
                  key: "title",
                  label: "Campaign",
                  render: (row) => (
                    <button
                      className={styles.name}
                      onClick={() => open(row.id)}
                    >
                      {row.title ?? row.topic ?? "Outreach campaign"}
                    </button>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <Badge>{row.recordStatus ?? row.status}</Badge>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
      {clientId && (
        <p className={styles.note}>
          Campaign sessions are available under All permitted clients.
          Client-linked records remain shown here.
        </p>
      )}
      <p className={styles.note}>
        Drafts are saved for later. Review the messages and destinations before
        sending.
      </p>
    </div>
  );
}
