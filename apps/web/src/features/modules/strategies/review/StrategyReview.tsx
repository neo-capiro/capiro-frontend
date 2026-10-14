"use client";
import { ReviewProposal } from "./ProposalReview";
import { ProposalOperationSummary } from "./ProposalOperations";
import { classifyProposalOperations } from "./proposal-operations";

import { useState } from "react";
import type { StrategyChangeSet } from "../../../../shared/capiro/operations/strategies-agents";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";

export function StrategyReview({ clientId }: { clientId?: string }) {
  const [risk, setRisk] = useState("all");
  const [selected, setSelected] = useState<StrategyChangeSet>();
  const [firmOpen, setFirmOpen] = useState(false);
  const proposals = useCapiroQuery("strategies.proposals", {});
  const strategies = useCapiroQuery("strategies.list", {});
  const firmReview = useCapiroQuery("strategies.firm-review", {});
  const acknowledge = useCapiroMutation("strategies.firm-review.acknowledge");
  async function acknowledgeFirm(id: string) {
    try {
      await acknowledge.run({ params: { id }, body: { to: "completed" } });
      firmReview.reload();
    } catch {
      /* Preserve the finding after a failed acknowledgment. */
    }
  }
  const filtered = (proposals.data ?? []).filter(
    (proposal) =>
      (!clientId ||
        strategies.data?.some(
          (strategy) =>
            strategy.id === proposal.strategyId &&
            strategy.clientId === clientId,
        )) &&
      (risk === "all" ||
        (risk === "medium" &&
          ["medium", "high", "critical"].includes(proposal.risk)) ||
        (risk === "high" && ["high", "critical"].includes(proposal.risk))),
  );
  const currentProposal = selected
    ? proposals.data?.find((proposal) => proposal.id === selected.id)
    : undefined;
  const pending = filtered.filter(
    (proposal) =>
      proposal.status === "proposed" || proposal.status === "approved",
  );
  const applied = filtered.filter((proposal) => proposal.status === "applied");
  return (
    <div className={styles.panels} data-design-node="411:120335">
      <div className={styles.blue}>
        <h2>Firm-level checks</h2>
        <p>Calendar baseline · Firm phase coverage · Outreach guardrails</p>
        <p>
          {firmReview.error
            ? "Firm findings unavailable"
            : `${firmReview.data?.length ?? "—"} findings need acknowledgment`}
        </p>
        <ActionButton onClick={() => setFirmOpen(true)}>
          Review firm findings
        </ActionButton>
      </div>
      <div
        className={styles.pills}
        role="group"
        aria-label="Proposal risk filter"
      >
        {[
          ["all", "All risks"],
          ["medium", "Medium+"],
          ["high", "High+"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={risk === value ? styles.active : ""}
            aria-pressed={risk === value}
            onClick={() => setRisk(value!)}
          >
            {label}
          </button>
        ))}
      </div>
      <StatusPanel
        loading={proposals.loading}
        error={proposals.error}
        onRetry={proposals.reload}
        empty={
          !proposals.loading &&
          !proposals.error &&
          !pending.length &&
          !applied.length
            ? "No proposed changes match this view"
            : undefined
        }
      >
        {pending.map((proposal) => (
          <Panel
            key={proposal.id}
            title={
              strategies.data?.find(
                (strategy) => strategy.id === proposal.strategyId,
              )?.title ?? "Strategy proposal"
            }
            description={`${proposal.ops.length} proposed changes · ${proposal.risk} risk · ${proposal.status}`}
          >
            <div className={styles.form}>
              <p>{proposal.summary}</p>
              {classifyProposalOperations(proposal.ops).map((operation) => (
                <p key={operation.index}>
                  <ProposalOperationSummary operation={operation} />
                </p>
              ))}
              <div>
                <ActionButton primary onClick={() => setSelected(proposal)}>
                  Review change details
                </ActionButton>
              </div>
            </div>
          </Panel>
        ))}
        {applied.length > 0 && (
          <Panel
            title="Applied changes"
            description="Accepted changes remain auditable."
          >
            {applied.map((proposal) => (
              <div key={proposal.id} className={styles.form}>
                <p>
                  {proposal.summary}
                  <span className={styles.secondary}>
                    {proposal.appliedAt
                      ? new Date(proposal.appliedAt).toLocaleString()
                      : "Applied"}
                  </span>
                </p>
                <div>
                  <ActionButton onClick={() => setSelected(proposal)}>
                    Undo applied changes
                  </ActionButton>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </StatusPanel>
      {selected && (
        <ReviewProposal
          proposal={currentProposal ?? selected}
          available={
            Boolean(currentProposal) && !proposals.loading && !proposals.error
          }
          onClose={() => setSelected(undefined)}
          onSaved={proposals.reload}
        />
      )}
      <Modal
        open={firmOpen}
        onOpenChange={setFirmOpen}
        title="Firm-level findings"
      >
        <StatusPanel
          loading={firmReview.loading}
          error={firmReview.error}
          onRetry={firmReview.reload}
        >
          <div className={styles.form}>
            {firmReview.data?.map((run) => (
              <Panel
                key={run.id}
                title={`Firm check · ${new Date(run.createdAt).toLocaleDateString()}`}
              >
                <Badge>{run.state}</Badge>
                {run.findings?.findings?.map((finding, index) => (
                  <p key={index}>
                    <strong>{finding.title ?? finding.code}</strong>
                    <span className={styles.secondary}>{finding.message}</span>
                  </p>
                ))}
                <ActionButton
                  disabled={acknowledge.pending}
                  onClick={() => acknowledgeFirm(run.id)}
                >
                  Acknowledge findings
                </ActionButton>
              </Panel>
            ))}
            {acknowledge.error && (
              <p role="alert" className={styles.error}>
                {acknowledge.error.message}
              </p>
            )}
          </div>
        </StatusPanel>
      </Modal>
    </div>
  );
}
