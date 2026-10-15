"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { strategyTypes } from "@/shared/capiro/operations/strategies-schemas";
import { objectiveGenerationHref } from "@/shared/capiro/operations/objective-generation";
import {
  ObjectiveGenerationSession,
  type GenerationState,
} from "./objective-generation-session";
import { createGenerationRecovery } from "./objective-generation-recovery";
import type { Objective } from "./contracts";

export function ObjectiveGeneration({
  objective,
  disabled,
}: {
  objective: Objective;
  disabled: boolean;
}) {
  const cache = useQueryClient(),
    identity = useIdentity();
  const actor = currentClientWriter(cache);
  if (!actor)
    return (
      <section
        className="card stack"
        aria-label="Generate Strategy from Objective"
      >
        <h3>Generate a Strategy</h3>
        <p>
          {identity.isFetching
            ? "Verifying your current session…"
            : "Your current session cannot generate a Strategy for this client."}
        </p>
      </section>
    );
  return (
    <ReadyGeneration
      key={JSON.stringify([actor.tenantId, actor.userId])}
      objective={objective}
      disabled={disabled}
      actor={actor}
    />
  );
}
function useGenerationSession({
  objective,
  disabled,
  actor,
}: {
  objective: Objective;
  disabled: boolean;
  actor: ClientWriter;
}) {
  const api = useApi(),
    cache = useQueryClient();
  const session = useMemo(
    () =>
      new ObjectiveGenerationSession(
        api,
        objective,
        createGenerationRecovery(api, cache, actor, objective),
      ),
    [
      api,
      cache,
      actor.userId,
      actor.tenantId,
      objective.clientId,
      objective.id,
      objective.version,
    ],
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  const polls = useRef({ jobId: "", count: 0 });
  const accepted = state.accepted;
  const locked = disabled || objective.status !== "ready";
  const pending =
    accepted?.status === "queued" || accepted?.status === "running";
  useLayoutEffect(() => {
    if (locked) {
      session.suspend();
      return;
    }
    let current = true;
    queueMicrotask(() => {
      if (current) void session.hydrate();
    });
    return () => {
      current = false;
      session.suspend();
    };
  }, [locked, session]);
  useEffect(() => {
    if (!accepted || !pending || state.busy || state.error || locked) return;
    if (polls.current.jobId !== accepted.jobId)
      polls.current = { jobId: accepted.jobId, count: 0 };
    if (polls.current.count >= 120) return;
    const timer = setTimeout(() => {
      polls.current.count++;
      void session.refresh();
    }, 2500);
    return () => clearTimeout(timer);
  }, [accepted, pending, state.busy, state.error, locked, session]);
  return { session, state, locked };
}
function ReadyGeneration(props: {
  objective: Objective;
  disabled: boolean;
  actor: ClientWriter;
}) {
  const { session, state, locked } = useGenerationSession(props);
  const { objective } = props;
  const selectId = useId();
  const [selectedType, setSelectedType] = useState("");
  const { request, accepted } = state;
  const type = request?.type ?? selectedType;
  return (
    <section
      className="card stack"
      aria-label="Generate Strategy from Objective"
    >
      <h3>Generate a Strategy</h3>
      <p>
        Use saved Objective version {objective.version} and its authorized
        government relationship context.
      </p>
      {locked && (
        <p>
          Save a ready Objective and discard unsaved editor changes before
          generating.
        </p>
      )}
      <GenerationTypeSelect
        selectId={selectId}
        type={type}
        disabled={locked || !state.ready || state.busy || !!request}
        onChange={setSelectedType}
      />
      {!accepted && (
        <button
          className="button primary"
          type="button"
          disabled={locked || !state.ready || state.busy || !type}
          onClick={() =>
            void session.submit(type as (typeof strategyTypes)[number])
          }
        >
          {state.busy
            ? "Submitting request…"
            : request
              ? "Recover same request"
              : "Generate Strategy"}
        </button>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {!state.ready && !locked && (
        <button
          className="button"
          type="button"
          disabled={state.busy}
          onClick={() => void session.hydrate()}
        >
          Verify saved request recovery
        </button>
      )}
      {request && (
        <small>
          Request: {request.requestId}. Closing this view does not cancel the
          saved job.
        </small>
      )}
      {accepted && !state.verified && state.busy && (
        <p role="status">Verifying the current saved generation…</p>
      )}
      <GenerationOutcome
        state={state}
        session={session}
        locked={locked}
        clearType={() => setSelectedType("")}
      />
      {accepted && (
        <button
          className="button"
          type="button"
          disabled={locked || state.busy}
          onClick={() => void session.refresh()}
        >
          Refresh generation status
        </button>
      )}
    </section>
  );
}

function GenerationOutcome({
  state,
  session,
  locked,
  clearType,
}: {
  state: GenerationState;
  session: ObjectiveGenerationSession;
  locked: boolean;
  clearType: () => void;
}) {
  const visible = state.verified && !locked ? state.accepted : undefined;
  const receipt = visible?.objectiveGeneration;
  const pending = visible?.status === "queued" || visible?.status === "running";
  return (
    <>
      {visible && (
        <>
          <p role="status">Generation {visible.status}.</p>
          {pending && (
            <p>
              {state.job?.progressText ??
                "Waiting for the saved Strategy receipt."}
            </p>
          )}
          {receipt && (
            <>
              <p>Context coverage: {receipt.context.state}.</p>
              {receipt.context.compiledAt && (
                <p>Compiled: {receipt.context.compiledAt}</p>
              )}
              {receipt.context.reobservedAt && (
                <p>
                  Rechecked: {receipt.context.reobservedAt}. History reflects
                  these observations.
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
            </>
          )}
          {visible.status === "completed" && !state.error && !locked && (
            <Link
              className="button primary"
              href={objectiveGenerationHref(visible)}
            >
              Open generated Strategy receipt
            </Link>
          )}
          {session.canReset() && (
            <button
              className="button"
              type="button"
              disabled={locked}
              onClick={() => {
                void session.reset();
                clearType();
              }}
            >
              Start another Strategy request
            </button>
          )}
        </>
      )}
    </>
  );
}

function GenerationTypeSelect({
  selectId,
  type,
  disabled,
  onChange,
}: {
  selectId: string;
  type: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label htmlFor={selectId}>Strategy type</label>
      <select
        id={selectId}
        className="input"
        value={type}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose a Strategy type</option>
        {strategyTypes.map((value) => (
          <option key={value} value={value}>
            {value[0]!.toUpperCase() + value.slice(1)}
          </option>
        ))}
      </select>
    </>
  );
}
