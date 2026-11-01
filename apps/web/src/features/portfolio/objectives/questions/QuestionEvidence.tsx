"use client";
import { useEffect } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  questionEvidenceReference,
  type QuestionEvidenceSelector,
  type QuestionEvidenceSnapshot,
} from "@/shared/capiro/operations/objective-question-evidence";
import type { Question } from "@/shared/capiro/operations/objective-questions";
import type { Objective } from "../contracts";
import { QuestionDocumentSource } from "./QuestionDocumentSource";
import { QuestionEvidenceChoices } from "./QuestionEvidenceChoices";

export function Citation({
  snapshot,
  objective,
  question,
}: {
  snapshot: QuestionEvidenceSnapshot;
  objective: Objective;
  question?: Question;
}) {
  return (
    <div className="stack">
      <strong>{snapshot.title}</strong>
      <p>
        {snapshot.sourceSystem === "client_document"
          ? "Client document version"
          : "Retained news observation"}{" "}
        · {snapshot.rights.replaceAll("_", " ")}
      </p>
      <p>Source version {snapshot.version}</p>
      {snapshot.observedAt && <p>Observed {new Date(snapshot.observedAt).toLocaleString()}</p>}
      {snapshot.summary && <p>{snapshot.summary}</p>}
      {!snapshot.complete && <p>This citation does not contain the complete source text.</p>}
      {snapshot.selector.kind === "document" && (
        <QuestionDocumentSource objective={objective} snapshot={snapshot} question={question} />
      )}
      {snapshot.sourceUrl && (
        <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
          Open publisher source
        </a>
      )}
    </div>
  );
}
export function QuestionEvidence({
  question,
  objective,
}: {
  question: Question;
  objective: Objective;
}) {
  if (question.evidenceState === "unavailable")
    return (
      <p role="status">
        Cited evidence is unavailable. The answer and evidence note are withheld until current
        source access can be verified.
      </p>
    );
  return (
    <div className="stack">
      {question.evidenceState === "stale" && (
        <p role="status">
          Cited evidence has changed. Reopen and review current sources before closing.
        </p>
      )}
      {question.evidenceRefs?.map((snapshot) => (
        <Citation
          key={snapshot.digest}
          snapshot={snapshot}
          objective={objective}
          question={question}
        />
      ))}
    </div>
  );
}
function SelectedCitation({
  objective,
  selector,
  onReady,
}: {
  objective: Objective;
  selector: QuestionEvidenceSelector;
  onReady: (selector: QuestionEvidenceSelector, ready: boolean) => void;
}) {
  const query = useCapiroQuery("objectives.questions.evidence.preview", {
    params: { clientId: objective.clientId, objectiveId: objective.id },
    body: { reference: questionEvidenceReference(selector) },
  });
  const snapshot =
    !query.loading &&
    !query.error &&
    query.data?.clientId === objective.clientId &&
    query.data.objectiveId === objective.id &&
    query.data.objectiveVersion === objective.version &&
    query.data.snapshot.digest === selector.expectedDigest
      ? query.data.snapshot
      : undefined;
  useEffect(() => {
    onReady(selector, Boolean(snapshot));
  }, [snapshot, selector, onReady]);
  return (
    <div className="card stack">
      {snapshot ? (
        <Citation snapshot={snapshot} objective={objective} />
      ) : (
        <p role="status">
          {query.loading
            ? "Checking selected evidence…"
            : "Selected evidence changed or is unavailable. Remove it and review a current source."}
        </p>
      )}
      <button
        className="button"
        type="button"
        onClick={() => {
          onReady(selector, false);
          query.reload();
        }}
      >
        Recheck selected source
      </button>
    </div>
  );
}
export function QuestionEvidencePicker({
  objective,
  disabled,
  selected,
  onChange,
  onReady,
}: {
  objective: Objective;
  disabled: boolean;
  selected: QuestionEvidenceSelector[];
  onChange: (selectors: QuestionEvidenceSelector[]) => void;
  onReady: (selector: QuestionEvidenceSelector, ready: boolean) => void;
}) {
  return (
    <fieldset disabled={disabled} className="stack">
      <legend>Supporting sources (optional, up to 8)</legend>
      <p>
        Choose client document versions or retained news observations. Your note remains an editor's
        explanation.
      </p>
      {selected.map((selector) => (
        <div key={JSON.stringify(selector)}>
          <SelectedCitation objective={objective} selector={selector} onReady={onReady} />
          <button
            className="button"
            type="button"
            onClick={() => onChange(selected.filter((ref) => ref !== selector))}
          >
            Remove citation
          </button>
        </div>
      ))}
      <QuestionEvidenceChoices objective={objective} selected={selected} onChange={onChange} />
    </fieldset>
  );
}
