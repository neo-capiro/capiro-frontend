import type { ActionQueryResponse } from "@capiro/meri-contracts/action-application";
import type { RecommendationPage } from "./workflow-port";

export function recommendationPage(
  query: ActionQueryResponse,
  retain: (actionId: string) => object,
): RecommendationPage {
  const page = query.observation.result;
  const { coverage, pageCoverage, continuation } = page;
  const limited =
    coverage.enumeration !== "complete" ||
    coverage.truncated ||
    !pageCoverage.complete ||
    pageCoverage.partial ||
    page.sources.some((source) => source.status !== "checked");
  const unknownFreshness = page.sources.some(
    (source) => source.freshness === "unknown",
  );
  return {
    items: page.actions.map((row) => ({
      key: row.id,
      selection: retain(row.id),
      title: row.title,
      description: row.deadline
        ? `${row.body}\nSource deadline: ${row.deadline}. The suggested task date uses its UTC calendar day.`
        : row.body,
      dueDate: row.deadline?.slice(0, 10) ?? null,
    })),
    coverageSummary: [
      `${page.returned} returned on this page. Reported total: ${page.total} for the checked scope.`,
      `${coverage.sourcesChecked.length} of ${coverage.sourcesRequested.length} requested sources checked; ${coverage.sourcesUnavailable.length} unavailable.`,
      ...(limited
        ? [
            "Coverage is limited. These results do not establish that no other recommendations exist.",
          ]
        : [
            "These results describe the checked scope and page, not a global absence of recommendations.",
          ]),
      ...(unknownFreshness
        ? ["Freshness is unknown for one or more sources."]
        : []),
      ...(page.sources.some((source) => source.freshness === "stale")
        ? ["One or more sources are stale."]
        : []),
      ...(coverage.historySupport !== "supported"
        ? ["Historical coverage is limited or unavailable."]
        : []),
      ...page.sources
        .filter((source) => source.status !== "checked")
        .map((source) => `Source ${source.sourceId}: ${source.status}.`),
      ...(pageCoverage.sourceStatus !== "healthy"
        ? [`Page source: ${pageCoverage.sourceStatus}.`]
        : []),
      `Only page ${page.scope.page} was checked. No further pages are fetched automatically.`,
      ...coverage.limitations,
      pageCoverage.note,
      ...(pageCoverage.sourceReason ? [pageCoverage.sourceReason] : []),
    ],
    coverageNotes: [
      "These are recommendations. They have not been accepted as tasks.",
      `Bounded first page: ${page.returned} returned; reported total ${page.total} for this scope. No additional pages are fetched automatically.`,
      `Enumeration: ${coverage.enumeration}; truncated: ${coverage.truncated}; history: ${coverage.historySupport}.`,
      `Requested sources: ${coverage.sourcesRequested.join(", ") || "none"}; checked: ${coverage.sourcesChecked.join(", ") || "none"}; unavailable: ${coverage.sourcesUnavailable.join(", ") || "none"}.`,
      ...coverage.limitations,
      ...page.sources.map(
        (source) =>
          `${source.sourceId}: ${source.status}; freshness ${source.freshness}; as of ${source.asOf ?? "unknown"}; synchronized ${source.synchronizedAt ?? "unknown"}; retrieved ${source.retrievedAt}.`,
      ),
      `Page source: ${pageCoverage.sourceStatus}; complete: ${pageCoverage.complete}; partial: ${pageCoverage.partial}; pagination complete: ${pageCoverage.paginationComplete}; more pages: ${pageCoverage.hasMore}; exact total for this scope: ${pageCoverage.totalIsExactForScope}; absence supported: ${pageCoverage.absenceSupported}.`,
      pageCoverage.note,
      ...(pageCoverage.sourceReason ? [pageCoverage.sourceReason] : []),
      `Evidence ready: ${page.evidenceReady}. Continuation cursor: ${continuation.cursor === null ? "none supplied" : "available"}; required reads: ${continuation.requiredReads.length}; remaining sources: ${continuation.remainingSources.join(", ") || "none supplied"}.`,
    ],
  };
}
