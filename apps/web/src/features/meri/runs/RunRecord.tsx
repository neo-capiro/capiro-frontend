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

export const runTime = (value: string) =>
  new Date(value).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }) + " UTC";
export const runStatus = (value: RunIndexSummary["state"]) =>
  value.replaceAll("-", " ");
export function usageSummary(usage: RunIndexSummary["usage"]) {
  if (usage.recording === "not-recorded") return "Not recorded";
  if (usage.sdkEstimateUsd === null) return "Unavailable";
  return `$${String(usage.sdkEstimateUsd)} USD${usage.recording === "unavailable" ? " (partial)" : ""}`;
}
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
        <Link href={scopedHref("/meri/runs", clientId ?? undefined)}>
          Back to runs
        </Link>
        <button type="button" className={ui.outline} onClick={result.reload}>
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
    <section aria-label="Run record">
      <h2>Run started {runTime(run.createdAt)}</h2>
      <dl>
        <dt>Recorded status</dt>
        <dd>{runStatus(run.state)}</dd>
        <dt>Status time</dt>
        <dd>{runTime(run.statusAt)}</dd>
        <dt>Observed</dt>
        <dd>{runTime(value.observedAt)}</dd>
        <dt>SDK estimate</dt>
        <dd>{usageSummary(run.usage)}</dd>
      </dl>
      <p>
        A recorded terminal status does not verify that a worker has physically
        stopped. Check the conversation for current work, approvals, completed
        outputs and available controls.
      </p>
      <Link
        className={ui.outline}
        href={conversationHref(anchor, run.conversationId)}
      >
        Open this conversation
      </Link>
      <RecordedUsageView runId={run.runId} reads={reads} />
    </section>
  );
}
