"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import type {
  QuestionEvidenceSelector,
  QuestionEvidenceSnapshot,
} from "@/shared/capiro/operations/objective-question-evidence";
import type { Objective } from "../contracts";

function EvidenceResults({
  items,
  selected,
  onChange,
}: {
  items: QuestionEvidenceSnapshot[];
  selected: QuestionEvidenceSelector[];
  onChange: (selectors: QuestionEvidenceSelector[]) => void;
}) {
  return (
    <>
      {items.length === 0 && <p>No available sources match this page.</p>}
      {items.map((snapshot) => (
        <div key={snapshot.digest} className="card">
          <p>{snapshot.title}</p>
          <p>{snapshot.sourceSystem === "client_document" ? "Client document" : "Retained news"}</p>
          <button
            className="button"
            type="button"
            disabled={
              selected.length >= 8 ||
              selected.some((ref) =>
                ref.kind === "document" && snapshot.selector.kind === "document"
                  ? ref.attachmentId === snapshot.selector.attachmentId
                  : ref.kind === "news" &&
                    snapshot.selector.kind === "news" &&
                    ref.articleId === snapshot.selector.articleId,
              )
            }
            onClick={() => onChange([...selected, snapshot.selector])}
          >
            Review this source
          </button>
        </div>
      ))}
    </>
  );
}
/** Current source discovery; retained selections are reviewed separately. */
export function QuestionEvidenceChoices({
  objective,
  selected,
  onChange,
}: {
  objective: Objective;
  selected: QuestionEvidenceSelector[];
  onChange: (selectors: QuestionEvidenceSelector[]) => void;
}) {
  const [kind, setKind] = useState<"document" | "news">("document");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string>();
  const query = useCapiroQuery("objectives.questions.evidence.list", {
    params: { clientId: objective.clientId, objectiveId: objective.id },
    query: { kind, search, cursor },
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
    <div className="stack">
      <label>
        Source type
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setCursor(undefined);
          }}
        >
          <option value="document">Client documents</option>
          <option value="news">Retained news</option>
        </select>
      </label>
      <label>
        Find a source
        <input
          value={search}
          maxLength={200}
          onChange={(event) => {
            setSearch(event.target.value);
            setCursor(undefined);
          }}
        />
      </label>
      <button className="button" type="button" onClick={query.reload}>
        Refresh sources
      </button>
      {query.loading && <p role="status">Loading sources…</p>}
      {!query.loading && !data && (
        <p role="alert">Sources are unavailable for the current Objective.</p>
      )}
      {data && <EvidenceResults items={data.items} selected={selected} onChange={onChange} />}
      {data?.nextCursor && (
        <button className="button" type="button" onClick={() => setCursor(data.nextCursor!)}>
          Next sources
        </button>
      )}
      {cursor && (
        <button className="button" type="button" onClick={() => setCursor(undefined)}>
          First sources
        </button>
      )}
    </div>
  );
}
