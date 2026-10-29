"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  matchesTargetContext,
  type TargetContextRequest,
} from "@/shared/capiro/operations/target-context";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { TargetContextResults } from "./TargetContextItems";

export function TargetContextSection({
  clientId,
  targetId,
  section,
}: {
  clientId: string;
  targetId: string;
  section: "objectives" | "steps";
}) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const after = cursors.at(-1);
  const input: TargetContextRequest = {
    params: { clientId, targetId },
    query: { section, ...(after ? { after } : {}) },
  };
  const query = useCapiroQuery("directory.targetContext", input);
  const mismatch = query.data && !matchesTargetContext(query.data, input);
  const error =
    query.error ??
    (mismatch
      ? new Error(
          "The target context did not match this selection. Reload to try again.",
        )
      : undefined);
  const page = !error && !query.loading ? query.data : undefined;
  const label =
    section === "objectives"
      ? "Objectives and asks"
      : "Strategy steps and actions";
  return (
    <section className="stack" aria-label={label}>
      <div className="row">
        <h4>{label}</h4>
        <button
          className="button"
          disabled={query.loading}
          onClick={() => {
            setCursors([undefined]);
            query.reload();
          }}
        >
          Refresh
        </button>
      </div>
      <QueryState pending={query.loading} error={error} retry={query.reload} />
      {page && <TargetContextResults page={page} pageNumber={cursors.length} />}
      <div className="row">
        {cursors.length > 1 && (
          <button
            className="button"
            disabled={query.loading}
            onClick={() => setCursors((previous) => previous.slice(0, -1))}
          >
            Previous page
          </button>
        )}
        {page?.nextCursor && (
          <button
            className="button"
            onClick={() =>
              setCursors((previous) => [...previous, page.nextCursor!])
            }
          >
            Next page
          </button>
        )}
      </div>
    </section>
  );
}
