"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { governedObjectiveGenerationReadRequest } from "@/shared/capiro/operations/objective-governed-generation";
import { selectCurrentGovernedObjectiveOutputs } from "@/shared/capiro/operations/objective-governed-outputs";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import type { Objective } from "./contracts";
import {
  currentGovernedPlannerRequest,
  receiveCurrentGovernedPlannerRead,
  requireCurrentGovernedPlannerGeneration,
  reverifyCurrentGovernedPlannerProject,
  type GovernedPlannerClient,
} from "./objective-governed-planner-read";

/** The preview has no coherent PR48 + PR53 + PR56 Core read pin or reviewed route yet. */
export const governedPlannerReadEnabled = false;

export function ObjectiveGovernedPlanner({
  objective,
  disabled,
}: {
  objective: Objective;
  disabled: boolean;
}) {
  const selected = useSelectedClient();
  const client =
    selected.state === "authorized-client" ? selected.client : null;
  const request = {
    params: { clientId: objective.clientId, objectiveId: objective.id },
    query: { workAction: "objective.plan.prepare" as const },
  };
  const allowed =
    !disabled &&
    !!client &&
    client.id === objective.clientId &&
    client.status === "active" &&
    objective.status === "ready" &&
    governedObjectiveGenerationReadRequest.safeParse(request).success;
  const generationRead = useCapiroQuery(
    "objectives.governedGeneration.read",
    request,
    { enabled: allowed },
  );
  let generation: ReturnType<
    typeof requireCurrentGovernedPlannerGeneration
  > | null = null;
  if (allowed && client && generationRead.data) {
    try {
      generation = requireCurrentGovernedPlannerGeneration(
        generationRead.data,
        objective,
        client,
      );
    } catch {
      // A replaced Objective or malformed observation can never yield an output selector.
    }
  }
  return (
    <section className="card stack" aria-label="Governed Planner status">
      <h3>Current Planner work</h3>
      {!allowed ? (
        <p>
          Save a ready Objective in the selected active client to view work.
        </p>
      ) : generationRead.loading ? (
        <p role="status">Checking current Planner work.</p>
      ) : generationRead.error || !generation ? (
        <p role="alert">Current Planner work could not be verified.</p>
      ) : (
        <GovernedPlannerOutputs
          key={JSON.stringify([
            generation.objective.revision,
            generation.requestedSource,
          ])}
          objective={objective}
          client={client!}
          generation={generation}
          refreshGeneration={generationRead.reload}
        />
      )}
      {allowed && (
        <button
          className="button"
          type="button"
          onClick={generationRead.reload}
        >
          Refresh current Objective work
        </button>
      )}
    </section>
  );
}

function GovernedPlannerOutputs({
  objective,
  client,
  generation,
  refreshGeneration,
}: {
  objective: Objective;
  client: GovernedPlannerClient;
  generation: ReturnType<typeof requireCurrentGovernedPlannerGeneration>;
  refreshGeneration: () => void;
}) {
  const api = useCapiro();
  const router = useRouter();
  const request = currentGovernedPlannerRequest(objective, client);
  const outputRequest = selectCurrentGovernedObjectiveOutputs(
    generation,
    request,
  );
  const outputRead = useCapiroQuery(
    "objectives.governedOutputs.read",
    outputRequest,
  );
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const active = useRef<AbortController | null>(null);
  const scope = JSON.stringify([
    client.id,
    client.status,
    objective.clientId,
    objective.id,
    objective.version,
    objective.status,
  ]);
  const liveScope = useRef(scope);
  useLayoutEffect(() => {
    liveScope.current = scope;
  }, [scope]);
  useEffect(() => () => active.current?.abort(), [api, scope]);
  let received: ReturnType<typeof receiveCurrentGovernedPlannerRead> | null =
    null;
  if (outputRead.data) {
    try {
      received = receiveCurrentGovernedPlannerRead(
        outputRead.data,
        generation,
        objective,
        client,
      );
    } catch {
      // A changed source, stale observation, or partial result never supplies navigation.
    }
  }
  const project = received?.currentProject;
  async function open() {
    if (!project || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setOpening(true);
    setOpenError(false);
    try {
      const href = await reverifyCurrentGovernedPlannerProject(
        api,
        objective,
        client,
        project.selection.id,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      if (liveScope.current !== scope)
        throw new Error("The selected Objective changed.");
      router.push(href);
    } catch {
      if (!controller.signal.aborted) setOpenError(true);
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setOpening(false);
    }
  }
  return (
    <div className="stack">
      {outputRead.loading ? (
        <p role="status">Checking current Planner output.</p>
      ) : outputRead.error || !received ? (
        <p role="alert">Current Planner output could not be verified.</p>
      ) : project ? (
        <>
          <p role="status">A current Planner project is available.</p>
          <p>{project.title ?? "Current Planner project"}</p>
          <button
            className="button primary"
            type="button"
            disabled={opening}
            onClick={() => void open()}
          >
            {opening ? "Rechecking project access." : "Open current project"}
          </button>
        </>
      ) : (
        <p role="status">
          {received.output.observation.state === "queued" ||
          received.output.observation.state === "running"
            ? "Current Planner work is in progress."
            : "No current Planner project is available."}
        </p>
      )}
      {openError && (
        <p role="alert">
          Project access could not be reverified. Refresh current work.
        </p>
      )}
      <button
        className="button"
        type="button"
        onClick={() => {
          outputRead.reload();
          refreshGeneration();
        }}
      >
        Refresh Planner status
      </button>
    </div>
  );
}
