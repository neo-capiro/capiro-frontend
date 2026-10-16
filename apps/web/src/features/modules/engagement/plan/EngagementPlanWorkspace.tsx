"use client";
import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  UnavailableAction,
} from "../../../../shared/module-ui";
import { PlanDetail } from "./PlanDetail";
import { NewPlan } from "./PlanEditor";
import { usePlanCommands } from "./usePlanCommands";
import styles from "./plan.module.css";

export function EngagementPlanWorkspace({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName?: string;
}) {
  const [cursor, setCursor] = useState<string>();
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([]);
  const [selected, setSelected] = useState<{ id: string; clientId: string }>();
  const [creating, setCreating] = useState(false);
  const list = useCapiroQuery("engagement.plans.list", {
    query: { clientId: clientId || undefined, cursor, limit: 25 },
  });
  const detail = useCapiroQuery(
    "engagement.plans.detail",
    { params: { planId: selected?.id ?? "" } },
    { enabled: Boolean(selected) },
  );
  const commands = usePlanCommands((plan) => {
    setSelected({ id: plan.id, clientId: plan.clientId });
    list.reload();
    detail.reload();
  });
  const { acknowledgeRead } = commands;
  const listMismatch =
    list.data &&
    (clientId
      ? list.data.items.some((plan) => plan.clientId !== clientId) ||
        list.data.summaries.some((summary) => summary.clientId !== clientId) ||
        list.data.completeness.summaryCoverage !== "selected_client"
      : list.data.completeness.summaryCoverage !== "returned_clients");
  const mismatch =
    detail.data &&
    (detail.data.id !== selected?.id ||
      detail.data.clientId !== selected?.clientId);
  useEffect(() => {
    if (detail.data && !mismatch) acknowledgeRead(detail.data);
  }, [detail.data, mismatch, acknowledgeRead]);
  const rows = listMismatch ? [] : (list.data?.items ?? []);
  const summary =
    clientId && !listMismatch
      ? list.data?.summaries.find((item) => item.clientId === clientId)
      : undefined;
  function restartList() {
    setCursor(undefined);
    setCursorStack([]);
    list.reload();
  }
  return (
    <div className={styles.stack}>
      <div className={styles.stats}>
        <Panel
          title={clientId ? "Selected-client plans" : "Plans on this page"}
        >
          <p className={styles.count}>
            {summary
              ? summary.totalPlans
              : list.data && !listMismatch
                ? rows.length
                : "—"}
          </p>
          <p className={styles.muted}>
            {summary
              ? `${summary.activePlans} active · ${summary.draftPlans} draft · ${summary.archivedPlans} archived`
              : "Only authorized returned records; this is not a zero-plan client catalog."}
          </p>
        </Panel>
        <Panel title="Review basis">
          <p className={styles.muted}>
            An explicit review of one aggregate version with a supplied
            deadline. Changes and expiry can make it stale.
          </p>
        </Panel>
        <Panel title="Recommended DC window">
          <p className={styles.muted}>
            Unavailable. No qualified sitting/recess coverage or recommendation
            contract is connected.
          </p>
        </Panel>
      </div>
      <div className={styles.tools}>
        <p className={styles.muted}>
          Manual plans and waves. Multiple plans per client are preserved.
        </p>
        <ActionButton
          primary
          disabled={!clientId || commands.blocked}
          onClick={() => setCreating(true)}
        >
          + New engagement plan
        </ActionButton>
        <ActionButton disabled={commands.busy} onClick={list.reload}>
          Reload plans
        </ActionButton>
        {(list.error || cursor !== undefined) && (
          <ActionButton
            disabled={commands.busy || list.loading}
            onClick={restartList}
          >
            Restart from first page
          </ActionButton>
        )}
      </div>
      {!clientId && (
        <p role="status">
          Select a client in Engagement scope to create a plan.
        </p>
      )}
      {(commands.error || commands.uncertain) && (
        <div role="alert">
          <p>{commands.error}</p>
          {commands.uncertain && (
            <p>
              The outcome is unconfirmed. No write will be replayed
              automatically.{" "}
              {commands.canReconcile
                ? "Reconcile the original creation request."
                : "Reload the current plan before further edits."}
            </p>
          )}
        </div>
      )}
      {commands.message && <p role="status">{commands.message}</p>}
      {commands.canReconcile && !creating && (
        <ActionButton
          disabled={commands.busy}
          onClick={() => void commands.reconcile()}
        >
          Reconcile original creation
        </ActionButton>
      )}
      <div className={styles.layout}>
        <Panel
          title="Waves across clients"
          description="Open an authorized plan to review and edit its manual waves."
        >
          <StatusPanel
            loading={list.loading}
            error={
              listMismatch
                ? "The plan list did not match the selected client. Reload plans."
                : list.error
            }
            onRetry={restartList}
          >
            {list.data && !listMismatch && (
              <>
                <DataTable
                  rows={rows}
                  rowKey={(row) => row.id}
                  caption="Engagement plans"
                  emptyMessage={
                    clientId
                      ? "No plans are recorded for this authorized selected client."
                      : "No plans returned on this authorized page."
                  }
                  columns={[
                    {
                      key: "title",
                      label: "Plan",
                      render: (row) => (
                        <button
                          className={styles.name}
                          disabled={commands.blocked}
                          onClick={() =>
                            setSelected({ id: row.id, clientId: row.clientId })
                          }
                        >
                          {row.title}
                        </button>
                      ),
                    },
                    {
                      key: "client",
                      label: "Client",
                      render: (row) =>
                        row.clientId === clientId && clientName
                          ? clientName
                          : row.clientId,
                    },
                    {
                      key: "waves",
                      label: "Waves",
                      render: (row) =>
                        row.waves.filter((wave) => !wave.archivedAt).length,
                    },
                    {
                      key: "status",
                      label: "Lifecycle / review",
                      render: (row) => (
                        <>
                          <Badge>{row.lifecycle}</Badge>{" "}
                          <Badge>{row.review.status}</Badge>
                        </>
                      ),
                    },
                  ]}
                />
                <p className={styles.muted}>
                  This page is {list.data.completeness.page}. Summaries cover{" "}
                  {list.data.completeness.summaryCoverage === "selected_client"
                    ? "the selected client"
                    : "clients returned on this page only"}
                  .
                </p>
                <div className={styles.tools}>
                  <ActionButton
                    disabled={
                      commands.blocked ||
                      cursorStack.length === 0 ||
                      list.loading
                    }
                    onClick={() => {
                      setCursor(cursorStack.at(-1));
                      setCursorStack((items) => items.slice(0, -1));
                    }}
                  >
                    Previous page
                  </ActionButton>
                  <ActionButton
                    disabled={
                      commands.blocked ||
                      !list.data.pagination.hasMore ||
                      !list.data.pagination.nextCursor ||
                      list.loading
                    }
                    onClick={() => {
                      setCursorStack((items) => [...items, cursor]);
                      setCursor(list.data!.pagination.nextCursor!);
                    }}
                  >
                    Next page
                  </ActionButton>
                </div>
              </>
            )}
          </StatusPanel>
        </Panel>
        <aside className={styles.stack} aria-label="Plan coordination context">
          <Panel title="Recommended DC windows">
            <p className={styles.muted}>
              No ranking, free-week, office-availability or meeting-booking
              assertion is available.
            </p>
            <UnavailableAction reason="A qualified recommendation contract and federal sitting/recess coverage are required.">
              Find a window
            </UnavailableAction>
          </Panel>
          <Panel title="Office selection">
            <p className={styles.muted}>
              Only authorized recorded references can be displayed. This view
              does not offer an office picker.
            </p>
          </Panel>
        </aside>
      </div>
      {selected && (
        <StatusPanel
          loading={detail.loading}
          error={
            mismatch
              ? "The response did not match this selected plan and client. Reload to confirm access."
              : detail.error
          }
          onRetry={detail.reload}
        >
          {detail.data && !mismatch && (
            <PlanDetail
              key={`${detail.data.id}:${detail.data.version}`}
              plan={detail.data}
              commands={commands}
              onReload={detail.reload}
            />
          )}
        </StatusPanel>
      )}
      {creating && clientId && (
        <NewPlan
          clientId={clientId}
          clientName={clientName ?? "the selected client"}
          commands={commands}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
