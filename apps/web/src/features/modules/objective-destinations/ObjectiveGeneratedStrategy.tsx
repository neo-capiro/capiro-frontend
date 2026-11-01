"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  requireSavedStrategyReview,
  type SavedStrategySelection,
} from "../../../shared/capiro/operations/objective-saved-review";
import { Panel } from "../../../shared/module-ui";
import { ObjectiveDestinationFrame } from "./ObjectiveDestinationFrame";
import styles from "./objective-destinations.module.css";
import { ObjectiveSavedCitations } from "./ObjectiveSavedCitations";

export function ObjectiveGeneratedStrategy({
  query,
  ids,
}: SavedStrategySelection) {
  const read = useCapiroQuery("strategies.objectiveSavedReview", {
    params: { id: ids.strategyId },
    query: {
      ...query,
      generationJobId: ids.generatedJobId,
      strategyVersionId: ids.strategyVersionId,
    },
  });
  let error = read.error;
  let saved: ReturnType<typeof requireSavedStrategyReview> | undefined;
  if (!read.loading && !error && read.data) {
    try {
      saved = requireSavedStrategyReview(read.data, { query, ids });
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause
          : new Error("Saved Strategy unavailable.");
    }
  }
  return (
    <ObjectiveDestinationFrame
      title="Saved generated Strategy"
      selected={query}
      loading={read.loading}
      error={error}
      reload={read.reload}
    >
      {saved && (
        <>
          <Panel title="Saved generation">
            <p>Saved version: {saved.source.strategyVersionId}</p>
            <p>Saved: {saved.savedAt}</p>
            <p>Context coverage: {saved.context.state}</p>
            <p>Compiled: {saved.context.compiledAt}</p>
            <p>Rechecked: {saved.context.reobservedAt}</p>
            <p>
              Context coverage reflects those observations; it is not a current
              observation.
            </p>
            <p>Objective revision: {saved.source.objectiveRevisionId}</p>
            <p>Snapshot SHA-256: {saved.source.snapshotDigest}</p>
            <p>
              This is the exact saved output. Later Strategy edits are not
              included.
            </p>
          </Panel>
          <Panel
            title={saved.snapshot.meta.title}
            description={saved.snapshot.meta.goal ?? "No goal supplied"}
          >
            <p>Type: {saved.snapshot.meta.type}</p>
            <p>Owner: {saved.snapshot.meta.ownerUserId}</p>
            <p>Target date: {saved.snapshot.meta.targetDate ?? "Not set"}</p>
            <h3>Saved strategy steps</h3>
            {!saved.snapshot.nodes.length && <p>No saved steps.</p>}
            <ol className={styles.records}>
              {saved.snapshot.nodes.map((node) => {
                const current = saved.currentNodes.find(
                  (n) => n.sourceNodeId === node.id,
                )!;
                return (
                  <li key={node.id}>
                    <h4>{node.title}</h4>
                    <p>Source step: {node.id}</p>
                    <p>
                      {node.kind} · {node.subject} · {node.status}
                    </p>
                    <p>Owner: {node.ownerUserId ?? "Unassigned"}</p>
                    <p>
                      Start: {node.startsOn} · End: {node.endsOn ?? "Not set"} ·
                      Open ended: {node.openEnded ? "Yes" : "No"}
                    </p>
                    {node.note && (
                      <p className={styles.plaintext}>{node.note}</p>
                    )}
                    <p>Depends on: {node.dependsOnIds.join(", ") || "None"}</p>
                    <p>Current source availability: {current.availability}</p>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title="Saved sources">
            <ObjectiveSavedCitations
              key={saved.source.snapshotDigest}
              saved={saved}
            />
          </Panel>
          <Panel title="Planner preparation">
            <p>
              Reviewing this version creates no work. Prepare in Planner
              requires its own explicit consent.
            </p>
            <p>
              Preparation checks every saved action and milestone, current
              archives, dates and dependencies. Other step kinds remain linked
              context. Without custom groups, eligible work uses the default
              group.
            </p>
            <p>
              Current availability is observed for this read and is checked
              again during preparation.
            </p>
          </Panel>
        </>
      )}
    </ObjectiveDestinationFrame>
  );
}
