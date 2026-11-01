"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../../shared/module-ui";
import { procurementHref, sameProcurementScope } from "./procurement-selection";
import { ProcurementResult } from "./ProcurementResult";
import { ProcurementSelection } from "./ProcurementSelection";
import { useProcurementSelection } from "./useProcurementSelection";
import styles from "./procurement.module.css";

export function ProcurementPanel({
  mode = "money-flow",
}: {
  mode?: "money-flow" | "hub";
}) {
  const selection = useProcurementSelection();
  return <ProcurementReadPanel mode={mode} selection={selection} />;
}

export function ProcurementReadPanel({
  mode = "money-flow",
  selection,
}: {
  mode?: "money-flow" | "hub";
  selection: ReturnType<typeof useProcurementSelection>;
}) {
  const scope = selection.scope;
  const query = useCapiroQuery(
    mode === "hub" ? "procurement.hubSummary" : "procurement.moneyFlow",
    {
      body: scope ?? { awardIdentityKeys: [] },
    },
    { enabled: scope !== null },
  );
  const result =
    scope && query.data && sameProcurementScope(scope, query.data)
      ? query.data
      : undefined;
  const mismatch =
    query.data && !result
      ? new Error(
          "The returned award scope or snapshot did not match this selection. Refresh to try again.",
        )
      : undefined;
  const capturedScope = result
    ? {
        awardIdentityKeys: result.scope.awardIdentityKeys,
        knownAt: result.knownAt,
        ...(result.sourceThrough
          ? { sourceThrough: result.sourceThrough }
          : {}),
      }
    : scope;
  return (
    <Panel
      title={
        mode === "hub"
          ? "Selected procurement awards"
          : "Procurement Money Flow"
      }
      description="Qualified observed actions for your explicit award selection. Public source scope is independent of the selected client profile."
      actions={
        scope ? (
          <div className={styles.actions}>
            <ActionButton onClick={query.reload} disabled={query.loading}>
              Refresh {scope.knownAt ? "snapshot" : "observations"}
            </ActionButton>
            {scope.knownAt && (
              <ActionButton
                onClick={selection.latest}
                disabled={selection.pending}
              >
                Use latest observations
              </ActionButton>
            )}
          </div>
        ) : undefined
      }
    >
      {mode === "hub" && (scope || selection.error) && (
        <ProcurementSelection selection={selection} />
      )}
      {!scope && (
        <div className={styles.content}>
          {selection.error ? (
            <p role="alert">{selection.error}</p>
          ) : (
            <p>
              Select award records in Acquisitions to see procurement spending
              here.
            </p>
          )}
          {mode === "hub" && (
            <Link
              href={procurementHref("acquisitions", null, selection.clientId)}
            >
              Choose awards in Acquisitions
            </Link>
          )}
        </div>
      )}
      {scope && (
        <StatusPanel
          loading={query.loading}
          error={query.error ?? mismatch}
          onRetry={query.reload}
        >
          {result && (
            <ProcurementResult
              key={JSON.stringify([scope, result.knownAt])}
              result={result}
            />
          )}
          {result && (
            <div className={styles.content}>
              <Link
                href={procurementHref(
                  mode === "hub" ? "acquisitions" : "hub",
                  capturedScope,
                  selection.clientId,
                )}
              >
                {mode === "hub"
                  ? "Open Money Flow for these awards"
                  : "Open this snapshot in Hub"}
              </Link>
            </div>
          )}
        </StatusPanel>
      )}
    </Panel>
  );
}
