"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter, currentClientWriter } from "@/shared/portfolio/auth/client-writer";
import { useSelectedClient } from "@/shared/session/SelectedClient";
import type { Objective } from "../contracts";
import { QuestionSession } from "./question-session";
import { QuestionCard } from "./QuestionCard";

function CurrentQuestions({
  objective,
  actor,
  canEdit,
  onReloadObjective,
}: {
  objective: Objective;
  actor: { tenantId: string; userId: string };
  canEdit: boolean;
  onReloadObjective: () => void;
}) {
  const api = useCapiro();
  const cache = useQueryClient();
  const selected = useSelectedClient();
  const live = useRef({ selected, objective });
  live.current = { selected, objective };
  const session = useMemo(
    () =>
      new QuestionSession(
        api,
        actor,
        { clientId: objective.clientId, objectiveId: objective.id },
        () => {
          assertClientWriter(cache, actor);
          const current = live.current;
          if (
            current.selected.state !== "authorized-client" ||
            current.selected.client.id !== objective.clientId ||
            current.selected.client.status === "archived" ||
            current.objective.id !== objective.id
          )
            throw Error("The selected Objective or session changed.");
        },
      ),
    [api, cache, actor.tenantId, actor.userId, objective.clientId, objective.id],
  );
  const state = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"open" | "answered" | "closed" | "">("");
  const [after, setAfter] = useState<string>();
  const query = useCapiroQuery("objectives.questions.list", {
    params: { clientId: objective.clientId, objectiveId: objective.id },
    query: { after, status: status || undefined },
  });
  const data =
    !query.loading &&
    !query.error &&
    query.data?.clientId === objective.clientId &&
    query.data.objectiveId === objective.id &&
    query.data.objectiveVersion === objective.version
      ? query.data
      : undefined;
  const disabled = !canEdit || !data || !state.ready || state.busy || !!state.retained;
  useEffect(() => {
    void session.hydrate();
  }, [session]);
  const receipt = state.retained?.receipt;
  const refusal = state.retained?.refusal;
  useEffect(() => {
    if (receipt || refusal) query.reload();
  }, [receipt, refusal]);
  return (
    <section className="card stack" aria-label="Objective questions">
      <h2>Objective questions</h2>
      <p>
        Answers retain the saved Objective context and an editor’s evidence note. You can also cite
        client document versions or retained news observations; changed evidence requires review
        again.
      </p>
      {data && (
        <p>
          {data.openCount} open · {data.total} total
        </p>
      )}
      <label>
        Show
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setAfter(undefined);
          }}
        >
          <option value="">All questions</option>
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
        </select>
      </label>
      <button
        className="button"
        onClick={() => {
          setAfter(undefined);
          query.reload();
        }}
      >
        Refresh questions
      </button>
      {query.loading && <p role="status">Loading questions…</p>}
      {(query.error || (!query.loading && !data)) && (
        <div role="alert">
          <p>Questions are unavailable or the Objective has changed.</p>
          <button className="button" onClick={onReloadObjective}>
            Reload Objective
          </button>
        </div>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {!state.ready && !state.busy && (
        <button className="button" onClick={() => void session.hydrate()}>
          Check command recovery
        </button>
      )}
      {state.retained && (
        <aside className="card stack" aria-label="Original Question command">
          <p>
            {receipt
              ? `Saved Question version ${receipt.question.version}.`
              : refusal
                ? "The original command was refused without changes. Review the current Question before another action."
                : "The original command outcome is unverified. Recover or retry this same request; do not start a replacement."}
          </p>
          {!receipt && !refusal && (
            <>
              <button
                className="button"
                disabled={state.busy}
                onClick={() => void session.recover()}
              >
                Recover original outcome
              </button>
              <button className="button" disabled={state.busy} onClick={() => void session.retry()}>
                Retry original command
              </button>
            </>
          )}
          {(receipt || refusal) && (
            <button
              className="button"
              disabled={state.busy}
              onClick={() => {
                void session.acknowledge().then(() => {
                  setTitle("");
                  query.reload();
                });
              }}
            >
              Acknowledge and continue
            </button>
          )}
        </aside>
      )}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void session.execute({
            action: "create",
            questionId: crypto.randomUUID(),
            expectedVersion: 0,
            expectedObjectiveVersion: objective.version,
            title,
          });
        }}
      >
        <label>
          New question
          <textarea
            value={title}
            maxLength={2000}
            required
            disabled={disabled}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button className="button" type="submit" disabled={disabled || !title.trim()}>
          Create question
        </button>
      </form>
      {data?.items.length === 0 && <p>No questions match this view.</p>}
      {data?.items.map((question) => (
        <QuestionCard
          key={`${question.id}:${question.version}`}
          question={question}
          objective={objective}
          session={session}
          disabled={disabled}
        />
      ))}
      {data?.nextCursor && (
        <button className="button" onClick={() => setAfter(data.nextCursor!)}>
          Next questions
        </button>
      )}
      {after && (
        <button className="button" onClick={() => setAfter(undefined)}>
          First page
        </button>
      )}
    </section>
  );
}

export function ObjectiveQuestionsPanel(props: {
  objective: Objective;
  canEdit: boolean;
  onReloadObjective: () => void;
}) {
  const cache = useQueryClient();
  const identity = useIdentity();
  const selected = useSelectedClient();
  const actor = currentClientWriter(cache);
  if (
    !actor ||
    selected.state !== "authorized-client" ||
    selected.client.id !== props.objective.clientId ||
    selected.client.status === "archived"
  )
    return (
      <section className="card" aria-label="Objective questions">
        <h2>Objective questions</h2>
        <p>
          {identity.isFetching
            ? "Checking current access…"
            : "Questions are unavailable for the current session or client."}
        </p>
      </section>
    );
  return (
    <CurrentQuestions
      key={JSON.stringify([
        actor.tenantId,
        actor.userId,
        props.objective.clientId,
        props.objective.id,
      ])}
      {...props}
      actor={actor}
    />
  );
}
