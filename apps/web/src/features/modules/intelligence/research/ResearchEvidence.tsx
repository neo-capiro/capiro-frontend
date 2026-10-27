"use client";
import { useState, type ReactNode } from "react";
import type { z } from "zod";
import type { evidence } from "../../../../shared/capiro/operations/defense-research-schemas";
import type { referenceOccurrence } from "../../../../shared/capiro/operations/defense-evidence";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "../../../../shared/module-ui";
import { EvidenceCoordinates } from "./EvidenceCoordinates";
type Evidence = z.infer<typeof evidence>;
export function SourceLink({
  url,
  children = "Open source",
}: {
  url: string | null;
  children?: ReactNode;
}) {
  let safe = false;
  try {
    safe = Boolean(url && ["https:", "http:"].includes(new URL(url).protocol));
  } catch {
    /* Unavailable source link. */
  }
  return safe ? (
    <a href={url!} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <span>Source link unavailable</span>
  );
}
export function sameEvidence(expected: Evidence, actual: Evidence) {
  return (
    actual.evidenceRefId === expected.evidenceRefId &&
    ["sourceDocumentId", "sourceRevisionId", "contentHash"].every((key) => {
      const field = key as
        | "sourceDocumentId"
        | "sourceRevisionId"
        | "contentHash";
      return expected[field] === null || actual[field] === expected[field];
    }) &&
    actual.nativeLocator.page === expected.nativeLocator.page &&
    actual.nativeLocator.section === expected.nativeLocator.section &&
    actual.nativeLocator.occurrenceId === expected.nativeLocator.occurrenceId &&
    (!expected.nativeLocator.details ||
      (
        [
          "printedPage",
          "tableLabel",
          "rowLabel",
          "columnLabel",
          "textSpan",
          "boundingBox",
          "structuredElement",
          "sourceSpanHash",
        ] as const
      ).every(
        (field) =>
          JSON.stringify(expected.nativeLocator.details?.[field]) ===
          JSON.stringify(actual.nativeLocator.details?.[field]),
      ))
  );
}
export function sameOccurrenceEvidence(
  expected: Evidence,
  actual: z.infer<typeof referenceOccurrence>,
) {
  const span = expected.nativeLocator.details?.textSpan;
  // Occurrence references retain the base contract; detailed native reads add coordinates separately.
  const baseReference = {
    ...expected,
    nativeLocator: { ...expected.nativeLocator, details: undefined },
  };
  return (
    actual.id === expected.nativeLocator.occurrenceId &&
    actual.sourceDocumentId === expected.sourceDocumentId &&
    actual.sourceRevisionId === expected.sourceRevisionId &&
    actual.evidenceRef.availability !== "unavailable" &&
    sameEvidence(baseReference, actual.evidenceRef) &&
    (!span ||
      (actual.startOffset === span.start && actual.endOffset === span.end))
  );
}
export function EvidenceList({ items }: { items: readonly Evidence[] }) {
  const [selected, setSelected] = useState<Evidence>();
  return (
    <>
      <ul>
        {items.map((item) => (
          <li key={item.evidenceRefId}>
            <SourceLink url={item.sourceUrl}>
              {item.publisher || item.sourceFamily}
            </SourceLink>
            {item.edition && ` · ${item.edition}`}
            {item.nativeLocator.page !== null &&
              ` · page ${item.nativeLocator.page}`}
            {item.nativeLocator.section && ` · ${item.nativeLocator.section}`}
            {item.availability && ` · ${item.availability}`}
            {item.reason && ` — ${item.reason}`}
            <ActionButton onClick={() => setSelected(item)}>
              Inspect evidence
            </ActionButton>
          </li>
        ))}
      </ul>
      {selected && (
        <EvidenceInspector
          key={selected.evidenceRefId}
          expected={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
function EvidenceInspector({
  expected,
  onClose,
}: {
  expected: Evidence;
  onClose: () => void;
}) {
  const query = useCapiroQuery("defenseResearch.evidence", {
    params: { evidenceRefId: expected.evidenceRefId },
  });
  const actual = query.data;
  const admitted =
    actual &&
    sameEvidence(expected, actual) &&
    actual.availability !== "unavailable";
  return (
    <Modal
      open
      title="Research evidence"
      description="Current source access is checked before displaying this captured evidence target."
      side="right"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {actual && !admitted && (
          <p role="alert">
            This evidence target changed or is no longer available. Close this
            inspector and refresh the source view.
          </p>
        )}
        {admitted && (
          <>
            <h2>{actual.publisher || actual.sourceFamily}</h2>
            <dl>
              <dt>Source revision</dt>
              <dd>
                {actual.sourceRevisionId ||
                  "No revision identity is supplied by this source."}
              </dd>
              <dt>Content hash</dt>
              <dd>{actual.contentHash || "Not available"}</dd>
              <dt>Edition / observed</dt>
              <dd>
                {actual.edition || "Not available"} ·{" "}
                {actual.observedAt || "Not available"}
              </dd>
              <dt>Page / section</dt>
              <dd>
                {actual.nativeLocator.page ?? "No page"} ·{" "}
                {actual.nativeLocator.section || "No section"}
              </dd>
            </dl>
            {actual.reason && <p>{actual.reason}</p>}
            <SourceLink url={actual.sourceUrl} />
            <EvidenceCoordinates details={actual.nativeLocator.details} />
            {actual.nativeLocator.occurrenceId && (
              <ExactOccurrence
                evidence={actual}
                occurrenceId={actual.nativeLocator.occurrenceId}
              />
            )}
          </>
        )}
      </StatusPanel>
    </Modal>
  );
}
function ExactOccurrence({
  evidence: expected,
  occurrenceId,
}: {
  evidence: Evidence;
  occurrenceId: string;
}) {
  const query = useCapiroQuery("defenseResearch.occurrence", {
    params: { occurrenceId },
  });
  const actual = query.data;
  const admitted =
    actual &&
    actual.id === occurrenceId &&
    sameOccurrenceEvidence(expected, actual);
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {actual && !admitted && (
        <p role="alert">
          The occurrence no longer matches this source revision. Refresh the
          source view.
        </p>
      )}
      {admitted && (
        <section>
          <h3>Exact source occurrence</h3>
          <p>
            {actual.referenceType} · {actual.disposition}
          </p>
          <p>Span: {actual.exactSpan}</p>
          <p>
            Offsets:{" "}
            {actual.startOffset != null && actual.endOffset != null
              ? `${actual.startOffset}–${actual.endOffset}`
              : "Not retained"}
          </p>
          <blockquote>{actual.originalWording}</blockquote>
        </section>
      )}
    </StatusPanel>
  );
}
