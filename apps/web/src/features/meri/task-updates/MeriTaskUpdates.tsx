"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { TaskUpdateWorkflowPort } from "../../../shared/meri-task-commands/workflow-port";
import { workflowProblems } from "../actions/workflow-problems";
import { TaskUpdateController } from "./workflow-state";
import { TaskUpdateForm } from "./TaskUpdateForm";
import { TaskUpdateProposal } from "./TaskUpdateProposal";
import styles from "./workflow.module.css";

export function MeriTaskUpdates({
  port,
  lifetimeKey,
}: {
  port: TaskUpdateWorkflowPort;
  lifetimeKey: string;
}) {
  return <ConnectedUpdates key={lifetimeKey} port={port} />;
}
function ConnectedUpdates({ port }: { port: TaskUpdateWorkflowPort }) {
  const controller = useMemo(() => new TaskUpdateController(port), [port]);
  useEffect(() => controller.attach(), [controller]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const problem = state.problem ? workflowProblems[state.problem] : null;
  const disabled = Boolean(state.busy || state.problem);
  return (
    <div className={styles.workflow}>
      <p role="status">
        {state.busy
          ? `${state.busy === "prepare" ? "Preparing proposal" : "Checking approval and execution"}…`
          : "Requests run only when you choose an action."}
      </p>
      {problem && (
        <section role="alert" className={styles.panel}>
          <h2>{problem.title}</h2>
          <p>{problem.description}</p>
          <p>No automatic retry will run from this view.</p>
        </section>
      )}
      <div className={styles.columns}>
        <TaskUpdateForm
          draft={state.draft}
          disabled={disabled || Boolean(state.proposal)}
          onEdit={controller.edit}
          onPrepare={() => void controller.prepare()}
        />
        {state.proposal && (
          <TaskUpdateProposal
            proposal={state.proposal}
            execution={state.execution}
            disabled={disabled}
            onExecute={() => void controller.execute()}
          />
        )}
      </div>
    </div>
  );
}
