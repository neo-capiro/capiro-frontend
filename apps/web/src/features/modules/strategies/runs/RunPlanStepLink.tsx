"use client";
import type { StrategyRun } from "../../../../shared/capiro/operations/strategies-agents";
import {
  strategyId,
  type StrategyDetail,
} from "../../../../shared/capiro/operations/strategies-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  currentStrategyHref,
  currentStrategyStep,
} from "../../../../shared/capiro/strategy-navigation";
import { StatusPanel, UnavailableAction } from "../../../../shared/module-ui";
import {
  useSelectedClient,
  type SelectedClient,
} from "../../../../shared/session/SelectedClient";
import styles from "./runs.module.css";

export function currentRunExecution(run: StrategyRun) {
  const execution = run.findings?.execution;
  return execution &&
    run.missionId === execution.missionId &&
    (run.strategyId === null || run.strategyId === execution.strategyId)
    ? execution
    : undefined;
}

/** Called only with the current detail returned by the canonical read owner. */
export function runPlanStepHref(
  run: StrategyRun,
  detail: StrategyDetail,
  selectedClientId?: string,
) {
  const execution = currentRunExecution(run);
  if (
    !execution ||
    detail.id !== execution.strategyId ||
    !strategyId.safeParse(detail.clientId).success ||
    (selectedClientId !== undefined && detail.clientId !== selectedClientId) ||
    !currentStrategyStep(detail.nodes, detail.id, execution.nodeId)
  )
    return undefined;
  return currentStrategyHref(detail.clientId, detail.id, execution.nodeId);
}

export function RunPlanStepLink({ run }: { run: StrategyRun }) {
  const scope = useSelectedClient();
  const client =
    scope.state === "authorized-client"
      ? scope.client.id
      : scope.state === "no-selection"
        ? null
        : scope.requestedId;
  return (
    <CurrentRunPlanStepLink
      key={JSON.stringify([
        run.id,
        run.missionId,
        run.strategyId,
        run.findings?.execution,
        scope.state,
        client,
      ])}
      run={run}
      scope={scope}
    />
  );
}

function CurrentRunPlanStepLink({
  run,
  scope,
}: {
  run: StrategyRun;
  scope: SelectedClient;
}) {
  const execution = currentRunExecution(run);
  const scopeAvailable =
    scope.state === "no-selection" || scope.state === "authorized-client";
  const query = useCapiroQuery(
    "strategies.detail",
    {
      params: { id: execution?.strategyId ?? "" },
    },
    { enabled: Boolean(execution) && scopeAvailable },
  );
  if (!execution)
    return (
      <UnavailableAction reason="The run does not identify a consistent Strategy mission and step.">
        Return to plan step
      </UnavailableAction>
    );
  if (scope.state === "loading") return <StatusPanel loading />;
  if (scope.state === "unavailable")
    return (
      <UnavailableAction reason="The selected client is unavailable. Verify current client access before opening the step.">
        Return to plan step
      </UnavailableAction>
    );
  const href =
    !query.loading && !query.error && query.data
      ? runPlanStepHref(
          run,
          query.data,
          scope.state === "authorized-client" ? scope.client.id : undefined,
        )
      : undefined;
  const error =
    query.error ??
    (!query.loading && query.data && !href
      ? "The current plan step is unavailable in this Strategy and client scope."
      : undefined);
  return (
    <StatusPanel loading={query.loading} error={error} onRetry={query.reload}>
      {href && (
        <a className={styles.anchor} href={href}>
          Return to plan step
        </a>
      )}
    </StatusPanel>
  );
}
