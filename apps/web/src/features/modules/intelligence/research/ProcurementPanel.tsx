"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../../shared/module-ui";
import { procurementHref, sameProcurementScope } from "./procurement-selection";
import { ProcurementResult } from "./ProcurementResult";
import { ProcurementAccountPanel } from "./ProcurementAccounts";
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
  // Source-cutoff URL params are unsupported for the observed operation; refuse visibly.
  const hasCutoff = mode === "money-flow" && Boolean(scope?.sourceThrough);
  const observedBody = scope
    ? {
        awardIdentityKeys: scope.awardIdentityKeys,
        ...(scope.knownAt ? { knownAt: scope.knownAt } : {}),
        revisionBasis: "latest_observed" as const,
        includeActionDetails: true as const,
      }
    : {
        awardIdentityKeys: [] as string[],
        revisionBasis: "latest_observed" as const,
        includeActionDetails: true as const,
      };
  const request =
    mode === "hub"
      ? { body: scope ?? { awardIdentityKeys: [] } }
      : { body: observedBody };
  const query = useCapiroQuery(
    mode === "hub"
      ? "procurement.hubSummary"
      : "procurement.observedActionDetails",
    request,
    { enabled: scope !== null && !hasCutoff },
  );
  const result =
    scope &&
    !query.loading &&
    !query.error &&
    query.data &&
    sameProcurementScope(scope, query.data)
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
    <div className={styles.readPanel}>
      <Panel
        title={
          mode === "hub"
            ? "Selected procurement awards"
            : "Procurement Money Flow"
        }
        description={`Qualified observed actions for your explicit award selection. Public source scope is independent of the selected client profile.${mode === "hub" ? "" : " Action detail is limited to 2,500 rows and one MiB; oversized selections are refused, not truncated."}`}
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
            {hasCutoff && (
              <div className={styles.content}>
                <p role="alert">
                  Source-cutoff requests are not supported for observed data.
                  Use &ldquo;Use latest observations&rdquo; to clear it and load
                  the latest observations instead.
                </p>
              </div>
            )}
            {result && (
              <ProcurementResult
                key={JSON.stringify([scope, result.knownAt])}
                result={result}
              />
            )}
            {result && (
              <div className={styles.content}>
                {mode === "hub" ? (
                  <Link
                    href={procurementHref(
                      "acquisitions",
                      capturedScope,
                      selection.clientId,
                    )}
                  >
                    Open Money Flow for these awards
                  </Link>
                ) : result.contract !== "defproc-observed-money-flow/v1" ? (
                  <Link
                    href={procurementHref(
                      "hub",
                      capturedScope,
                      selection.clientId,
                    )}
                  >
                    Open this snapshot in Hub
                  </Link>
                ) : null}
              </div>
            )}
          </StatusPanel>
        )}
        {scope && mode === "money-flow" && (
          <ProcurementAccountPanel
            scope={{
              awardIdentityKeys: scope.awardIdentityKeys,
              knownAt: capturedScope?.knownAt,
            }}
            waiting={query.loading}
            hasSamCutoff={Boolean(scope.sourceThrough)}
          />
        )}
      </Panel>
    </div>
  );
}
