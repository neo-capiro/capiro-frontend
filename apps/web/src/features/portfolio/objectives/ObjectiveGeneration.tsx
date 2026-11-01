"use client";
import Link from "next/link";
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
      <p>Context coverage: {receipt.context.state}.</p>
      {receipt.context.compiledAt && (
        <p>Compiled: {receipt.context.compiledAt}</p>
      )}
      {receipt.context.reobservedAt && (
        <p>
          Rechecked: {receipt.context.reobservedAt}. History reflects these
          observations.
        </p>
      )}
      {!!receipt.context.issues.length && (
        <ul>
          {receipt.context.issues.map((issue, index) => (
            <li key={index}>
              {issue.group}: {issue.message}
            </li>
          ))}
        </ul>
      )}
      {receipt.failure && <p role="alert">{receipt.failure.message}</p>}
      {job.status === "completed" && (
        <>
          <Link
            className="button primary"
            href={objectiveGenerationHref({
              jobId: job.jobId,
              status: job.status,
              objectiveGeneration: job.objectiveGeneration,
            })}
          >
            Open generated Strategy receipt
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
    </div>
  );
}
