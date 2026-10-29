import type {
  ComparisonProjection,
  ComparisonSelection,
  SaveComparison,
} from "../../../../shared/capiro/operations/research-comparisons";
import { CapiroApiError } from "../../../../shared/capiro/http";

export const emptyComparisonBasis: SaveComparison["basisPair"]["left"] = {
  requestEdition: null,
  fundingFiscalYear: null,
  stage: null,
  metric: null,
  unit: null,
  currency: null,
  priceBasis: null,
  asOfDate: null,
  periodStart: null,
  periodEnd: null,
};

/** This is the native fundingBasisKey emitted by DefenseResearchService.compare. */
export function comparisonBasisFromKey(
  key: string,
): SaveComparison["basisPair"]["left"] {
  if (!key) return { ...emptyComparisonBasis };
  const [edition, year, stage, metric, unit, currency, priceBasis, extra] =
    key.split("|");
  if (
    extra !== undefined ||
    !edition ||
    !stage ||
    !metric ||
    !unit ||
    !currency ||
    !priceBasis ||
    !/^\d{4}$/.test(year ?? "")
  )
    throw new Error(
      "This comparison metric has no supported native funding basis.",
    );
  return {
    ...emptyComparisonBasis,
    requestEdition: edition === "unknown-edition" ? null : edition,
    fundingFiscalYear: Number(year),
    stage,
    metric,
    unit,
    currency: currency === "unknown-currency" ? null : currency,
    priceBasis: priceBasis === "unknown-price-basis" ? null : priceBasis,
  };
}

export function comparisonPins(
  projection: ComparisonProjection,
): SaveComparison["contextualRevisionPins"] {
  return projection.subjects
    .filter((subject) => subject.type === "context_document")
    .map((subject) => {
      const evidence = projection.metrics.flatMap((metric) =>
        metric.cells
          .filter((cell) => cell.subjectKey === subject.key)
          .flatMap((cell) => cell.evidence),
      );
      const passages = evidence.filter((item) =>
        item.evidenceRefId.startsWith("context-compare:"),
      );
      const revisions = [
        ...new Set(
          passages
            .map((item) => item.sourceRevisionId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const revisionId = revisions[0];
      if (revisions.length !== 1 || !revisionId)
        throw new Error(
          `An exact qualified contextual revision is unavailable for ${subject.label}. Refresh the source preview or choose another subject.`,
        );
      return {
        documentId: subject.id,
        revisionId,
        sectionIds: [
          ...new Set(
            passages.map((item) =>
              item.evidenceRefId.slice("context-compare:".length),
            ),
          ),
        ],
      };
    });
}

export function comparisonHref(
  previous: string,
  portfolioId: string,
  id?: string,
  versionId?: string,
  selection?: ComparisonSelection,
) {
  const params = new URLSearchParams(previous);
  params.set("portfolioId", portfolioId);
  params.set("view", "comparisons");
  for (const key of [
    "comparisonId",
    "comparisonVersionId",
    "comparisonSelection",
  ])
    params.delete(key);
  if (id) params.set("comparisonId", id);
  if (versionId) params.set("comparisonVersionId", versionId);
  if (selection) params.set("comparisonSelection", JSON.stringify(selection));
  return `/modules/research-portfolios?${params}`;
}

export function safeComparisonSourceUrl(
  value: string | null,
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function comparisonRequestRefused(error: unknown): boolean {
  return (
    error instanceof CapiroApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408
  );
}

export function selectedComparisonProjection(
  projection: ComparisonProjection,
  selection: ComparisonSelection,
  bases: string[],
): ComparisonProjection {
  const subjects = new Set(selection.subjectKeys),
    passages = new Set(selection.passageIds);
  return {
    ...projection,
    subjects: projection.subjects.filter((subject) =>
      subjects.has(subject.key),
    ),
    metrics: projection.metrics
      .filter((metric) =>
        metric.metric === "passage"
          ? metric.cells.some((cell) =>
              cell.evidence.some((evidence) =>
                passages.has(
                  evidence.evidenceRefId.slice("context-compare:".length),
                ),
              ),
            )
          : bases.includes(metric.key),
      )
      .map((metric) => ({
        ...metric,
        cells: metric.cells.filter(
          (cell) =>
            subjects.has(cell.subjectKey) &&
            (metric.metric !== "passage" ||
              cell.evidence.some(
                (evidence) =>
                  evidence.evidenceRefId.startsWith("context-compare:") &&
                  passages.has(
                    evidence.evidenceRefId.slice("context-compare:".length),
                  ),
              )),
        ),
      })),
    alignments: projection.alignments.map((alignment) => ({
      ...alignment,
      subjectEvidence: Object.fromEntries(
        Object.entries(alignment.subjectEvidence).filter(([key]) =>
          subjects.has(key),
        ),
      ),
    })),
  };
}
