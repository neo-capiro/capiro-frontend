"use client";
import Link from "next/link";
import { useCallback, useId, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@capiro/ui/select";
import type {
  RunIndexListRequest,
  RunIndexSummary,
  RunIndexListResponse,
} from "@capiro/meri-contracts/conversation-history";
import type { RunsClient } from "../../../shared/meri-runs/client";
import { scopedHref } from "../../../shared/session/client-route";
import { useCurrentRead } from "../conversation/evidence/useCurrentRead";
import { DataTable, type DataColumn } from "../ui/DataTable";
import { StateMessage } from "../ui/StateMessage";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import {
  RunRecord,
  runRecordHref,
  runStatus,
  runTime,
  usageSummary,
} from "./RunRecord";
import ui from "../ui/meri-ui.module.css";
import styles from "./runs.module.css";

const statuses = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "terminal", label: "Finished" },
] as const;
type Props = {
  client: RunsClient;
  clientId: string | null;
  clientName: string;
  selection?: Pick<RunIndexSummary, "conversationId" | "runId"> | undefined;
};

export function RunsWorkspace(props: Props) {
  const scopeId = useId();
  const [scope, setScope] = useState<RunIndexListRequest["scope"]>(
    props.clientId
      ? { kind: "client", clientId: props.clientId }
      : { kind: "general" },
  );
  const [status, setStatus] = useState<RunIndexListRequest["status"]>("all");
  if (props.selection)
    return <RunRecord {...props} selection={props.selection} />;
  return (
    <>
      <div className={styles.filters}>
        <div className={styles.scope}>
          <label htmlFor={scopeId}>Run scope</label>
          <Select
            value={scope.kind}
            onValueChange={(value) =>
              setScope(
                value === "client" && props.clientId
                  ? { kind: "client", clientId: props.clientId }
                  : { kind: value === "all" ? "all" : "general" },
              )
            }
          >
            <SelectTrigger id={scopeId} className={styles.scopeTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={styles.scopeContent}>
              {props.clientId && (
                <SelectItem className={styles.scopeItem} value="client">
                  {props.clientName}
                </SelectItem>
              )}
              <SelectItem className={styles.scopeItem} value="general">
                General
              </SelectItem>
              <SelectItem className={styles.scopeItem} value="all">
                All my permitted scopes
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SegmentedTabs
          label="Run status"
          options={statuses}
          value={status}
          onChange={setStatus}
        />
      </div>
      <RunPages
        key={JSON.stringify([scope, status])}
        client={props.client}
        clientId={props.clientId}
        scope={scope}
        status={status}
      />
    </>
  );
}

function RunPages({
  client,
  clientId,
  scope,
  status,
}: Omit<Props, "clientName" | "selection"> &
  Pick<RunIndexListRequest, "scope" | "status">) {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors[cursors.length - 1] ?? null;
  const read = useCallback(
    (signal: AbortSignal) =>
      client.list({ scope, status, cursor, limit: 20 }, signal),
    [client, scope, status, cursor],
  );
  const result = useCurrentRead(JSON.stringify([scope, status, cursor]), read);
  return (
    <>
      <div className={ui.row}>
        <button
          type="button"
          className={`${ui.outline} ${styles.action}`}
          onClick={() => {
            setCursors([null]);
            result.reload();
          }}
        >
          Refresh runs
        </button>
        <span className={ui.muted}>
          Recorded status is not a worker heartbeat. Pages may change between
          reads.
        </span>
      </div>
      {result.loading ? (
        <p role="status">Checking recorded runs…</p>
      ) : result.value ? (
        <RunPage value={result.value} clientId={clientId} />
      ) : (
        <StateMessage title="Runs unavailable" status="Unavailable" announce>
          <p>
            Current runs could not be checked. This does not mean there are no
            runs. Refresh to check again.
          </p>
        </StateMessage>
      )}
      <nav className={ui.row} aria-label="Run pages">
        <button
          type="button"
          className={`${ui.outline} ${styles.action}`}
          disabled={result.loading || cursors.length === 1}
          onClick={() => setCursors((values) => values.slice(0, -1))}
        >
          Previous page
        </button>
        <span>Page {cursors.length}</span>
        <button
          type="button"
          className={`${ui.outline} ${styles.action}`}
          disabled={result.loading || !result.value?.nextCursor}
          onClick={() => {
            const next = result.value?.nextCursor;
            if (next) setCursors((values) => [...values, next]);
          }}
        >
          Next page
        </button>
      </nav>
    </>
  );
}

export function RunPage({
  value,
  clientId,
}: {
  value: RunIndexListResponse;
  clientId: string | null;
}) {
  const columns: DataColumn<RunIndexSummary & { id: string }>[] = [
    {
      key: "run",
      label: "Run",
      width: 30,
      render: (run) => (
        <Link className={styles.runLink} href={runRecordHref(run, clientId)}>
          Run started {runTime(run.createdAt)}
        </Link>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      width: 15,
      render: (run) =>
        run.clientIds.length
          ? `${run.clientIds.length} permitted client ${run.clientIds.length === 1 ? "scope" : "scopes"}`
          : "General",
    },
    {
      key: "state",
      label: "Recorded status",
      width: 15,
      render: (run) => runStatus(run.state),
    },
    {
      key: "time",
      label: "Status time",
      width: 20,
      render: (run) => runTime(run.statusAt),
    },
    {
      key: "usage",
      label: "SDK estimate · USD",
      width: 20,
      render: (run) => usageSummary(run.usage),
    },
  ];
  return (
    <section
      aria-label="Recorded runs"
      className={`${styles.stack} ${styles.list}`}
    >
      <p className={ui.muted}>
        Observed {runTime(value.observedAt)}.{" "}
        {value.nextCursor
          ? "More permitted runs are available."
          : "No further page in this observation."}
      </p>
      {value.runs.length ? (
        <DataTable
          caption="Recorded runs"
          columns={columns}
          rows={value.runs.map((run) => ({
            ...run,
            id: `${run.conversationId}/${run.runId}`,
          }))}
        />
      ) : (
        <StateMessage title="No matching runs returned" status="No results">
          <p>
            No permitted runs matched this scope and status at this observation.
          </p>
        </StateMessage>
      )}
      <p className={ui.muted}>
        SDK estimates are not provider-billed charges. Missing records are not
        zero usage.
      </p>
      <Link href={scopedHref("/meri/conversations", clientId ?? undefined)}>
        Open conversations
      </Link>
    </section>
  );
}
