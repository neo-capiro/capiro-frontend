"use client";

import { useState } from "react";
import type { StrategySummary } from "../../../shared/capiro/operations/strategies-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Modal,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";
import { FirmPhases } from "./FirmPhases";
import styles from "./strategies.module.css";
import { planStatistics } from "./strategy-model";

export function StrategiesLibrary({
  clientId,
  onOpen,
  onCreate,
  onReview,
}: {
  clientId: string;
  onOpen: (id: string, clientId: string) => void;
  onCreate: () => void;
  onReview: () => void;
}) {
  const query = useCapiroQuery("strategies.list", {});
  const clients = useCapiroQuery("clients.list", {});
  const people = useCapiroQuery("planner.bootstrap", {});
  const phases = useCapiroQuery("strategies.phases", {});
  const proposals = useCapiroQuery("strategies.proposals", {});
  const [plan, setPlan] = useState("all");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState("updated");
  const [phaseEditor, setPhaseEditor] = useState(false);
  const [deleting, setDeleting] = useState<StrategySummary>();
  const archive = useCapiroMutation("strategies.archive");
  const all = (query.data ?? []).filter(
    (strategy) => !clientId || strategy.clientId === clientId,
  );
  const stats = planStatistics(all);
  const rows = all
    .filter(
      (strategy) =>
        (plan === "all" ||
          (plan === "empty" && strategy.nodeCount === 0) ||
          (plan === "review" && strategy.summary.reviewCount > 0) ||
          (plan === "unassigned" && strategy.summary.unassignedCount > 0)) &&
        (owner === "all" ||
          (owner === "unassigned"
            ? !strategy.ownerUserId
            : strategy.ownerUserId === owner)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : b.lastEditedAt.localeCompare(a.lastEditedAt),
    );
  const pendingCount = (proposals.data ?? []).filter(
    (proposal) =>
      (proposal.status === "proposed" || proposal.status === "approved") &&
      all.some((strategy) => strategy.id === proposal.strategyId),
  ).length;
  async function remove() {
    if (!deleting) return;
    try {
      await archive.run({ params: { id: deleting.id } });
      setDeleting(undefined);
      query.reload();
    } catch {
      /* Preserve the strategy until archive is acknowledged. */
    }
  }
  return (
    <>
      <section className={styles.plum}>
        <h2>
          {phases.data?.length
            ? "Firm phases configured"
            : phases.error
              ? "Firm phases unavailable"
              : "Configure firm phases"}
        </h2>
        <p>One shared phase ladder across every strategy.</p>
        <ActionButton
          disabled={phases.loading || Boolean(phases.error)}
          onClick={() => setPhaseEditor(true)}
        >
          Edit phases
        </ActionButton>
        {phases.error && <p role="alert">{phases.error.message}</p>}
      </section>
      <div className={styles.stats}>
        <article className={styles.stat}>
          <h2>Plans with steps</h2>
          <strong>
            {query.loading || query.error ? "—" : stats.withSteps}
          </strong>
        </article>
        <button
          className={styles.stat}
          style={{ textAlign: "left" }}
          onClick={onReview}
        >
          <h2>Watcher proposals</h2>
          <strong>
            {query.loading ||
            query.error ||
            proposals.loading ||
            proposals.error
              ? "—"
              : pendingCount}
          </strong>
        </button>
        <button
          className={styles.stat}
          style={{ textAlign: "left" }}
          onClick={() => setPlan("unassigned")}
        >
          <h2>Unassigned work</h2>
          <strong>
            {query.loading || query.error ? "—" : stats.unassigned}
          </strong>
        </button>
        <article className={styles.stat}>
          <h2>Owner coverage</h2>
          <strong>
            {query.loading || query.error ? "—" : `${stats.coverage}%`}
          </strong>
        </article>
      </div>
      <StatusPanel
        error={
          proposals.error &&
          `Watcher proposals unavailable. ${proposals.error.message}`
        }
        onRetry={proposals.reload}
      />
      <div className={styles.filters}>
        <div className={styles.actions}>
          <SelectInput
            aria-label="Filter strategy plans"
            value={plan}
            onValueChange={setPlan}
            options={[
              { value: "all", label: "All plans" },
              { value: "review", label: "Needs review" },
              { value: "unassigned", label: "Unassigned work" },
              { value: "empty", label: "Empty plans" },
            ]}
          />
          <SelectInput
            aria-label="Filter strategy owners"
            value={owner}
            onValueChange={setOwner}
            options={[
              { value: "all", label: "All owners" },
              { value: "unassigned", label: "Unassigned" },
              ...(people.data?.people ?? []).map((person) => ({
                value: person.id,
                label: person.name,
              })),
            ]}
          />
          <SelectInput
            aria-label="Sort strategies"
            value={sort}
            onValueChange={setSort}
            options={[
              { value: "updated", label: "Recently updated" },
              { value: "name", label: "Name" },
            ]}
          />
        </div>
        <span className={styles.muted}>
          {query.loading || query.error ? "—" : rows.length} strategies
        </span>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={rows}
          rowKey={(strategy) => strategy.id}
          caption="Strategies library"
          columns={[
            {
              key: "strategy",
              label: "Client / Strategy",
              width: "30%",
              render: (strategy) => (
                <button
                  className={styles.link}
                  onClick={() => onOpen(strategy.id, strategy.clientId)}
                >
                  <span className={styles.clientTag}>
                    {clients.data?.find(
                      (client) => client.id === strategy.clientId,
                    )?.name ?? "Client"}
                  </span>
                  <span style={{ display: "block" }}>{strategy.title}</span>
                </button>
              ),
            },
            {
              key: "plan",
              label: "Plan",
              render: (strategy) =>
                strategy.nodeCount
                  ? `${strategy.nodeCount} steps${strategy.summary.reviewCount ? ` · ${strategy.summary.reviewCount} need review` : ""}${strategy.summary.unassignedCount ? ` · ${strategy.summary.unassignedCount} unassigned` : ""}`
                  : "Empty plan",
            },
            {
              key: "owner",
              label: "Owner",
              render: (strategy) =>
                people.data?.people.find(
                  (person) => person.id === strategy.ownerUserId,
                )?.name ??
                (strategy.ownerUserId ? "Assigned owner" : "Unassigned"),
            },
            {
              key: "updated",
              label: "Updated",
              render: (strategy) =>
                new Date(strategy.lastEditedAt).toLocaleDateString(),
            },
            {
              key: "actions",
              label: "Actions",
              render: (strategy) => (
                <div className={styles.actions}>
                  <ActionButton
                    onClick={() => onOpen(strategy.id, strategy.clientId)}
                  >
                    Open
                  </ActionButton>
                  <ActionButton onClick={() => setDeleting(strategy)}>
                    Delete
                  </ActionButton>
                </div>
              ),
            },
          ]}
          emptyMessage="No strategies match these filters."
        />
      </StatusPanel>
      {!query.loading && !query.error && !all.length && (
        <ActionButton primary onClick={onCreate}>
          Create your first strategy
        </ActionButton>
      )}
      {phaseEditor && (
        <FirmPhases
          phases={phases.data ?? []}
          onClose={() => setPhaseEditor(false)}
          onSaved={phases.reload}
        />
      )}
      <Modal
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !archive.pending) setDeleting(undefined);
        }}
        title="Delete strategy?"
        description="Deleting archives the strategy. Its versions, Workspace drafts and Outreach records remain in history."
        footer={
          <>
            <ActionButton
              disabled={archive.pending}
              onClick={() => setDeleting(undefined)}
            >
              Cancel
            </ActionButton>
            <ActionButton primary disabled={archive.pending} onClick={remove}>
              {archive.pending ? "Deleting…" : "Delete strategy"}
            </ActionButton>
          </>
        }
      >
        <p>{deleting?.title}</p>
        {archive.error && (
          <p role="alert" className={styles.error}>
            {archive.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}
