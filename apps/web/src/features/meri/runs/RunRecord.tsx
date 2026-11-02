"use client";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import type {
  RunIndexSummary,
  RunIndexDetailResponse,
} from "@capiro/meri-contracts/conversation-history";
import type { RunsClient } from "../../../shared/meri-runs/client";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { scopedHref } from "../../../shared/session/client-route";
import { useCurrentRead } from "../conversation/evidence/useCurrentRead";
import { RecordedUsageView } from "../conversation/evidence/RecordedUsageView";
import { StateMessage } from "../ui/StateMessage";
import ui from "../ui/meri-ui.module.css";
import styles from "./runs.module.css";
import { usageSummary } from "./usage-presentation";
export { usageSummary } from "./usage-presentation";

export const runTime = (value: string) =>
  new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }) + " UTC";
export const runStatus = (value: RunIndexSummary["state"]) =>
  value[0]!.toUpperCase() + value.slice(1).replaceAll("-", " ");
export function runRecordHref(
  run: Pick<RunIndexSummary, "conversationId" | "runId">,
  clientId: string | null,
) {
  return scopedHref(
    `/meri/runs?${new URLSearchParams({ conversationId: run.conversationId, runId: run.runId })}`,
    clientId ?? undefined,
  );
}

export function RunRecord({
  client,
  clientId,
  selection,
}: {
  client: RunsClient;
  clientId: string | null;
  selection: Pick<RunIndexSummary, "conversationId" | "runId">;
}) {
  const { conversationId, runId } = selection;
  const read = useCallback(
    (signal: AbortSignal) => client.detail(conversationId, runId, signal),
    [client, conversationId, runId],
  );
  const result = useCurrentRead(`${conversationId}/${runId}`, read);
  return (
    <>
      <div className={ui.row}>
        <Link
          className={`${ui.ghost} ${styles.action}`}
          href={scopedHref("/meri/runs", clientId ?? undefined)}
        >
          Back to runs
        </Link>
        <button
          type="button"
          className={`${ui.outline} ${styles.action}`}
          onClick={result.reload}
        >
          Refresh run
        </button>
      </div>
      {result.loading ? (
        <p role="status">Checking current run access and its record…</p>
      ) : result.value ? (
        <RunRecordDetails
          key={`${conversationId}/${runId}`}
          value={result.value}
          client={client}
          clientId={clientId}
        />
      ) : (
        <StateMessage title="Run unavailable" status="Unavailable" announce>
          <p>
            This run could not be read with current access. It may have been
            removed or access may have changed.
          </p>
        </StateMessage>
      )}
    </>
  );
}

export function RunRecordDetails({
  value,
  client,
  clientId,
}: {
  value: RunIndexDetailResponse;
  client: RunsClient;
  clientId: string | null;
}) {
  const run = value.run;
  const reads = useMemo(
    () => ({
      usage: (runId: string, signal: AbortSignal) =>
        client.usage(run.conversationId, runId, signal),
    }),
    [client, run.conversationId],
  );
  const anchor =
    clientId && run.clientIds.includes(clientId)
      ? clientId
      : (run.clientIds[0] ?? null);
  return (
    <section aria-label="Run record" className={styles.stack}>
      <div>
        <h2 className={styles.title}>Run started {runTime(run.createdAt)}</h2>
        <p className={ui.muted}>
          {run.clientIds.length
            ? `${run.clientIds.length} permitted client ${run.clientIds.length === 1 ? "scope" : "scopes"}`
            : "General"}
        </p>
      </div>
      <div className={styles.summary}>
        <dl className={styles.metadata}>
          <div>
            <dt>Recorded status</dt>
            <dd>{runStatus(run.state)}</dd>
          </div>
          <div>
            <dt>Status time</dt>
            <dd>
              <time dateTime={run.statusAt}>{runTime(run.statusAt)}</time>
            </dd>
          </div>
          <div>
            <dt>Observed</dt>
            <dd>
              <time dateTime={value.observedAt}>
                {runTime(value.observedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>SDK estimate · USD</dt>
            <dd className={styles.estimate}>{usageSummary(run.usage)}</dd>
          </div>
        </dl>
        {run.usage.recording !== "not-recorded" &&
        run.usage.sdkEstimateUsd !== null ? (
          <details className={styles.exact}>
            <summary>Exact estimate</summary>
            <p>
              Recorded SDK estimate: {String(run.usage.sdkEstimateUsd)} USD
              {run.usage.recording === "unavailable" ? " (partial)" : ""}
              <br />
              This is the exact received estimate; it is not a provider-billed
              charge.
            </p>
          </details>
        ) : null}
      </div>
      <p className={ui.muted}>
        Recorded status is a saved update, not confirmation that work has
        stopped. Open the conversation for current work, approvals and outputs.
      </p>
      <Link
        className={`${ui.outline} ${styles.action}`}
        href={conversationHref(anchor, run.conversationId)}
      >
        Open this conversation
      </Link>
      <RecordedUsageView runId={run.runId} reads={reads} />
    </section>
  );
}
