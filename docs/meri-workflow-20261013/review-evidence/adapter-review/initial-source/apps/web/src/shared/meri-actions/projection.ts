import type { ActionQueryResponse } from "@capiro/meri-contracts/action-application";
import type { RecommendationPage } from "./workflow-port";

export function recommendationPage(
  query: ActionQueryResponse,
  retain: (actionId: string) => object,
): RecommendationPage {
  const page = query.observation.result;
  const { coverage, pageCoverage, continuation } = page;
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
