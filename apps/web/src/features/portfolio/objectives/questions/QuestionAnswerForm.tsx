"use client";
import { useState } from "react";
import type { Question } from "@/shared/capiro/operations/objective-questions";
import type { QuestionEvidenceSelector } from "@/shared/capiro/operations/objective-question-evidence";
import type { Objective } from "../contracts";
import type { QuestionSession } from "./question-session";
import { QuestionEvidencePicker } from "./QuestionEvidence";

export function QuestionAnswerForm({
  question,
  objective,
  session,
  disabled,
}: {
  question: Question;
  objective: Objective;
  session: QuestionSession;
  disabled: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<QuestionEvidenceSelector[]>([]);
  const [sourceReady, setSourceReady] = useState<Record<string, boolean>>({});
  const blocked = disabled || selected.some((ref) => !sourceReady[JSON.stringify(ref)]);
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (blocked) return;
        void session.execute({
          questionId: question.id,
          expectedVersion: question.version,
          expectedObjectiveVersion: objective.version,
          action: "answer",
          answer,
          evidenceNote: note,
          ...(selected.length ? { evidenceRefs: selected } : {}),
        });
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
        Evidence note
        <textarea
          value={note}
          maxLength={4000}
          required
          disabled={disabled}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <QuestionEvidencePicker
        objective={objective}
        disabled={disabled}
        selected={selected}
        onReady={(selector, ready) =>
          setSourceReady((current) =>
            current[JSON.stringify(selector)] === ready
              ? current
              : { ...current, [JSON.stringify(selector)]: ready },
          )
        }
        onChange={(selectors) => {
          setSourceReady({});
          setSelected(selectors);
        }}
      />
      <button className="button" type="submit" disabled={blocked || !answer.trim() || !note.trim()}>
        Save answer against Objective v{objective.version}
      </button>
    </form>
  );
}
