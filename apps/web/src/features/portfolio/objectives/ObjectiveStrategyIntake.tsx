"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { currentClientWriter } from "@/shared/portfolio/auth/client-writer";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { strategyTypes } from "@/shared/capiro/operations/strategies-schemas";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import type { Client } from "@/shared/session/client-contract";
import type { Objective } from "./contracts";
import { createStrategyIntakeRecovery } from "./objective-strategy-intake-recovery";
import { ObjectiveStrategyIntakeSession } from "./objective-strategy-intake-session";

/** The qualified Core intake still lacks positive serving authority and a reviewed preview write route. */
export const governedStrategyIntakeEnabled = false;

export function ObjectiveStrategyIntake({
  objective,
  disabled,
}: {
  objective: Objective;
  disabled: boolean;
}) {
  const cache = useQueryClient();
  const identity = useIdentity();
  const selected = useSelectedClient();
  const actor = currentClientWriter(cache);
  const client =
    selected.state === "authorized-client" ? selected.client : null;
  if (
    !actor ||
    identity.data?.role !== "standard_user" ||
    !client ||
    client.id !== objective.clientId ||
    client.status !== "active"
  )
    return (
      <section className="card stack" aria-label="Governed Strategy intake">
        <h3>Strategy intake</h3>
        <p>
          {identity.isFetching
            ? "Verifying your current session."
            : "Save a ready Objective in your selected active client to request Strategy intake."}
        </p>
      </section>
    );
  return (
    <ReadyStrategyIntake
      key={JSON.stringify([
        actor.tenantId,
        actor.userId,
        client.id,
        objective.id,
        objective.version,
      ])}
      objective={objective}
      client={client}
      actor={actor}
      disabled={disabled}
    />
  );
}

function ReadyStrategyIntake({
  objective,
  client,
  actor,
  disabled,
}: {
  objective: Objective;
  client: Client;
  actor: { tenantId: string; userId: string };
  disabled: boolean;
}) {
  const api = useCapiro();
  const core = useApi();
  const cache = useQueryClient();
  const selectId = useId();
  const [selectedType, setSelectedType] = useState("");
  const session = useMemo(() => {
    const selectedObjective = {
      clientId: objective.clientId,
      id: objective.id,
      status: objective.status,
      version: objective.version,
    };
    const selectedClient = { id: client.id, status: client.status };
    const recovery = createStrategyIntakeRecovery(
      core,
      cache,
      { tenantId: actor.tenantId, userId: actor.userId },
      selectedObjective,
      () => ({ objective: selectedObjective, client: selectedClient }),
    );
    return new ObjectiveStrategyIntakeSession(
      api,
      selectedObjective,
      selectedClient,
      recovery,
    );
  }, [
    api,
    core,
    cache,
    actor.tenantId,
    actor.userId,
    objective.clientId,
    objective.id,
    objective.version,
    objective.status,
    client.id,
    client.status,
  ]);
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  useLayoutEffect(() => {
    queueMicrotask(() => void session.hydrate());
    return () => session.suspend();
  }, [session]);
  const retained = state.retained;
  const type = retained?.request.body.selection.type ?? selectedType;
  const locked =
    disabled ||
    state.busy ||
    !state.ready ||
    (!retained && !state.newSourceVerified) ||
    (!retained && objective.status !== "ready");
  return (
    <section className="card stack" aria-label="Governed Strategy intake">
      <h3>Strategy intake</h3>
      <p>
        Request initial consent and reserve work from saved Objective version{" "}
        {objective.version}.
      </p>
      {(disabled || (!retained && objective.status !== "ready")) && (
        <p>
          Save the Objective and discard unsaved changes before requesting
          intake.
        </p>
      )}
      <label htmlFor={selectId}>Strategy type</label>
      <select
        id={selectId}
        className="input"
        value={type}
        disabled={disabled || state.busy || Boolean(retained)}
        onChange={(event) => setSelectedType(event.target.value)}
      >
        <option value="">Choose a Strategy type</option>
        {strategyTypes.map((value) => (
          <option key={value} value={value}>
            {value[0]!.toUpperCase() + value.slice(1)}
          </option>
        ))}
      </select>
      {retained?.accepted ? (
        <p role="status">
          Consent and a reserved Strategy intake job were recorded. Refresh
          current work to check progress; a Strategy output is not yet verified.
        </p>
      ) : retained ? (
        <p role="status">
          The saved request outcome is unconfirmed. Recover this same request;
          its Strategy type and request IDs cannot change.
        </p>
      ) : (
        <p>
          Core will check current membership, Objective source, and work
          custody.
        </p>
      )}
      {!retained?.accepted && (
        <button
          className="button primary"
          type="button"
          disabled={locked || !type}
          onClick={() =>
            void session.submit(type as (typeof strategyTypes)[number])
          }
        >
          {state.busy
            ? "Checking Strategy intake."
            : retained
              ? "Recover same Strategy request"
              : "Request Strategy intake"}
        </button>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      <button
        className="button"
        type="button"
        disabled={disabled || state.busy}
        onClick={() => void session.refresh()}
      >
        Refresh current Strategy work
      </button>
    </section>
  );
}
