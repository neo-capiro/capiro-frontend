"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import type { Question } from "@/shared/capiro/operations/objective-questions";
import type { Objective } from "../contracts";
import type { QuestionSession } from "./question-session";

function QuestionHistory({ objective, question }: { objective: Objective; question: Question }) {
  const [before, setBefore] = useState<number>();
  const query = useCapiroQuery("objectives.questions.history", {
    params: { clientId: objective.clientId, objectiveId: objective.id, questionId: question.id },
    query: { before },
  });
  const data =
    !query.loading &&
    !query.error &&
    query.data?.clientId === objective.clientId &&
    query.data.objectiveId === objective.id &&
    query.data.objectiveVersion === objective.version
      ? query.data
      : undefined;
  return (
    <section aria-label="Question history">
      <h4>Version history</h4>
      {query.loading && <p role="status">Loading history…</p>}
      {(query.error || (!query.loading && !data)) && (
        <p role="alert">History is unavailable. Refresh the Objective and try again.</p>
      )}
      {data?.items.map((row) => (
        <article key={row.question.version}>
          <p>
            Version {row.question.version} · {row.action} ·{" "}
            {new Date(row.committedAt).toLocaleString()}
          </p>
          <p>Actor {row.actorUserId}</p>
          {row.question.answer && <p>{row.question.answer}</p>}
          {row.question.evidenceNote && <p>Evidence note: {row.question.evidenceNote}</p>}
          <p>
            Objective context v{row.question.sourceObjectiveVersion}
            {row.question.stale ? " · Source has changed" : ""}
          </p>
        </article>
      ))}
      {data?.nextCursor && (
        <button className="button" onClick={() => setBefore(data.nextCursor!)}>
          Older versions
        </button>
      )}
      {before && (
        <button className="button" onClick={() => setBefore(undefined)}>
          Latest versions
        </button>
      )}
    </section>
  );
}

export function QuestionCard({
  question,
  disabled,
  objective,
  session,
}: {
  question: Question;
  disabled: boolean;
  objective: Objective;
  session: QuestionSession;
}) {
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState(false);
  const common = {
    questionId: question.id,
    expectedVersion: question.version,
    expectedObjectiveVersion: objective.version,
  };
  return (
    <article className="card stack" aria-label={question.title}>
      <h3>{question.title}</h3>
      <p>
        {question.status} · Version {question.version} · Objective context v
        {question.sourceObjectiveVersion}
      </p>
      {question.stale && (
        <p role="status">
          {question.status === "open"
            ? "The Objective has changed. Review its current context before saving an answer."
            : "The Objective has changed. Reopen this answer and review the current context before closing it."}
        </p>
      )}
      {question.answer && <p>{question.answer}</p>}
      {question.evidenceNote && (
        <p>
          <strong>Evidence note:</strong> {question.evidenceNote}
        </p>
      )}
      {question.status === "open" && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void session.execute({ ...common, action: "answer", answer, evidenceNote: note });
          }}
        >
          <label>
            Answer
            <textarea
              value={answer}
              maxLength={8000}
              required
              disabled={disabled}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>
          <label>
            Evidence note about this Objective’s saved context
            <textarea
              value={note}
              maxLength={4000}
              required
              disabled={disabled}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button
            className="button"
            type="submit"
            disabled={disabled || !answer.trim() || !note.trim()}
          >
            Save answer against Objective v{objective.version}
          </button>
        </form>
      )}
      {question.status === "answered" && (
        <button
          className="button"
          disabled={disabled || question.stale}
          onClick={() => void session.execute({ ...common, action: "close" })}
        >
          Close question
        </button>
      )}
      {question.status !== "open" && (
        <button
          className="button"
          disabled={disabled}
          onClick={() => void session.execute({ ...common, action: "reopen" })}
        >
          Reopen for review
        </button>
      )}
      <button className="button" onClick={() => setHistory(!history)}>
        {history ? "Hide history" : "View history"}
      </button>
      {history && (
        <QuestionHistory
          key={`${question.id}:${question.version}`}
          objective={objective}
          question={question}
        />
      )}
    </article>
  );
}
