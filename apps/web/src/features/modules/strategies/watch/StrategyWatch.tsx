"use client";

import { useState } from "react";
import type { StrategyWatchState } from "../../../../shared/capiro/operations/strategies-watch";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../../shared/module-ui";
import styles from "./strategy-watch.module.css";

/** Display only the requested strategy's internally revision-bound review. */
export function currentWatchSnapshot(
  state: StrategyWatchState | undefined,
  strategyId: string,
) {
  return state?.strategyId === strategyId &&
    state.proposals.every(
      (proposal) => proposal.strategyVersionId === state.headVersionId,
    )
    ? state
    : undefined;
}

export function StrategyWatch({ strategyId }: { strategyId: string }) {
  const read = useCapiroQuery("strategies.watch.state", {
    params: { strategyId },
  });
  const check = useCapiroMutation("strategies.watch.revalidate");
  // A result belongs to this particular read lifetime, not a later client/read.
  const [attempt, setAttempt] = useState<StrategyWatchState>();
  const belongs = !!attempt && attempt === read.data;
  const pending = belongs && check.pending;
  const error = read.error ?? (belongs ? check.error : undefined);
  const received = belongs && check.data ? check.data : read.data;
  const state = currentWatchSnapshot(received, strategyId);
  const mismatch = !!received && !state;
  const refresh = () => {
    setAttempt(undefined);
    check.reset();
    read.reload();
  };
  const revalidate = async () => {
    setAttempt(read.data);
    try {
      await check.run({ params: { strategyId }, query: { force: "true" } });
    } catch {
      /* The existing mutation owner exposes the uncertain/failed result. */
    }
  };
  return (
    <div className={styles.review} data-design-node="1064:228892">
      <Panel
        title="Watch review"
        description="Review cited sources before revising this plan. Checking does not apply changes."
      >
        <div className={styles.actions}>
          <ActionButton
            className={styles.action}
            disabled={read.loading || pending}
            onClick={refresh}
          >
            Refresh review
          </ActionButton>
          <ActionButton
            className={styles.action}
            disabled={read.loading || pending || !!error || !state}
            onClick={revalidate}
          >
            {pending ? "Checking…" : "Check now"}
          </ActionButton>
        </div>
        <StatusPanel
          loading={read.loading || pending}
          error={
            error ??
            (mismatch
              ? "This review does not match the requested strategy and revision."
              : undefined)
          }
        >
          {state && <WatchSnapshot state={state} />}
        </StatusPanel>
        {belongs && check.error && (
          <p role="status">
            The check result is not confirmed. Refresh review to read the
            current state; no check is retried automatically.
          </p>
        )}
      </Panel>
    </div>
  );
}

function WatchSnapshot({ state }: { state: StrategyWatchState }) {
  return (
    <div className={styles.snapshot}>
      <p className={styles.revision}>
        Saved plan revision <code>{state.headVersionId}</code>
      </p>
      {state.lastRecheck?.state === "failed" && (
        <p role="status">
          Check incomplete. The plan or cited sources may have changed. This
          snapshot is not a completed check.
        </p>
      )}
      {state.lastRecheck?.state === "complete" && (
        <p role="status">Check completed for this returned snapshot.</p>
      )}
      <p>
        {state.pendingCount} pending{" "}
        {state.pendingCount === 1 ? "proposal" : "proposals"}. Proposed changes
        remain in Agent review.
      </p>
      {state.sourceFindings === undefined ? (
        <p>
          Cited-source advisories are unavailable from this service response.
        </p>
      ) : state.sourceFindings.length === 0 ? (
        <p>No cited-source advisory was reported for this snapshot.</p>
      ) : (
        state.sourceFindings.map((finding, index) => (
          <section key={`${finding.code}:${index}`} className={styles.advisory}>
            <h3>{finding.title}</h3>
            <p>{finding.message}</p>
            <p>{finding.impact}</p>
            <p className={styles.steps}>
              {finding.nodeIds.length} cited{" "}
              {finding.nodeIds.length === 1 ? "step needs" : "steps need"}{" "}
              review.
            </p>
            {finding.suggestion && <p>{finding.suggestion}</p>}
          </section>
        ))
      )}
    </div>
  );
}
