"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  requireSavedStrategyReview,
  type SavedStrategySelection,
} from "../../../shared/capiro/operations/objective-saved-review";
import { currentStrategyHref } from "../../../shared/capiro/strategy-navigation";
import { ActionButton, Panel } from "../../../shared/module-ui";
import { StrategyRoadmap } from "../strategies/strategy-timeline-public";
import { ObjectiveDestinationFrame } from "./ObjectiveDestinationFrame";
import styles from "./objective-destinations.module.css";
import { ObjectiveSavedCitations } from "./ObjectiveSavedCitations";

type SavedStrategy = ReturnType<typeof requireSavedStrategyReview>;

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
  let saved: SavedStrategy | undefined;
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
      title="Generated Strategy"
      description="Review the generated roadmap, then open it in Strategies to continue working on the plan."
      selected={query}
      loading={read.loading}
      error={error}
      reload={read.reload}
    >
      {saved && (
        <SavedStrategyContent key={saved.source.snapshotDigest} saved={saved} />
      )}
    </ObjectiveDestinationFrame>
  );
}

function SavedStrategyContent({ saved }: { saved: SavedStrategy }) {
  return (
    <>
      <Panel
        title={saved.snapshot.meta.title}
        description={saved.snapshot.meta.goal ?? "No goal supplied"}
      >
        <p>
          Type: {saved.snapshot.meta.type} · Target date:{" "}
          {saved.snapshot.meta.targetDate ?? "Not set"}
        </p>
        <p>
          Generated {new Date(saved.savedAt).toLocaleString()}. This roadmap
          shows the exact saved output.
        </p>
        <ActionButton primary asChild>
          <Link
            href={currentStrategyHref(
              saved.source.clientId,
              saved.source.strategyId,
            )}
          >
            Open in Strategies
          </Link>
        </ActionButton>
        <p>
          Open the working timeline to review and edit the current Strategy.
        </p>
        <StrategyRoadmap nodes={saved.snapshot.nodes} />
        <SavedStrategySteps saved={saved} />
      </Panel>
      <details className={styles.provenance}>
        <summary>Generation details</summary>
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
        <p>Owner: {saved.snapshot.meta.ownerUserId}</p>
        <p>Later Strategy edits are not included in this version.</p>
      </details>
      <Panel title="Saved sources">
        <ObjectiveSavedCitations saved={saved} />
      </Panel>
      <Panel title="Planner preparation">
        <p>
          Reviewing this version creates no work. Prepare in Planner requires
          its own explicit consent.
        </p>
        <p>
          Preparation checks every saved action and milestone, current archives,
          dates and dependencies. Other step kinds remain linked context.
          Without custom groups, eligible work uses the default group.
        </p>
        <p>
          Current availability is observed for this read and is checked again
          during preparation.
        </p>
      </Panel>
    </>
  );
}

function SavedStrategySteps({ saved }: { saved: SavedStrategy }) {
  return (
    <details>
      <summary>Saved step details ({saved.snapshot.nodes.length})</summary>
      <ol className={styles.records}>
        {saved.snapshot.nodes.map((node) => {
          const current = saved.currentNodes.find(
            (n) => n.sourceNodeId === node.id,
          )!;
          return (
            <li key={node.id}>
              <h4>{node.title}</h4>
              <p>
                {node.kind} · {node.subject} · {node.status}
              </p>
              <p>Owner: {node.ownerUserId ?? "Unassigned"}</p>
              <p>
                Start: {node.startsOn} · End: {node.endsOn ?? "Not set"} · Open
                ended: {node.openEnded ? "Yes" : "No"}
              </p>
              {node.note && <p className={styles.plaintext}>{node.note}</p>}
              <p>
                Depends on:{" "}
                {node.dependsOnIds
                  .map(
                    (id) =>
                      saved.snapshot.nodes.find(
                        (candidate) => candidate.id === id,
                      )?.title ?? id,
                  )
                  .join(", ") || "None"}
              </p>
              <p>Current source availability: {current.availability}</p>
              <p>Source step: {node.id}</p>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
