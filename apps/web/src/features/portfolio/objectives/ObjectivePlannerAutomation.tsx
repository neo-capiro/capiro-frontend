"use client";
import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import type { SavedStrategySelection } from "@/shared/capiro/operations/objective-saved-review";
import { requireSavedGenerationDiscovery } from "@/shared/capiro/operations/objective-saved-generation";
import { createPlannerConsentRecovery } from "./objective-planner-consent-recovery";
import { ObjectivePlannerConsentSession } from "./objective-planner-consent-session";
import { ObjectiveGovernedPlanner } from "./ObjectiveGovernedPlanner";

export function ObjectivePlannerAutomation({
  selection,
}: {
  selection: SavedStrategySelection;
}) {
  const stableSelection = useMemo(
    () => selection,
    [
      selection.query.clientId,
      selection.query.objectiveId,
      selection.query.objectiveVersion,
      selection.ids.strategyId,
      selection.ids.strategyVersionId,
      selection.ids.generatedJobId,
    ],
  );
  const cache = useQueryClient();
  useIdentity();
  const actor = currentClientWriter(cache),
    selected = useSelectedClient();
  if (
    !actor ||
    selected.state !== "authorized-client" ||
    selected.client.id !== selection.query.clientId ||
    selected.client.status === "archived"
  )
    return (
      <p>Verify your current client and session to prepare Planner work.</p>
    );
  return (
    <PlannerAutomation
      key={JSON.stringify([actor.tenantId, actor.userId, selection])}
      selection={stableSelection}
      actor={actor}
    />
  );
}
function PlannerAutomation({
  selection,
  actor,
}: {
  selection: SavedStrategySelection;
  actor: ClientWriter;
}) {
  const api = useCapiro(),
    core = useApi(),
    cache = useQueryClient();
  const q = selection.query;
  const session = useMemo(
    () =>
      new ObjectivePlannerConsentSession(
        {
          saved: async (signal) => {
            const discovery = requireSavedGenerationDiscovery(
              await api.request(
                "strategies.objectiveSavedGeneration",
                { query: selection.query },
                { signal },
              ),
              selection.query,
            );
            if (
              discovery.selection.ids.generatedJobId !==
                selection.ids.generatedJobId ||
              discovery.selection.ids.strategyId !== selection.ids.strategyId ||
              discovery.selection.ids.strategyVersionId !==
                selection.ids.strategyVersionId
            )
              throw new Error(
                "The canonical saved Strategy changed. Reload the Objective.",
              );
            return api.request(
              "strategies.objectiveSavedReview",
              {
                params: { id: selection.ids.strategyId },
                query: {
                  ...selection.query,
                  generationJobId: selection.ids.generatedJobId,
                  strategyVersionId: selection.ids.strategyVersionId,
                },
              },
              { signal },
            );
          },
          generation: (requestId, signal) =>
            api.request(
              "objectives.governedGeneration.read",
              {
                params: { clientId: q.clientId, objectiveId: q.objectiveId },
                query: {
                  workAction: "objective.plan.prepare",
                  ...(requestId ? { requestId } : {}),
                },
              },
              { signal },
            ),
          command: (request, signal) =>
            api.request("objectives.plannerConsent", request, { signal }),
        },
        createPlannerConsentRecovery(core, cache, actor, selection),
        selection,
      ),
    [api, core, cache, actor.tenantId, actor.userId, selection],
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  useLayoutEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) void session.refresh();
    });
    return () => {
      current = false;
      session.suspend();
    };
  }, [session]);
  return (
    <section className="card stack" aria-label="Objective Automation">
      <h3>Prepare Planner</h3>
      <p>
        Authorize Planner to prepare work from this exact saved Strategy. This
        is separate from Strategy generation consent.
      </p>
      <p>
        Planner checks the saved steps, dependencies and dates, preserves human
        edits during regeneration, and reports the actual result below.
      </p>
      {state.busy && (
        <p role="status">Verifying the original Planner consent.</p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {!state.error && !state.busy && state.retained?.receipt ? (
        <p role="status">
          Planner consent recorded. This receipt is not proof that the plan has
          been applied. Closing this page does not cancel authorized work.
        </p>
      ) : (
        <button
          type="button"
          className="button primary"
          disabled={state.busy || (!state.ready && !state.retained)}
          onClick={() => void session.execute()}
        >
          {state.retained
            ? "Recover same Planner consent"
            : "Authorize and prepare Planner"}
        </button>
      )}
      <button
        type="button"
        className="button"
        disabled={state.busy}
        onClick={() => void session.refresh()}
      >
        Refresh consent and result
      </button>
      <ObjectiveGovernedPlanner
        key={state.revision}
        objective={{
          clientId: q.clientId,
          id: q.objectiveId,
          version: q.objectiveVersion,
          status: "ready",
        }}
        disabled={state.busy}
      />
    </section>
  );
}
