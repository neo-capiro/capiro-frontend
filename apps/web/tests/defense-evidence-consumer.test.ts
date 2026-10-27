import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { evidence } from "../src/shared/capiro/operations/defense-research-schemas";
import { evidenceLocatorDetails } from "../src/shared/capiro/operations/defense-evidence-details";
import { referenceOccurrence } from "../src/shared/capiro/operations/defense-evidence";
import { coverageRecordedOutcome } from "../src/shared/capiro/operations/defense-product-coverage";
import {
  federalEvidenceEvent,
  federalEvidenceOperations,
  federalEvidenceSide,
} from "../src/shared/capiro/operations/federal-evidence";
import { EvidenceCoordinates } from "../src/features/modules/intelligence/research/EvidenceCoordinates";
import { CoverageOutcome } from "../src/features/modules/intelligence/research/CoverageOutcome";
import {
  FederalEvidenceRevision,
  admitsFederalSide,
} from "../src/features/modules/intelligence/research/FederalEvidenceRevision";
import {
  sameEvidence,
  sameOccurrenceEvidence,
} from "../src/features/modules/intelligence/research/ResearchEvidence";

const details = evidenceLocatorDetails.parse({
  availability: "partial",
  reason: "Retained coordinates only",
  printedPage: "R-4",
  tableLabel: "Funding",
  rowLabel: "Program A",
  columnLabel: "FY2027",
  textSpan: { start: 0, end: 12 },
  boundingBox: {
    x0: 1,
    y0: 2,
    x1: 30,
    y1: 40,
    coordinateSystem: "pdf_points",
    pageWidth: 612,
    pageHeight: 792,
  },
  structuredElement: {
    companionByteSha256: "companion-hash",
    elementPath: "/table/row[1]",
    elementId: "row-one",
  },
  sourceSpanHash: "span-hash",
  internalQueue: "private",
});
const captured = evidence.parse({
  evidenceRefId: "proof",
  sourceDocumentId: "document",
  sourceRevisionId: "revision",
  sourceFamily: "rdte",
  publisher: "Synthetic source",
  sourceUrl: null,
  nativeLocator: {
    page: 4,
    section: "Funding",
    occurrenceId: "occurrence",
    details,
  },
  contentHash: "document-hash",
  edition: "FY2027",
  observedAt: null,
  availability: "available",
});
const side = federalEvidenceSide.parse({
  availability: "available",
  reason: null,
  revisionId: "before-id",
  contentHash: "before-hash",
  extractionHash: "extract-hash",
  sourceUrl: "https://example.test/source",
  locator: "section one",
  textSpan: { start: 0, end: 8 },
  evidence: "Before retained text",
  languageHash: "language-hash",
  qualificationState: "qualified",
  publishedAt: null,
  sourceModifiedAt: null,
});

describe("bounded retained evidence consumers", () => {
  it("retains typed source coordinates and zero offsets while stripping private extensions", () => {
    expect(details).not.toHaveProperty("internalQueue");
    const markup = renderToStaticMarkup(
      createElement(EvidenceCoordinates, { details }),
    );
    for (const value of [
      "R-4",
      "Funding",
      "Program A",
      "FY2027",
      "0–12",
      "pdf_points",
      "612",
      "companion-hash",
      "span-hash",
    ])
      expect(markup).toContain(value);
    expect(
      evidenceLocatorDetails.safeParse({
        ...details,
        textSpan: { start: 12, end: 0 },
      }).success,
    ).toBe(false);
    expect(
      evidenceLocatorDetails.safeParse({
        ...details,
        boundingBox: { ...details.boundingBox, coordinateSystem: "guessed" },
      }).success,
    ).toBe(false);
    const occurrence = referenceOccurrence.parse({
      id: "occurrence",
      sourceDocumentId: "document",
      sourceRevisionId: "revision",
      sourceSectionId: null,
      exactSpan: "excerpt",
      startOffset: 0,
      endOffset: 7,
      originalWording: "excerpt",
      referenceType: "program",
      disposition: "resolved",
      evidenceRef: captured,
    });
    expect(occurrence.startOffset).toBe(0);
  });
  it("preserves captured revision/hash/locator refusal including new coordinates", () => {
    expect(sameEvidence(captured, captured)).toBe(true);
    for (const actual of [
      { ...captured, contentHash: "changed" },
      { ...captured, sourceRevisionId: "changed" },
      {
        ...captured,
        nativeLocator: { ...captured.nativeLocator, details: undefined },
      },
      {
        ...captured,
        nativeLocator: {
          ...captured.nativeLocator,
          details: { ...details, rowLabel: "Different row" },
        },
      },
      {
        ...captured,
        nativeLocator: {
          ...captured.nativeLocator,
          details: { ...details, sourceSpanHash: "changed" },
        },
      },
    ])
      expect(sameEvidence(captured, actual)).toBe(false);
    const legacy = {
      ...captured,
      nativeLocator: { ...captured.nativeLocator, details: undefined },
    };
    expect(sameEvidence(legacy, captured)).toBe(true);
  });
  it("admits a matching base occurrence without duplicated details but refuses changed offsets or identity", () => {
    const baseReference = {
      ...captured,
      nativeLocator: { ...captured.nativeLocator, details: undefined },
    };
    const occurrence = referenceOccurrence.parse({
      id: "occurrence",
      sourceDocumentId: "document",
      sourceRevisionId: "revision",
      sourceSectionId: null,
      exactSpan: "source words",
      startOffset: 0,
      endOffset: 12,
      originalWording: "source words",
      referenceType: "program",
      disposition: "resolved",
      evidenceRef: baseReference,
    });
    expect(sameOccurrenceEvidence(captured, occurrence)).toBe(true);
    for (const changed of [
      { ...occurrence, endOffset: 13 },
      { ...occurrence, startOffset: null },
      { ...occurrence, sourceRevisionId: "changed" },
      {
        ...occurrence,
        evidenceRef: { ...baseReference, contentHash: "changed" },
      },
      {
        ...occurrence,
        evidenceRef: { ...baseReference, availability: "unavailable" as const },
      },
    ])
      expect(sameOccurrenceEvidence(captured, changed)).toBe(false);
  });
  it("shows honest absent coordinates and withholds unavailable retained details", () => {
    expect(
      renderToStaticMarkup(createElement(EvidenceCoordinates, {})),
    ).toContain("not available");
    const markup = renderToStaticMarkup(
      createElement(EvidenceCoordinates, {
        details: {
          ...details,
          availability: "unavailable",
          reason: "Source proof unavailable",
        },
      }),
    );
    expect(markup).toContain("Source proof unavailable");
    expect(markup).not.toMatch(/Program A|companion-hash|span-hash/);
  });
  it("separates current state, observation, and tenant governed decision without a command", () => {
    const outcome = coverageRecordedOutcome.parse({
      sourceState: "partial",
      lastObservation: {
        state: "present",
        revisionKind: "corrected",
        observedAt: "2026-10-26T00:00:00Z",
        rawPayload: "private",
      },
      lastGovernedResolution: {
        decision: "not_filed",
        resolvedAt: "2026-10-27T00:00:00Z",
        userId: "private",
      },
      reason: "Denominator unknown",
      queueId: "private",
    });
    expect(JSON.stringify(outcome)).not.toContain("private");
    const markup = renderToStaticMarkup(
      createElement(CoverageOutcome, { outcome }),
    );
    for (const value of [
      "partial",
      "present",
      "corrected",
      "not_filed",
      "Denominator unknown",
    ])
      expect(markup).toContain(value);
    expect(markup).not.toContain("<button");
    expect(renderToStaticMarkup(createElement(CoverageOutcome, {}))).toContain(
      "No recorded source outcome",
    );
  });
  it("admits only bounded PE-scoped timeline reads and strips raw event payloads", () => {
    const operation =
      federalEvidenceOperations["defenseResearch.federalTimeline"];
    expect([operation.method, operation.path]).toEqual([
      "GET",
      "/federal-evidence/timeline",
    ]);
    expect(
      operation.request.safeParse({
        query: {
          peCode: "0600001A",
          limit: 25,
          knownAt: "2026-10-27T00:00:00Z",
        },
      }).success,
    ).toBe(true);
    for (const query of [
      { peCode: "" },
      { peCode: "PE", limit: 101 },
      { peCode: "PE", knownAt: "yesterday" },
      { peCode: "PE", tenantId: "forged" },
      { peCode: "PE", recheck: true },
    ])
      expect(operation.request.safeParse({ query }).success).toBe(false);
    const event = federalEvidenceEvent.parse({
      id: "event",
      eventType: "changed",
      canonicalPeCode: "PE",
      billId: null,
      previousRevisionId: "before-id",
      currentRevisionId: "after-id",
      createdAt: "2026-10-27T00:00:00Z",
      historical: false,
      beforeEvidence: side,
      before: { private: true },
      after: { private: true },
      evidence: "unqualified raw text",
    });
    expect(event).not.toHaveProperty("before");
    expect(event).not.toHaveProperty("after");
    expect(event).not.toHaveProperty("evidence");
  });
  it("withholds each missing, unavailable, hashless or mismatched event side independently", () => {
    expect(admitsFederalSide("before-id", side)).toBe(true);
    for (const [id, value] of [
      [null, side],
      ["other-id", side],
      ["before-id", undefined],
      ["before-id", { ...side, contentHash: null }],
      ["before-id", { ...side, availability: "unavailable" as const }],
    ] as const) {
      expect(admitsFederalSide(id, value)).toBe(false);
      const markup = renderToStaticMarkup(
        createElement(FederalEvidenceRevision, {
          label: "Before",
          expectedRevision: id,
          side: value,
        }),
      );
      expect(markup).not.toMatch(
        /Before retained text|section one|example.test/,
      );
    }
    const before = renderToStaticMarkup(
      createElement(FederalEvidenceRevision, {
        label: "Before",
        expectedRevision: "before-id",
        side,
      }),
    );
    const after = renderToStaticMarkup(
      createElement(FederalEvidenceRevision, {
        label: "After",
        expectedRevision: "after-id",
        side,
      }),
    );
    expect(before).toContain("Before retained text");
    expect(before).toContain(
      "does not establish current publication eligibility",
    );
    expect(after).not.toContain("Before retained text");
  });
});
