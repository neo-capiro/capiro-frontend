"use client";
import type { z } from "zod";
import type {
  objectiveStrategyDestination,
  objectivePlannerDestination,
  objectiveWorkspaceDestination,
} from "../../../shared/capiro/operations/objective-work-destinations";
import { Panel, Badge } from "../../../shared/module-ui";
import { ObjectiveObservation } from "./ObjectiveDestinationFrame";
import styles from "./objective-destinations.module.css";

export function ObjectiveStrategyView({
  value,
}: {
  value: z.infer<typeof objectiveStrategyDestination>;
}) {
  const { strategy, destination } = value;
  return (
    <>
      <Panel
        title={strategy.title}
        description={strategy.goal ?? "No goal supplied"}
      >
        <Badge>{strategy.type}</Badge>
        <p>Target date: {strategy.targetDate ?? "Not set"}</p>
        <p>Last edited: {strategy.lastEditedAt}</p>
        {strategy.meriContext && (
          <p className={styles.plaintext}>{strategy.meriContext}</p>
        )}
        <h3>Current strategy steps</h3>
        {!strategy.nodes.length && <p>No current steps.</p>}
        <ol className={styles.records}>
          {strategy.nodes.map((node) => (
            <li key={node.id}>
              <h4>{node.title}</h4>
              <p>
                {node.kind} · {node.status ?? "Status not supplied"}
              </p>
              <p>
                {node.startsOn} →{" "}
                {node.openEnded ? "Open ended" : (node.endsOn ?? node.startsOn)}
              </p>
              {node.note && <p className={styles.plaintext}>{node.note}</p>}
            </li>
          ))}
        </ol>
        {!!strategy.artifacts?.length && (
          <details>
            <summary>
              Attached artifact references ({strategy.artifacts.length})
            </summary>
            <ul>
              {strategy.artifacts.map((artifact) => (
                <li key={artifact.id}>
                  {artifact.artifactType}: {artifact.artifactRef}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Panel>
      <ObjectiveObservation destination={destination} />
    </>
  );
}
export function ObjectivePlannerView({
  value,
}: {
  value: z.infer<typeof objectivePlannerDestination>;
}) {
  const { task, destination } = value;
  return (
    <>
      <Panel title={task.name}>
        <p className={styles.plaintext}>
          {task.description || "No description supplied"}
        </p>
        <dl className={styles.facts}>
          <dt>Status</dt>
          <dd>{task.status}</dd>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
          <dt>Start</dt>
          <dd>{task.startOn ?? "Not set"}</dd>
          <dt>Due</dt>
          <dd>{task.dueOn ?? "Not set"}</dd>
          <dt>Assignee</dt>
          <dd>{task.assigneeId ?? "Unassigned"}</dd>
          <dt>Task version</dt>
          <dd>{destination.destinationVersion}</dd>
          <dt>Estimate</dt>
          <dd>{task.estimateMinutes} minutes</dd>
          <dt>Recorded time</dt>
          <dd>{task.actualMinutes} minutes</dd>
        </dl>
        <p>
          Task changes and time recording are not available from this Objective
          destination.
        </p>
      </Panel>
      <ObjectiveObservation destination={destination} />
    </>
  );
}
export function ObjectiveWorkspaceView({
  value,
}: {
  value: z.infer<typeof objectiveWorkspaceDestination>;
}) {
  return (
    <>
      <Panel
        title={value.contentSkeleton.subject || "Saved document revision"}
        description="This is the selected saved revision. Unsaved working changes are not included."
      >
        <p className={styles.plaintext}>{value.contentSkeleton.body}</p>
        <dl className={styles.facts}>
          <dt>Saved</dt>
          <dd>{value.savedAt}</dd>
          <dt>Author</dt>
          <dd>
            {value.authorId} · {value.authorKind}
          </dd>
          <dt>Document</dt>
          <dd>{value.draftId}</dd>
          <dt>Saved version</dt>
          <dd>{value.versionId}</dd>
          <dt>Snapshot SHA-256</dt>
          <dd>{value.snapshotHash}</dd>
        </dl>
        <p>
          Only eligible saved revisions with a verified current client can open
          here. Prospect and source-derived documents are unavailable.
        </p>
      </Panel>
      <ObjectiveObservation destination={value.destination} />
    </>
  );
}
