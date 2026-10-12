"use client";

import { useState } from "react";
import type { StrategyChangeSet } from "../../../../shared/capiro/operations/strategies-agents";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Modal,
  Panel,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";

type Decision = "approve" | "apply" | "reject" | "undo";
export function ReviewProposal({
  proposal,
  onClose,
  onSaved,
}: {
  proposal: StrategyChangeSet;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState(
    proposal.ops.map((_, index) => index),
  );
  const [decision, setDecision] = useState<Decision>();
  const approve = useCapiroMutation("strategies.proposal.approve");
  const apply = useCapiroMutation("strategies.proposal.apply");
  const reject = useCapiroMutation("strategies.proposal.reject");
  const undo = useCapiroMutation("strategies.proposal.undo");
  const pending =
    approve.pending || apply.pending || reject.pending || undo.pending;
  const error = approve.error ?? apply.error ?? reject.error ?? undo.error;
  async function confirm() {
    try {
      if (decision === "approve")
        await approve.run({
          params: { id: proposal.id },
          body: { opIndexes: selected },
        });
      else if (decision === "apply")
        await apply.run({
          params: { id: proposal.id },
          body: { opIndexes: selected },
        });
      else if (decision === "reject")
        await reject.run({ params: { id: proposal.id } });
      else if (decision === "undo")
        await undo.run({ params: { id: proposal.id } });
      onSaved();
      onClose();
    } catch {
      /* A stale head/risk/policy failure stays visible and never removes the proposal. */
    }
  }
  const reviewable =
    proposal.status === "proposed" || proposal.status === "approved";
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !pending) onClose();
        }}
        title="Review proposed changes"
        description={`Plan pin ${proposal.strategyVersionId.slice(0, 12)} · ${proposal.risk} risk`}
        footer={
          <>
            <ActionButton
              disabled={pending || !reviewable}
              onClick={() => setDecision("reject")}
            >
              Reject change set
            </ActionButton>
            <ActionButton
              disabled={
                pending || proposal.status !== "proposed" || !selected.length
              }
              onClick={() => setDecision("approve")}
            >
              Approve selected
            </ActionButton>
            <ActionButton
              primary
              disabled={pending || !reviewable || !selected.length}
              onClick={() => setDecision("apply")}
            >
              Apply {selected.length} changes
            </ActionButton>
            {proposal.status === "applied" && (
              <ActionButton
                disabled={pending}
                onClick={() => setDecision("undo")}
              >
                Undo applied changes
              </ActionButton>
            )}
          </>
        }
      >
        <div className={styles.form}>
          <Panel
            title="Selected operations"
            description="Applying records a new strategy revision."
          >
            {proposal.ops.map((operation, index) => (
              <label key={index} className={styles.check}>
                <input
                  type="checkbox"
                  checked={selected.includes(index)}
                  disabled={!reviewable || pending}
                  onChange={(event) =>
                    setSelected((previous) =>
                      event.target.checked
                        ? [...previous, index]
                        : previous.filter((value) => value !== index),
                    )
                  }
                />
                <span>
                  <strong>{operation.title ?? `${operation.op} step`}</strong>
                  <small>
                    {operation.op} · {operation.startsOn ?? "Date unchanged"}
                    {operation.endsOn ? ` – ${operation.endsOn}` : ""}
                  </small>
                </span>
              </label>
            ))}
          </Panel>
          <Panel title="Change details">
            <DataTable
              rows={proposal.ops.map((operation, index) => ({
                ...operation,
                index,
              }))}
              rowKey={(operation) => String(operation.index)}
              caption="Proposed strategy changes"
              columns={[
                {
                  key: "action",
                  label: "ACTION",
                  render: (operation) => operation.op,
                },
                {
                  key: "step",
                  label: "STEP",
                  render: (operation) =>
                    operation.title ?? operation.nodeId ?? "New step",
                },
                {
                  key: "fields",
                  label: "AFTER",
                  render: (operation) => (
                    <span>
                      {operation.note ?? ""}
                      <span className={styles.secondary}>
                        {[
                          operation.startsOn,
                          operation.status,
                          operation.ownerUserId,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  ),
                },
              ]}
            />
          </Panel>
          <Panel title="Audit details">
            <p>{proposal.summary}</p>
            <p className={styles.muted}>
              Created {new Date(proposal.createdAt).toLocaleString()} ·{" "}
              {proposal.risk} risk · {proposal.status}
            </p>
            {proposal.ops
              .flatMap((operation) => operation.sources ?? [])
              .map((source, index) => (
                <p key={index} className={styles.muted}>
                  {source.section} · {source.ref ?? "No source reference"}
                </p>
              ))}
          </Panel>
        </div>
      </Modal>
      <Modal
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open && !pending) setDecision(undefined);
        }}
        title={
          decision === "undo"
            ? "Undo applied changes?"
            : decision === "reject"
              ? "Reject proposed changes?"
              : proposal.risk === "critical"
                ? "Confirm critical-risk proposal?"
                : decision === "approve"
                  ? "Approve selected changes?"
                  : "Apply selected changes?"
        }
        description={
          decision === "undo"
            ? "The backend restores the original pinned plan as a new version and checks for later edits."
            : "Only this displayed change set and its selected operations are submitted."
        }
        footer={
          <>
            <ActionButton
              disabled={pending}
              onClick={() => setDecision(undefined)}
            >
              Back to review
            </ActionButton>
            <ActionButton primary disabled={pending} onClick={confirm}>
              {pending ? "Saving…" : "Confirm decision"}
            </ActionButton>
          </>
        }
      >
        <p>{proposal.summary}</p>
        <p className={styles.muted}>
          {selected.length} selected operations · Plan pin{" "}
          {proposal.strategyVersionId.slice(0, 12)}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
      </Modal>
    </>
  );
}
