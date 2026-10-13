"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Modal,
  StatusPanel,
} from "../../../../shared/module-ui";
import { RunDetail } from "./RunDetail";
import {
  runGroups,
  runTitle,
  runTone,
  stateLabel,
  timestamp,
  uuidPattern,
  type RunGroup,
} from "./run-model";
import styles from "./runs.module.css";

export function StrategyRuns({ strategyId }: { strategyId?: string }) {
  const search = useSearchParams();
  const requested = search.get("runId");
  const [selected, setSelected] = useState<string | undefined>(
    requested && uuidPattern.test(requested) ? requested : undefined,
  );
  const [group, setGroup] = useState<RunGroup>();
  const [rules, setRules] = useState(false);
  const scoped =
    strategyId && uuidPattern.test(strategyId) ? strategyId : undefined;
  const query = useCapiroQuery(
    "strategies.runs",
    scoped ? { query: { strategyId: scoped } } : {},
  );
  const strategies = useCapiroQuery("strategies.list", {});
  const all = query.data ?? [];
  const groupStates = runGroups.find((item) => item.id === group)?.states;
  const rows = all.filter(
    (run) => !groupStates || groupStates.includes(run.state),
  );
  const strategyTitle = (id: string | null) =>
    strategies.data?.find((strategy) => strategy.id === id)?.title ??
    (id ? `Strategy ${id.slice(0, 8)}` : "Strategy not recorded");
  if (selected)
    return (
      <RunDetail
        key={selected}
        id={selected}
        strategyTitle={strategyTitle}
        onOpen={setSelected}
        onBack={() => {
          setSelected(undefined);
          query.reload();
        }}
      />
    );
  return (
    <div className={styles.stack} data-design-node="411:120419">
      <div className={styles.toolbar}>
        <span className={styles.muted}>
          {scoped ? "Runs for this strategy" : "Runs across all clients"} ·
          Results include the latest backend window.
        </span>
        <div className={styles.actions}>
          <ActionButton onClick={query.reload}>Refresh runs</ActionButton>
          <ActionButton onClick={() => setRules(true)}>
            Staging and review rules
          </ActionButton>
        </div>
      </div>
      <div className={styles.metrics}>
        {runGroups.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.metric} ${group === item.id ? styles.selected : ""}`}
            aria-pressed={group === item.id}
            onClick={() => setGroup(group === item.id ? undefined : item.id)}
          >
            <span>{item.label}</span>
            <strong>
              {query.loading || query.error
                ? "—"
                : all.filter((run) => item.states.includes(run.state)).length}
            </strong>
          </button>
        ))}
      </div>
      {group && (
        <div className={styles.toolbar}>
          <span>{runGroups.find((item) => item.id === group)?.label}</span>
          <ActionButton onClick={() => setGroup(undefined)}>
            Show all runs
          </ActionButton>
        </div>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={rows}
          rowKey={(run) => run.id}
          caption="Execution runs"
          emptyMessage="No execution runs match this view."
          columns={[
            {
              key: "run",
              label: "Run / Strategy",
              width: "40%",
              render: (run) => (
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setSelected(run.id)}
                >
                  <strong>{runTitle(run)}</strong>
                  <span>{strategyTitle(run.strategyId)}</span>
                </button>
              ),
            },
            {
              key: "trigger",
              label: "Trigger",
              render: (run) => (
                <>
                  <span>{stateLabel(run.trigger)}</span>
                  <small className={styles.meta}>
                    {timestamp(run.createdAt)}
                  </small>
                </>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (run) => (
                <Badge tone={runTone(run.state)}>{stateLabel(run.state)}</Badge>
              ),
            },
            {
              key: "outputs",
              label: "Outputs",
              render: (run) => {
                const outputs = Object.values(
                  run.findings?.results ?? {},
                ).filter((result) => result.artifactRef);
                return outputs.length
                  ? `${outputs.length} linked output${outputs.length === 1 ? "" : "s"}`
                  : "No linked outputs";
              },
            },
          ]}
        />
      </StatusPanel>
      <div className={styles.actions}>
        {[
          { label: "Open ready run", states: ["ready_for_review", "approved"] },
          { label: "Open blocked run", states: ["waiting_for_input"] },
          {
            label: "Open failed run",
            states: ["failed", "failed_recoverable", "failed_terminal"],
          },
          { label: "Open staged outputs", states: ["staged", "completed"] },
        ].map((item) => {
          const candidate = all.find((run) => item.states.includes(run.state));
          return (
            <ActionButton
              key={item.label}
              disabled={!candidate}
              onClick={() => candidate && setSelected(candidate.id)}
            >
              {item.label}
            </ActionButton>
          );
        })}
      </div>
      <p className={styles.muted}>
        Execution prepares internal Workspace drafts and Outreach records.
        External sending happens in the destination workflow.
      </p>
      <Modal
        open={rules}
        onOpenChange={setRules}
        title="Staging and review rules"
        footer={
          <ActionButton onClick={() => setRules(false)}>Close</ActionButton>
        }
      >
        <div className={styles.stack}>
          <p>
            Review the task plan, source readiness, pinned version and exact
            content before recording approval or executing.
          </p>
          <p>
            Each run exposes its current allowed actions. Retrying starts
            another attempt; it does not hide the earlier attempt. Staged
            outputs and completed runs retain separate states.
          </p>
          <p>
            Approval binds the displayed subject, body, recipients, channel and
            content hash. A changed payload requires a new review. Recording
            approval does not automatically execute a run.
          </p>
          <p>
            Execution stages internal artifacts. Open an output in its
            destination workflow to continue the work.
          </p>
        </div>
      </Modal>
    </div>
  );
}
