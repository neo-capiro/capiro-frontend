"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import type { ActionWorkflowPort } from "./action-workflow-port";
import { ActionWorkflowController } from "./action-workflow-state";
import { workflowProblems } from "./workflow-problems";
import { RecommendationList } from "./RecommendationList";
import { TaskDraftPanel } from "./TaskDraftPanel";
import { ProposalPanel } from "./ProposalPanel";
import styles from "./workflow.module.css";

/** Host-supplied lifecycle identity is a disposal key, never an authority grant. */
export function MeriActionWorkflow({
  port,
  lifetimeKey,
  contextLabel,
}: {
  port: ActionWorkflowPort | null;
  lifetimeKey: string;
  contextLabel: string;
}) {
  return (
    <div className={styles.workflow}>
      <header className={styles.heading}>
        <h1>Recommendation follow-through</h1>
        <p>{contextLabel}</p>
      </header>
      {port ? (
        <ConnectedWorkflow key={lifetimeKey} port={port} />
      ) : (
        <section className={styles.panel} aria-label="Workflow unavailable">
          <h2>Action service unavailable</h2>
          <p>
            A governed action contract and authorized connection are required.
            No recommendation query, approval or task execution is connected
            here.
          </p>
          <Button type="button" disabled className={styles.button}>
            Find recommendations
          </Button>
        </section>
      )}
    </div>
  );
}

function ConnectedWorkflow({ port }: { port: ActionWorkflowPort }) {
  const controller = useMemo(() => new ActionWorkflowController(port), [port]);
  useEffect(() => controller.attach(), [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const disabled = Boolean(state.busy || state.problem);
  const problem = state.problem ? workflowProblems[state.problem] : null;
  return (
    <>
      <div className={styles.controls}>
        <Button
          type="button"
          variant="outline"
          className={styles.button}
          disabled={disabled || Boolean(state.proposal || state.draft)}
          onClick={() => void controller.query()}
        >
          {state.page ? "Refresh recommendations" : "Find recommendations"}
        </Button>
        <p role="status" className={styles.muted}>
          {state.busy
            ? `Request in progress: ${state.busy}`
            : "Requests run only when you choose an action."}
        </p>
      </div>
      {problem && (
        <section role="alert" className={styles.notice}>
          <h2>{problem.title}</h2>
          <p>{problem.description}</p>
          <p>No automatic retry will run from this view.</p>
        </section>
      )}
      <div className={styles.columns}>
        {state.page && (
          <RecommendationList
            page={state.page}
            selected={state.selected}
            disabled={disabled || Boolean(state.proposal)}
            onSelect={controller.select}
          />
        )}
        {(state.stage === "editing" || state.stage === "review") && (
          <TaskDraftPanel
            edits={state.edits}
            draft={state.draft}
            busy={disabled}
            onEdit={controller.edit}
            onReview={() => void controller.reviewDraft()}
            onPrepare={() => void controller.prepare()}
          />
        )}
        {state.proposal && (
          <ProposalPanel
            proposal={state.proposal}
            execution={state.execution}
            refused={state.approvalRefused}
            pending={state.stage === "pending"}
            disabled={disabled}
            onExecute={() => void controller.execute()}
          />
        )}
      </div>
    </>
  );
}
