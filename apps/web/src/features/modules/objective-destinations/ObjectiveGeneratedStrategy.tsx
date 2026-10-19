"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "../../../shared/capiro/operations/objective-destination-binding";
import { requireGeneratedStrategy } from "../../../shared/capiro/operations/objective-generation";
import { Panel } from "../../../shared/module-ui";
import { ObjectiveDestinationFrame } from "./ObjectiveDestinationFrame";
import { ObjectiveStrategyView } from "./ObjectiveWorkViews";

export function ObjectiveGeneratedStrategy({
  query,
  ids,
}: {
  query: ObjectiveDestinationQuery;
  ids: {
    strategyId: string;
    strategyVersionId: string;
    generatedJobId: string;
  };
}) {
  const job = useCapiroQuery("strategies.objectiveDraftJob", {
    params: { jobId: ids.generatedJobId },
  });
  const current = useCapiroQuery("strategies.objectiveDestination", {
    params: { id: ids.strategyId },
    query,
  });
  const loading = job.loading || current.loading;
  let error = job.error ?? current.error;
  let admitted: ReturnType<typeof requireGeneratedStrategy> | undefined;
  let strategy: NonNullable<typeof current.data> | undefined;
  if (!loading && !error && job.data && current.data) {
    try {
      admitted = requireGeneratedStrategy(job.data, { query, ids });
      strategy = requireObjectiveBinding(current.data, ids.strategyId, query);
      if (
        strategy.destination.objectiveRevisionId !==
        admitted.objectiveGeneration.source.objectiveRevisionId
      )
        throw new Error(
          "The Strategy destination changed its saved Objective revision.",
        );
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause
          : new Error("Generated Strategy unavailable.");
      admitted = undefined;
      strategy = undefined;
    }
  }
  return (
    <ObjectiveDestinationFrame
      title="Generated Strategy receipt"
      selected={query}
      loading={loading}
      error={error}
      reload={() => {
        job.reload();
        current.reload();
      }}
    >
      {admitted && strategy && (
        <>
          <Panel title="Saved generation">
            <p>Generated Strategy: {ids.strategyId}</p>
            <p>Saved version: {ids.strategyVersionId}</p>
            <p>Saved: {admitted.objectiveGeneration.result!.savedAt}</p>
            <p>
              Context coverage: {admitted.objectiveGeneration.context.state}.
            </p>
            <p>Compiled: {admitted.objectiveGeneration.context.compiledAt}</p>
            <p>
              Rechecked: {admitted.objectiveGeneration.context.reobservedAt}
            </p>
            <p>
              History reflects those observations. It is not guaranteed current
              at commit.
            </p>
          </Panel>
          <h2>Current authorized Strategy content</h2>
          <p>
            The content below is the current Strategy. The saved generated
            version is identified in the receipt above.
          </p>
          <ObjectiveStrategyView value={strategy} />
        </>
      )}
    </ObjectiveDestinationFrame>
  );
}
