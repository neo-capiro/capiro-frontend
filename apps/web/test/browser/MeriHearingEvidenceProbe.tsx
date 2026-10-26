import { useState } from "react";
import type { HearingSourceReadResponse } from "@capiro/meri-contracts/conversation-sources";
import { HearingSourceDetail } from "../../src/features/meri/conversation/evidence/HearingSourceDetail";
import { SourceReadState } from "../../src/features/meri/conversation/evidence/SourceReadState";
import records from "../../tests/meri-hearing-source-fixtures.json";

/** Presentation-only synthetic probe; it does not replace public receiving or live authority. */
export function MeriHearingEvidenceProbe() {
  const [selection, setSelection] = useState("published");
  const fixtures = records as Record<
    keyof typeof records,
    HearingSourceReadResponse
  >;
  const value = Object.entries(fixtures).find(
    ([name]) => name === selection,
  )?.[1];
  return (
    <>
      <header className="probe-controls">
        <h1>Synthetic hearing evidence</h1>
        <label>
          Example{" "}
          <select
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
          >
            {[
              ...Object.keys(fixtures),
              "loading",
              "denied",
              "stale",
              "unavailable",
            ].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </header>
      <main data-testid="hearing-detail">
        {value ? (
          <HearingSourceDetail key={selection} value={value} />
        ) : (
          <SourceReadState
            loading={selection === "loading"}
            error={
              selection === "denied"
                ? "ACCESS_DENIED"
                : selection === "stale"
                  ? "SOURCE_REFERENCE_STALE"
                  : "SOURCE_REFERENCE_UNAVAILABLE"
            }
            reload={() => setSelection("published")}
            title="Hearing record"
            page="hearing record"
          />
        )}
      </main>
    </>
  );
}
