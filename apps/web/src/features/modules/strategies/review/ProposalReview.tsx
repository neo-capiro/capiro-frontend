"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { StrategyChangeSet } from "../../../../shared/capiro/operations/strategies-agents";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import { ActionButton, Modal, Panel } from "../../../../shared/module-ui";
import {
  ProposalOperationAudit,
  ProposalOperationSelection,
} from "./ProposalOperations";
import {
  classifyProposalOperations,
  proposalActionAllowed,
  proposalOperationBasis,
  proposalSnapshot,
  selectableProposalIndexes,
  type ProposalDecision,
} from "./proposal-operations";
import styles from "../strategies.module.css";

type Props = {
  proposal: StrategyChangeSet;
  onClose: () => void;
  onSaved: () => void;
  available?: boolean;
};

/** A replaced receipt disposes the old selection, confirmation and mutation view. */
export function ReviewProposal(props: Props) {
  const snapshot =
    proposalSnapshot(props.proposal) + ":" + String(props.available ?? true);
  const [view, setView] = useState({ snapshot, revision: 0 });
  if (view.snapshot !== snapshot)
    setView({ snapshot, revision: view.revision + 1 });
  return (
    <ProposalReviewSession
      key={view.revision}
      {...props}
      resetSelection={view.revision > 0}
    />
  );
}

function ProposalReviewSession({
  proposal,
  onClose,
  onSaved,
  available = true,
  resetSelection,
}: Props & { resetSelection: boolean }) {
  const original = classifyProposalOperations(proposal.ops);
  const hasApprovedSelection = proposal.approvedOps != null;
  const effective = classifyProposalOperations(
    proposalOperationBasis(proposal, "apply"),
  );
  const [selected, setSelected] = useState(() =>
    resetSelection ? [] : selectableProposalIndexes(proposal.ops),
  );
  const [approvedSelected, setApprovedSelected] = useState(() =>
    resetSelection
      ? []
      : selectableProposalIndexes(proposalOperationBasis(proposal, "apply")),
  );
  const [decision, setDecision] = useState<ProposalDecision>();
  const mounted = useRef(false);
  const inFlight = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const approve = useCapiroMutation("strategies.proposal.approve");
  const apply = useCapiroMutation("strategies.proposal.apply");
  const reject = useCapiroMutation("strategies.proposal.reject");
  const undo = useCapiroMutation("strategies.proposal.undo");
  const pending =
    approve.pending || apply.pending || reject.pending || undo.pending;
  const error = approve.error ?? apply.error ?? reject.error ?? undo.error;
  const applyIndexes = hasApprovedSelection ? approvedSelected : selected;
  const indexesFor = (action: ProposalDecision) =>
    action === "apply" ? applyIndexes : selected;
  const allowed = (action: ProposalDecision) =>
    available && proposalActionAllowed(proposal, action, indexesFor(action));
  function choose(action: ProposalDecision) {
    if (pending || inFlight.current || !allowed(action)) return;
    approve.reset();
    apply.reset();
    reject.reset();
    undo.reset();
    setDecision(action);
  }
  async function confirm() {
    if (!decision || inFlight.current || !mounted.current || !allowed(decision))
      return;
    inFlight.current = true;
    try {
      if (decision === "approve")
        await approve.run({
          params: { id: proposal.id },
          body: { opIndexes: [...selected] },
        });
      else if (decision === "apply")
        await apply.run({
          params: { id: proposal.id },
          body: { opIndexes: [...applyIndexes] },
        });
      else if (decision === "reject")
        await reject.run({ params: { id: proposal.id } });
      else await undo.run({ params: { id: proposal.id } });
      if (!mounted.current) return;
      onSaved();
      onClose();
    } catch {
      /* Backend refusal or interrupted delivery stays visible; never replay. */
    } finally {
      inFlight.current = false;
    }
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !pending && !inFlight.current) onClose();
        }}
        title="Review proposed changes"
        description={
          "Plan pin " +
          proposal.strategyVersionId.slice(0, 12) +
          " · " +
          proposal.risk +
          " risk"
        }
        footer={
          <>
            <ActionButton
              disabled={pending || !allowed("reject")}
              onClick={() => choose("reject")}
            >
              Reject change set
            </ActionButton>
            <ActionButton
              disabled={pending || !allowed("approve")}
              onClick={() => choose("approve")}
            >
              Approve selected
            </ActionButton>
            <ActionButton
              primary
              disabled={pending || !allowed("apply")}
              onClick={() => choose("apply")}
            >
              Apply {applyIndexes.length} changes
            </ActionButton>
            {proposal.status === "applied" && (
              <ActionButton
                disabled={pending || !allowed("undo")}
                onClick={() => choose("undo")}
              >
                Undo applied changes
              </ActionButton>
            )}
          </>
        }
      >
        <div className={styles.form}>
          {resetSelection && (
            <p role="status">
              The stored proposal changed. Review the current operations before
              confirming.
            </p>
          )}
          {!available && (
            <p role="status">
              The current proposal is unavailable. Refresh the list before
              making a decision.
            </p>
          )}
          {(!hasApprovedSelection || proposal.status === "proposed") && (
            <ProposalOperationSelection
              title={
                hasApprovedSelection
                  ? "Changes selected for approval"
                  : "Selected operations"
              }
              operations={original}
              selected={selected}
              enabled={
                available &&
                (hasApprovedSelection
                  ? proposal.status === "proposed"
                  : proposal.status === "proposed" ||
                    proposal.status === "approved")
              }
              pending={pending}
              onSelection={setSelected}
            />
          )}
          {hasApprovedSelection && (
            <ProposalOperationSelection
              title="Stored selection for application"
              operations={effective}
              selected={approvedSelected}
              enabled={
                available &&
                (proposal.status === "proposed" ||
                  proposal.status === "approved")
              }
              pending={pending}
              onSelection={setApprovedSelected}
            />
          )}
          <ProposalOperationAudit operations={original} />
          {hasApprovedSelection && (
            <ProposalOperationAudit
              title="Stored application selection details"
              operations={effective}
            />
          )}
          <Panel title="Audit details">
            <p>{proposal.summary}</p>
            <p className={styles.muted}>
              Created {new Date(proposal.createdAt).toLocaleString()} ·{" "}
              {proposal.risk} risk · {proposal.status}
            </p>
            {original
              .flatMap((operation) =>
                operation.state === "supported"
                  ? (operation.edit.sources ?? [])
                  : [],
              )
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
          if (!open && !pending && !inFlight.current) setDecision(undefined);
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
              onClick={() => {
                if (!inFlight.current) setDecision(undefined);
              }}
            >
              Back to review
            </ActionButton>
            <ActionButton
              primary
              disabled={pending || !decision || !allowed(decision)}
              onClick={confirm}
            >
              {pending ? "Saving…" : "Confirm decision"}
            </ActionButton>
          </>
        }
      >
        <p>{proposal.summary}</p>
        <p className={styles.muted}>
          {decision === "approve" || decision === "apply"
            ? indexesFor(decision).length + " selected operations · "
            : ""}
          Plan pin {proposal.strategyVersionId.slice(0, 12)}
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
