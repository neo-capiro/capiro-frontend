"use client";
import { useState, type ReactNode } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { useCapiroCapabilities } from "../../../../shared/capiro/capabilities";
import type { OutreachRecord } from "../../../../shared/capiro/operations/engagement";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
  Tabs,
  TextInput,
} from "../../../../shared/module-ui";
import {
  canonicalListRow,
  campaignSessionsQueryEnabled,
  categoryLabels,
  dateWindow,
  readableStatus,
  recordedCategory,
  recordTypeLabel,
  type CampaignCategory,
  type CampaignListRow,
} from "./outreach-list-model";
import styles from "./outreach-overview.module.css";

export function OutreachList({
  clientId,
  scopeControl,
  onCreate,
  onCampaign,
  onRecord,
  initialCategory = "drafts",
}: {
  clientId: string;
  scopeControl?: ReactNode;
  onCreate: () => void;
  onCampaign: (id: string) => void;
  onRecord: (record: OutreachRecord) => void;
  initialCategory?: CampaignCategory;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [cursor, setCursor] = useState<string>();
  const [recordCursor, setRecordCursor] = useState<string>();
  const [sessionOffset, setSessionOffset] = useState(0);
  const invalid = !!from && !!to && from > to;
  const scope = {
    ...(clientId ? { clientId } : {}),
    ...dateWindow(from, to),
    deleted: deleted ? ("true" as const) : ("false" as const),
  };
  const records = useCapiroQuery(
    "engagement.outreach.records",
    {
      query: {
        ...scope,
        limit: 100,
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(recordCursor ? { cursor: recordCursor } : {}),
      },
    },
    { enabled: !invalid },
  );
  const campaigns = useCapiroQuery(
    "engagement.campaigns",
    {
      query: {
        ...scope,
        limit: 100,
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(cursor ? { cursor } : {}),
      },
    },
    { enabled: !invalid && !deleted },
  );
  // Campaign sessions belong to a separate engagement application. The cohort states whether that
  // surface is reachable; this list never infers it from a 404, a URL or a route declaration.
  const campaignSessions = useCapiroCapabilities().campaignSessions;
  const sessionsSupported = campaignSessions !== "disabled";
  const sessionsEnabled = campaignSessionsQueryEnabled({
    capability: campaignSessions,
    clientId,
    deleted,
    invalid,
  });
  const sessions = useCapiroQuery(
    "engagement.sessions",
    {
      query: {
        limit: 100,
        offset: sessionOffset,
        ...(search.trim() ? { search: search.trim().slice(0, 160) } : {}),
      },
    },
    { enabled: sessionsEnabled },
  );
  const mismatch = records.data?.items.some(
    (row) =>
      clientId && row.client?.id.toLowerCase() !== clientId.toLowerCase(),
  );
  const campaignMismatch = campaigns.data?.items.some(
    (row) =>
      clientId && row.state.clientId?.toLowerCase() !== clientId.toLowerCase(),
  );
  const nativeRows = !campaignMismatch
    ? (campaigns.data?.items ?? [])
        .filter((row) => row.hasWorkflow)
        .map(canonicalListRow)
    : [];
  const nativeIds = new Set(nativeRows.map((row) => row.id.toLowerCase()));
  // Sessions are ancillary and only loaded for the unscoped, undeleted view. When they are
  // unavailable the canonical rows below are still authoritative for what they contain.
  const seenSessionIds = new Set<string>();
  const sessionRows: CampaignListRow[] = !sessionsEnabled
    ? []
    : (sessions.data ?? [])
        .filter((row) => {
          const id = row.id.toLowerCase();
          if (row.hasWorkflow || nativeIds.has(id) || seenSessionIds.has(id)) {
            return false;
          }
          seenSessionIds.add(id);
          return true;
        })
        .map((row) => ({
          id: row.id,
          title:
            row.topic && (!row.title || row.title === "New outreach campaign")
              ? row.topic
              : (row.title ?? row.topic ?? "Outreach campaign"),
          goal: row.goal,
          workflow: row.status,
          targets: row.targetCount,
          recordedSend: row.recordStatus,
          category: recordedCategory(row.recordStatus),
          sentAt: row.sentAt,
        }));
  const allCampaigns = [...nativeRows, ...sessionRows];
  const visibleRecords = !mismatch
    ? (records.data?.items ?? []).filter(
        (row) =>
          deleted ||
          (!row.hasWorkflow &&
            row.type !== "outreach_v3" &&
            !nativeIds.has(row.id.toLowerCase())),
      )
    : [];
  const canonicalLoading = records.loading || campaigns.loading;
  const canonicalError = invalid
    ? "The end date must be on or after the start date."
    : mismatch || campaignMismatch
      ? "The returned outreach does not match this client scope."
      : (records.error ?? campaigns.error);
  // The ancillary sessions read reports separately so its failure cannot hide healthy canonical
  // records and campaigns. It never becomes a fatal list error.
  const sessionsLoading = sessionsEnabled && sessions.loading;
  const sessionsFailure = sessionsEnabled ? sessions.error : undefined;
  const sessionsUnavailable = sessionsLoading || !!sessionsFailure;
  const more =
    !!campaigns.data?.nextCursor || (sessions.data?.length ?? 0) === 100;
  const reload = () => {
    records.reload();
    campaigns.reload();
    sessions.reload();
  };
  const clear = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setDeleted(false);
    setCursor(undefined);
    setRecordCursor(undefined);
    setSessionOffset(0);
  };
  return (
    <section className={styles.screen} aria-label="Outreach">
      <PageHeader
        title="Outreach"
        description="Plan campaigns and review recorded outreach across your permitted clients."
        actions={
          <ActionButton primary onClick={onCreate}>
            + New outreach
          </ActionButton>
        }
      />
      <Tabs
        label="Campaign categories"
        value={category}
        onChange={(value) => setCategory(value as CampaignCategory)}
        items={(Object.keys(categoryLabels) as CampaignCategory[]).map(
          (id) => ({
            id,
            label: `${categoryLabels[id]} · ${allCampaigns.filter((row) => row.category === id).length}${more ? "+" : ""}`,
          }),
        )}
      />
      <div className={styles.filters}>
        <TextInput
          type="search"
          aria-label="Search outreach"
          placeholder="Search outreach records"
          value={search}
          maxLength={160}
          onChange={(event) => {
            setSearch(event.target.value);
            setCursor(undefined);
            setRecordCursor(undefined);
            setSessionOffset(0);
          }}
        />
        {scopeControl}
        <label className={styles.dateFilter}>
          <span>From · {from || "Any date"}</span>
          <input
            type="date"
            aria-label="From"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setCursor(undefined);
              setRecordCursor(undefined);
            }}
          />
        </label>
        <label className={styles.dateFilter}>
          <span>To · {to || "Any date"}</span>
          <input
            type="date"
            aria-label="To"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setCursor(undefined);
              setRecordCursor(undefined);
            }}
          />
        </label>
        <label className={styles.deleted}>
          <input
            type="checkbox"
            aria-label="Deleted only"
            checked={deleted}
            onChange={(event) => {
              setDeleted(event.target.checked);
              setCursor(undefined);
              setRecordCursor(undefined);
            }}
          />
          Deleted only
        </label>
      </div>
      <StatusPanel
        loading={canonicalLoading}
        error={canonicalError}
        onRetry={reload}
      />
      {!canonicalLoading && !canonicalError && (
        <>
          {!sessionsSupported && (
            <div className={styles.card} role="status">
              <h2>Campaign sessions are not available</h2>
              <p className={styles.hint}>
                This workspace is not configured for campaign sessions, so no
                session-only campaigns are shown here. Saved outreach records
                and canonical campaigns are complete for your filters; counts
                and results below exclude session-only campaigns.
              </p>
            </div>
          )}
          {sessionsSupported && sessionsUnavailable && (
            <div className={styles.card} role="status" aria-live="polite">
              <h2>
                Campaign sessions are {sessionsLoading ? "loading" : "unavailable"}
              </h2>
              <p className={styles.hint}>
                Saved outreach records and canonical campaigns shown here are
                current, but session-only campaigns may be missing. Counts and
                results are partial until campaign sessions load.
              </p>
              {sessionsFailure && (
                <ActionButton onClick={() => sessions.reload()}>
                  Retry campaign sessions
                </ActionButton>
              )}
            </div>
          )}
          {!deleted && (
            <section
              className={styles.card}
              aria-labelledby="campaign-list-heading"
            >
              <h2 id="campaign-list-heading">{categoryLabels[category]}</h2>
              <CampaignRows
                rows={allCampaigns.filter((row) => row.category === category)}
                onOpen={onCampaign}
              />
              {sessionsSupported &&
                !sessionsUnavailable &&
                !allCampaigns.some((row) => row.category === category) && (
                <div className={styles.empty}>
                  <h3>
                    {search
                      ? "No matching campaigns"
                      : `No ${categoryLabels[category].toLowerCase()} yet`}
                  </h3>
                  <p>
                    {search
                      ? "Try another search or clear your filters."
                      : "Start a new outreach draft to plan your next campaign."}
                  </p>
                  <ActionButton
                    onClick={search || from || to ? clear : onCreate}
                  >
                    {search || from || to ? "Clear filters" : "+ New outreach"}
                  </ActionButton>
                </div>
              )}
              <p className={styles.hint}>
                Campaign workflow state is separate from recorded sending. A
                saved or completed campaign does not prove mail was sent.
              </p>
              {(more || cursor || sessionOffset > 0) && (
                <div className={styles.actions}>
                  {(cursor || sessionOffset > 0) && (
                    <ActionButton
                      onClick={() => {
                        setCursor(undefined);
                        setSessionOffset(0);
                      }}
                    >
                      First page
                    </ActionButton>
                  )}
                  {campaigns.data?.nextCursor && (
                    <ActionButton
                      onClick={() =>
                        setCursor(campaigns.data?.nextCursor ?? undefined)
                      }
                    >
                      Next campaigns
                    </ActionButton>
                  )}
                  {(sessions.data?.length ?? 0) === 100 && (
                    <ActionButton
                      onClick={() => setSessionOffset((value) => value + 100)}
                    >
                      Next campaign sessions
                    </ActionButton>
                  )}
                  <span className={styles.hint}>
                    Counts show the loaded campaigns. More campaigns are
                    available.
                  </span>
                </div>
              )}
            </section>
          )}
          <section
            className={styles.card}
            aria-labelledby="outreach-records-heading"
          >
            <h2 id="outreach-records-heading">
              {deleted ? "Deleted outreach" : "Saved outreach records"}
            </h2>
            <div className={styles.records}>
              {visibleRecords.map((record) => (
                <div className={styles.record} key={record.id}>
                  <p>
                    {record.title} · {recordTypeLabel(record.type)} ·{" "}
                    {readableStatus(
                      record.status === "draft" ? "Draft" : record.status,
                    )}{" "}
                    · {record.client?.name ?? "My firm"}
                  </p>
                  {!deleted && (
                    <ActionButton
                      onClick={() => onRecord(record)}
                      aria-label={`Open ${record.status === "draft" ? "draft" : "record"}: ${record.title}`}
                    >
                      Open {record.status === "draft" ? "draft" : "record"}
                    </ActionButton>
                  )}
                </div>
              ))}
            </div>
            {!visibleRecords.length && (
              <div className={styles.empty}>
                <h3>
                  {search || from || to
                    ? "No outreach records match your filters"
                    : deleted
                      ? "No deleted outreach records"
                      : "No outreach records yet"}
                </h3>
                <p>
                  {search || from || to
                    ? "Adjust your search or date range to see more outreach."
                    : "Your saved outreach drafts and records will appear here."}
                </p>
                {(search || from || to) && (
                  <ActionButton onClick={clear}>Clear filters</ActionButton>
                )}
              </div>
            )}
            <p className={styles.hint}>
              Search matches campaign and outreach titles. Client and date
              filters apply to saved records and campaigns. Global campaign
              sessions are listed separately.
            </p>
            {clientId && sessionsSupported && (
              <p className={styles.hint}>
                Campaign sessions are available under All permitted clients.
                Client-linked records remain shown here.
              </p>
            )}
            {(records.data?.nextCursor || recordCursor) && (
              <div className={styles.actions}>
                {recordCursor && (
                  <ActionButton onClick={() => setRecordCursor(undefined)}>
                    First records page
                  </ActionButton>
                )}
                {records.data?.nextCursor && (
                  <ActionButton
                    onClick={() =>
                      setRecordCursor(records.data?.nextCursor ?? undefined)
                    }
                  >
                    Next outreach records
                  </ActionButton>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
function CampaignRows({
  rows,
  onOpen,
}: {
  rows: CampaignListRow[];
  onOpen: (id: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <table className={styles.table}>
      <caption className="sr-only">Outreach campaigns</caption>
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Targets</th>
          <th>Recorded send</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <div className={styles.identity}>
                <button className={styles.name} onClick={() => onOpen(row.id)}>
                  {row.title}
                </button>
                <span className={styles.subtitle}>
                  {row.goal ? `${row.goal} · ` : ""}Workflow {row.workflow}
                </span>
              </div>
            </td>
            <td data-label="Targets">{row.targets}</td>
            <td data-label="Recorded send">
              <span
                className={`${styles.status} ${row.category === "attention" ? styles.attention : row.category === "sent" ? styles.sent : ""}`}
              >
                {row.category === "sent"
                  ? "Sent"
                  : readableStatus(row.recordedSend)}
              </span>
            </td>
            <td>
              <ActionButton onClick={() => onOpen(row.id)}>
                {row.category === "drafts"
                  ? "Open campaign"
                  : row.category === "sent"
                    ? "View sent record"
                    : "Review status"}
              </ActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
