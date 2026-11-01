"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  requireSavedObjectiveCitations,
  type requireSavedStrategyReview,
} from "../../../shared/capiro/operations/objective-saved-review";

export function ObjectiveSavedCitations({
  saved,
}: {
  saved: ReturnType<typeof requireSavedStrategyReview>;
}) {
  const [open, setOpen] = useState(false);
  const s = saved.source;
  const read = useCapiroQuery(
    "strategies.objectiveSavedCitations",
    {
      params: { id: s.strategyId },
      query: {
        clientId: s.clientId,
        objectiveId: s.objectiveId,
        objectiveVersion: s.objectiveVersion,
        generationJobId: s.generationJobId,
        strategyVersionId: s.strategyVersionId,
      },
    },
    { enabled: open },
  );
  let result: ReturnType<typeof requireSavedObjectiveCitations> | undefined;
  let unavailable = !!read.error;
  if (open && !read.loading && !unavailable && read.data) {
    try {
      result = requireSavedObjectiveCitations(read.data, saved);
    } catch {
      unavailable = true;
    }
  }
  return (
    <section aria-label="Saved Strategy sources">
      <button
        type="button"
        className="button"
        onClick={() => {
          setOpen(true);
          if (open) read.reload();
        }}
        disabled={open && read.loading}
      >
        {open ? "Refresh saved sources" : "Review saved sources"}
      </button>
      {open && read.loading && (
        <p role="status">
          Checking current access to the originally cited sources.
        </p>
      )}
      {open && unavailable && (
        <p role="alert">Saved sources are unavailable. Retry this read.</p>
      )}
      {result && (
        <ul>
          {result.nodes.map((node) => (
            <li key={node.sourceNodeId}>
              <h4>
                {
                  saved.snapshot.nodes.find((n) => n.id === node.sourceNodeId)!
                    .title
                }
              </h4>
              {!node.citations.length && (
                <p>No source citation was saved for this step.</p>
              )}
              {node.citations.map((c) => (
                <Citation key={c.index} citation={c} />
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SavedCitation = ReturnType<
  typeof requireSavedObjectiveCitations
>["nodes"][number]["citations"][number];
function Citation({ citation: c }: { citation: SavedCitation }) {
  if (c.state !== "available")
    return (
      <div>
        <p>
          {c.state === "changed"
            ? "This source changed after generation. The original excerpt is unavailable; current content has not replaced it."
            : "This saved source is unavailable."}
        </p>
        {c.state === "changed" && (
          <p>Original source version witness: {c.version}</p>
        )}
      </div>
    );
  const originalAsOf = new Date(c.asOfMs).toISOString();
  return (
    <div>
      <h5>{c.title}</h5>
      {!c.textComplete && (
        <p>
          Excerpt of the originally cited source; the full body exceeds this
          display limit.
        </p>
      )}
      {c.kind === "context_fact" && <p>Retained extracted fact</p>}
      <p style={{ whiteSpace: "pre-wrap" }}>{c.text}</p>
      <p>{c.locator}</p>
      <p>
        Original source observation:{" "}
        <time dateTime={originalAsOf}>
          {originalAsOf.replace("T", " ").replace(".000Z", " UTC")}
        </time>
      </p>
      <p>Source version witness: {c.version}</p>
      {c.kind === "reference_calendar" && (
        <p>
          This content digest identifies the selected calendar row, not an
          upstream revision.
        </p>
      )}
    </div>
  );
}
