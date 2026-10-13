import { createApiClient } from "../src/shared/portfolio/api/http";
import type { CommentDeadlineRecord } from "../src/shared/federal-register/comment-deadlines";

export const commentRecord = (
  documentNumber = "2026-12345",
  date = "2026-03-08",
) => ({
  documentNumber,
  title: `Synthetic comment notice ${documentNumber}`,
  agencyNames: ["Synthetic agency"],
  htmlUrl: `https://www.federalregister.gov/documents/2026/01/01/${documentNumber}`,
  date,
  dateKind: "comment_deadline" as const,
  precision: "date" as const,
  provenance: {
    source: "federal_register" as const,
    sourceField: "comments_close_on" as const,
    cachedField: "commentEndDate" as const,
    rawPublisherValueVerified: false as const,
  },
});
export const commentPage = (
  data: CommentDeadlineRecord[] = [commentRecord()],
  dateFrom = "2026-03-01",
  dateTo = "2026-03-31",
  page = 1,
) => ({
  data,
  range: { dateFrom, dateTo },
  page,
  limit: 100,
  pagination: {
    totalCandidates: data.length,
    returned: data.length,
    excludedOnPage: 0,
    hasMoreCandidates: false,
  },
  coverage: {
    scope: "locally_ingested_comment_deadlines" as const,
    complete: false as const,
    allFederalDocuments: false as const,
    asOf: "2026-10-13T16:00:00.000Z",
    latestIngestion: null,
    limitation:
      "Cached source dates only; ingestion status does not establish complete or current publisher coverage.",
  },
});

export function commentApi(
  respond: (url: URL, options?: RequestInit) => unknown | Promise<unknown>,
) {
  const requests: URL[] = [];
  const api = createApiClient(async (input, options) => {
    const url = new URL(String(input), "http://127.0.0.1");
    requests.push(url);
    if (options?.method !== "GET") throw new Error("Unexpected comment write");
    const result = await respond(url, options);
    if (result instanceof Response) return result;
    // The old route legitimately has no dates beyond its fixed upcoming window.
    return Response.json(
      url.pathname.endsWith("/upcoming-deadlines") ? [] : result,
    );
  });
  return { api, requests };
}
