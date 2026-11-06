"use client";
import Link from "next/link";
import { currentStrategyHref } from "@/shared/capiro/strategy-navigation";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  objectiveGenerationHref,
  type ObjectiveGenerationJob,
} from "@/shared/capiro/operations/objective-generation";
import { ObjectivePlannerAutomation } from "./ObjectivePlannerAutomation";

/** Renders only the current validated job selected by the governed intake owner. */
export function ObjectiveGenerationOutcome({
  job,
}: {
  job: ObjectiveGenerationJob;
  actor: ClientWriter;
}) {
  const receipt = job.objectiveGeneration;
  return (
    <div className="stack" aria-label="Strategy generation result">
      <p role="status">Generation {job.status}.</p>
      {job.progressText && <p>{job.progressText}</p>}
      {receipt.failure && <p role="alert">{receipt.failure.message}</p>}
      {job.status === "completed" && (
        <>
          <Link
            className="button primary"
            href={currentStrategyHref(
              receipt.source.clientId,
              receipt.result!.strategyId,
            )}
          >
            Open in Strategies
          </Link>
          <Link
            className="button"
            href={objectiveGenerationHref({
              jobId: job.jobId,
              status: job.status,
              objectiveGeneration: job.objectiveGeneration,
            })}
          >
            Review generated version
          </Link>
          <ObjectivePlannerAutomation
            selection={{
              query: {
                clientId: receipt.source.clientId,
                objectiveId: receipt.source.objectiveId,
                objectiveVersion: receipt.source.objectiveVersion,
              },
              ids: {
                generatedJobId: job.jobId,
                strategyId: receipt.result!.strategyId,
                strategyVersionId: receipt.result!.strategyVersionId,
              },
            }}
          />
        </>
      )}
      {job.status === "completed" ? (
        <details>
          <summary>Generation details</summary>
          <GenerationContext context={receipt.context} />
        </details>
      ) : (
        <GenerationContext context={receipt.context} />
      )}
    </div>
  );
}

function GenerationContext({
  context,
}: {
  context: ObjectiveGenerationJob["objectiveGeneration"]["context"];
}) {
  return (
    <>
      <p>Context coverage: {context.state}.</p>
      {context.compiledAt && <p>Compiled: {context.compiledAt}</p>}
      {context.reobservedAt && (
        <p>
          Rechecked: {context.reobservedAt}. History reflects these
          observations.
        </p>
      )}
      {!!context.issues.length && (
        <ul>
          {context.issues.map((issue, index) => (
            <li key={index}>
              {issue.group}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
