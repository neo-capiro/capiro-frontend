import { describe, expect, it } from "vitest";
import {
  comparisonBasisFromKey,
  comparisonHref,
  comparisonPins,
  comparisonRequestRefused,
  emptyComparisonBasis,
  safeComparisonSourceUrl,
  selectedComparisonProjection,
} from "../src/features/modules/research-portfolios/comparison/comparison-state";
import {
  researchComparisonOperations,
  saveComparisonBody,
  type ComparisonProjection,
} from "../src/shared/capiro/operations/research-comparisons";
import { CapiroApiError } from "../src/shared/capiro/http";
const id = "20000000-0000-4000-8000-000000000001";
const revision = "20000000-0000-4000-8000-000000000002";
const section = "20000000-0000-4000-8000-000000000003";
const basis =
  "FY2027|2027|request|funding|usd_millions|USD|unknown-price-basis";
const evidence = {
  evidenceRefId: `context-compare:${section}`,
  sourceDocumentId: id,
  sourceRevisionId: revision,
  sourceFamily: "policy",
  publisher: "Public source",
  sourceUrl: "https://example.test/source",
  nativeLocator: { page: null, section: "Section 1", occurrenceId: null },
  contentHash: "a".repeat(64),
  edition: "v1",
  observedAt: "2026-10-27T00:00:00Z",
};
const projection: ComparisonProjection = {
  projectionVersion: "defense-compare-v1",
  subjects: [
    {
      key: "program_element:A",
      type: "program_element",
      id: "A",
      label: "Program A",
      availability: "available",
    },
    {
      key: `context_document:${id}`,
      type: "context_document",
      id,
      label: "Context B",
      availability: "partial",
    },
  ],
  metrics: [
    {
      key: basis,
      label: "Funding",
      period: "2027",
      metric: "funding",
      unit: "usd_millions",
      grain: "subject",
      cells: [
        {
          subjectKey: "program_element:A",
          value: "0",
          disposition: "observed",
          reason: null,
          evidence: [],
        },
        {
          subjectKey: `context_document:${id}`,
          value: null,
          disposition: "unavailable",
          reason: "No funding evidence",
          evidence: [],
        },
      ],
    },
    {
      key: "passage:section-1",
      label: "Section 1",
      period: null,
      metric: "passage",
      unit: null,
      grain: "section",
      cells: [
        {
          subjectKey: `context_document:${id}`,
          value: "Original text",
          disposition: "observed",
          reason: null,
          evidence: [evidence],
        },
      ],
    },
  ],
  alignments: [
    {
      kind: "passage",
      state: "partial",
      reason: "One side lacks text",
      subjectEvidence: { [`context_document:${id}`]: [evidence] },
    },
  ],
  limitations: ["Capture-time only"],
};
const save = {
  schemaVersion: "defense_saved_comparison_v1",
  displayVersion: "defense-compare-display-v1",
  name: "Synthetic comparison",
  subjects: projection.subjects.map(({ type, id }) => ({ type, id })),
  selection: {
    mode: "explicit",
    subjectKeys: projection.subjects.map((subject) => subject.key),
    passageIds: [section],
  },
  basisPair: {
    left: comparisonBasisFromKey(basis),
    right: emptyComparisonBasis,
  },
  passageMode: "native_sections",
  contextualRevisionPins: comparisonPins(projection),
  portfolioId: id,
  idempotencyKey: "comparison-regression",
};

describe("native Research saved comparison boundary", () => {
  it("permits correction after a definitive refusal while retaining uncertain writes for exact retry", () => {
    expect(
      comparisonRequestRefused(new CapiroApiError(409, "Stale revision")),
    ).toBe(true);
    expect(comparisonRequestRefused(new CapiroApiError(408, "Timeout"))).toBe(
      false,
    );
    expect(
      comparisonRequestRefused(new CapiroApiError(500, "Unknown outcome")),
    ).toBe(false);
    expect(comparisonRequestRefused(new Error("Connection lost"))).toBe(false);
  });
  it("keeps funding edition and fiscal year distinct and refuses unsupported metric keys", () => {
    expect(comparisonBasisFromKey(basis)).toMatchObject({
      requestEdition: "FY2027",
      fundingFiscalYear: 2027,
      priceBasis: null,
    });
    expect(comparisonBasisFromKey("")).toEqual(emptyComparisonBasis);
    expect(() => comparisonBasisFromKey("milestone:planned")).toThrow(
      "supported native funding basis",
    );
  });
  it("derives exact contextual revision and section pins and refuses ambiguous revisions", () => {
    expect(comparisonPins(projection)).toEqual([
      { documentId: id, revisionId: revision, sectionIds: [section] },
    ]);
    const ambiguous = structuredClone(projection);
    ambiguous.metrics[1]!.cells[0]!.evidence.push({
      ...evidence,
      sourceRevisionId: id,
    });
    expect(() => comparisonPins(ambiguous)).toThrow(
      "exact qualified contextual revision",
    );
  });
  it("retains explicit subject selection, independent sources, zero and unavailable values", () => {
    const selection = {
      mode: "explicit" as const,
      subjectKeys: projection.subjects.map((subject) => subject.key),
      passageIds: [section],
    };
    const selected = selectedComparisonProjection(projection, selection, [
      basis,
    ]);
    expect(selected.metrics[0]!.cells.map((cell) => cell.value)).toEqual([
      "0",
      null,
    ]);
    expect(selected.metrics[1]!.cells[0]!.evidence[0]).toEqual(evidence);
    const onlyA = selectedComparisonProjection(
      projection,
      { ...selection, subjectKeys: ["program_element:A"], passageIds: [] },
      [basis],
    );
    expect(onlyA.metrics).toHaveLength(1);
    expect(onlyA.alignments[0]!.subjectEvidence).toEqual({});
  });
  it("reopens exact immutable selection in a same-origin URL while preserving the client hint", () => {
    const selection = {
      mode: "explicit" as const,
      subjectKeys: ["program_element:A"],
      passageIds: [],
    };
    const href = comparisonHref(
      "clientId=synthetic&view=overview",
      id,
      id,
      revision,
      selection,
    );
    const url = new URL(href, "https://app.example.test");
    expect(url.pathname).toBe("/modules/research-portfolios");
    expect(url.searchParams.get("comparisonVersionId")).toBe(revision);
    expect(JSON.parse(url.searchParams.get("comparisonSelection")!)).toEqual(
      selection,
    );
    expect(url.searchParams.get("clientId")).toBe("synthetic");
    expect(comparisonHref(url.search, id)).not.toContain("comparisonVersionId");
  });
  it("accepts canonical save requests and refuses forged capture or out-of-pin passage data", () => {
    expect(saveComparisonBody.safeParse(save).success).toBe(true);
    expect(
      saveComparisonBody.safeParse({ ...save, capturedProjection: projection })
        .success,
    ).toBe(false);
    expect(
      saveComparisonBody.safeParse({ ...save, contextualRevisionPins: [] })
        .success,
    ).toBe(false);
    expect(
      saveComparisonBody.safeParse({
        ...save,
        selection: { ...save.selection, passageIds: [id] },
      }).success,
    ).toBe(false);
    expect(
      saveComparisonBody.safeParse({
        ...save,
        subjects: [save.subjects[0], save.subjects[0]],
      }).success,
    ).toBe(false);
  });
  it("binds Add to an explicit saved version, both revisions and a fixed route", () => {
    const operation = researchComparisonOperations["research.comparisons.add"];
    expect(operation.path).toBe(
      "/defense-budget/saved-comparisons/:id/versions/:versionId/add-selection-to-portfolio",
    );
    const request = {
      params: { id, versionId: revision },
      body: {
        expectedRevision: 2,
        expectedPortfolioRevision: 3,
        portfolioId: id,
        idempotencyKey: "add-exact",
        selection: save.selection,
      },
    };
    expect(operation.request.safeParse(request).success).toBe(true);
    expect(
      operation.request.safeParse({ ...request, params: { id } }).success,
    ).toBe(false);
    expect(
      operation.request.safeParse({
        ...request,
        body: { ...request.body, actorUserId: id },
      }).success,
    ).toBe(false);
  });
  it("never turns unsafe source URLs into executable links", () => {
    expect(safeComparisonSourceUrl("javascript:alert(1)")).toBeUndefined();
    expect(
      safeComparisonSourceUrl("https://name:secret@example.test/"),
    ).toBeUndefined();
    expect(safeComparisonSourceUrl(evidence.sourceUrl)).toBe(
      evidence.sourceUrl,
    );
  });
});
