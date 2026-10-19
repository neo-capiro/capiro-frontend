import { z } from "zod";
import {
  fundingSearchResponse,
  intelligenceFundingOperations,
  type FundingRecord,
} from "@/shared/capiro/operations/intelligence-funding";
import {
  ApiError,
  queryString,
  type ApiClient,
} from "@/shared/portfolio/api/http";
import type { CalendarFeed } from "./contracts";
import {
  fundingCalendarSources,
  fundingDeadlineItem,
  fundingSearchWindow,
  fundingSourceLabel,
} from "./funding-deadline";

const pageSize = 25;
const maxPages = 2;
const lifecycles = ["active", "forecast", "closed", "post_award"];
const supported = (source: string) =>
  fundingCalendarSources.some((value) => value === source);
const mismatch = () =>
  new ApiError(
    502,
    "The funding deadline source returned conflicting records.",
  );
const pageSchema = (page: number) =>
  fundingSearchResponse
    .extend({
      page: z.literal(page),
      pageSize: z.literal(pageSize),
      total: z.number().int().nonnegative().nullable(),
      mode: z.literal("all"),
      clientId: z.null(),
    })
    .refine(
      (result) =>
        result.opportunities.length <= pageSize &&
        result.opportunities.every(
          (row) =>
            supported(row.source) &&
            row.id.trim() &&
            row.sourceRecordId.trim() &&
            row.title.trim() &&
            row.clientId === null &&
            lifecycles.includes(row.lifecycle),
        ) &&
        result.freshness.every((row) => supported(row.source)) &&
        new Set(result.freshness.map((row) => row.source)).size ===
          result.freshness.length,
      "Funding deadline scope or page mismatch",
    );

async function fundingCandidates(
  api: ApiClient,
  startDay: string,
  endDay: string,
  zone: string,
  limitations: Set<string>,
  signal?: AbortSignal,
) {
  const window = fundingSearchWindow(startDay, endDay, zone);
  const records: FundingRecord[] = [];
  const seen = new Set<string>();
  let previousTotal: number | null | undefined;
  for (let page = 1; page <= maxPages; page++) {
    signal?.throwIfAborted();
    const result = await api.request(
      "core",
      `intelligence/opportunities/v2/search?${queryString({ mode: "all", source: fundingCalendarSources.join(","), lifecycle: lifecycles.join(","), deadlineWindow: "any", ...window, sort: "deadline", direction: "asc", page, pageSize })}`,
      pageSchema(page),
      { signal },
    );
    signal?.throwIfAborted();
    if (
      !result.catalogComplete ||
      result.totalIsCapped ||
      result.total === null
    )
      limitations.add("Funding deadline catalog coverage is incomplete.");
    for (const source of fundingCalendarSources) {
      const state = result.freshness.find(
        (row) => row.source === source,
      )?.state;
      if (state !== "current")
        limitations.add(
          `${fundingSourceLabel(source)} deadline source: ${state ?? "freshness unavailable"}.`,
        );
    }
    if (previousTotal !== undefined && previousTotal !== result.total)
      limitations.add("The funding catalog changed while pages were loading.");
    previousTotal = result.total;
    for (const row of result.opportunities) {
      const key = JSON.stringify([
        row.source,
        row.sourceRecordId,
        row.sourceFacts.provenance,
      ]);
      if (seen.has(key)) throw mismatch();
      seen.add(key);
      records.push(row);
    }
    if (
      result.opportunities.length === 0 ||
      (result.total !== null && records.length >= result.total) ||
      (result.total === null && result.opportunities.length < pageSize)
    ) {
      if (result.total !== null && records.length < result.total)
        limitations.add(
          "Funding paging ended before all reported records were read.",
        );
      return records;
    }
  }
  limitations.add(
    "Funding deadlines are limited to the first 50 matching opportunities. Additional matching opportunities are not shown.",
  );
  return records;
}

export async function fetchFundingDeadlines(
  api: ApiClient,
  startDay: string,
  endDay: string,
  zone: string,
  signal?: AbortSignal,
): Promise<CalendarFeed> {
  const limitations = new Set<string>([
    "Agency forecasts are not included: the native source does not publish response deadlines. Anticipated award dates are not response deadlines.",
  ]);
  const records = await fundingCandidates(
    api,
    startDay,
    endDay,
    zone,
    limitations,
    signal,
  );
  const items: CalendarFeed["items"] = [];
  let unplaced = 0;
  let unavailable = 0;
  const identities = new Map<string, number>();
  for (const record of records) {
    const key = JSON.stringify([record.source, record.sourceRecordId]);
    identities.set(key, (identities.get(key) ?? 0) + 1);
  }
  for (const record of records) {
    signal?.throwIfAborted();
    if (
      identities.get(JSON.stringify([record.source, record.sourceRecordId])) !==
      1
    ) {
      unavailable += 1;
      continue;
    }
    try {
      const detail = await api.request(
        "core",
        `intelligence/opportunities/v2/detail/${encodeURIComponent(record.source)}/${encodeURIComponent(record.sourceRecordId)}?mode=all`,
        intelligenceFundingOperations[
          "intelligence.funding.detail"
        ].response.refine(
          (result) =>
            result.source === record.source &&
            result.sourceRecordId === record.sourceRecordId &&
            result.opportunity.source === record.source &&
            result.opportunity.sourceRecordId === record.sourceRecordId &&
            result.opportunity.id === record.id &&
            result.opportunity.sourceFacts.provenance ===
              record.sourceFacts.provenance &&
            result.opportunity.clientId === null,
          "Funding deadline detail identity mismatch",
        ),
        { signal },
      );
      signal?.throwIfAborted();
      const item = fundingDeadlineItem(
        detail.opportunity,
        detail.authoritativeSourceUrl,
        zone,
      );
      if (!item) unplaced += 1;
      else if (item.day >= startDay && item.day < endDay) items.push(item);
    } catch (error) {
      signal?.throwIfAborted();
      if (
        error instanceof ApiError &&
        (error.status === 404 ||
          (record.source === "sbir_sttr" && error.status === 400))
      )
        unavailable += 1;
      else throw error;
    }
  }
  if (unplaced)
    limitations.add(
      `${unplaced} funding opportunities could not be placed because a permitted, precise response deadline was unavailable. Raw source text is not treated as an exact date or time.`,
    );
  if (unavailable)
    limitations.add(
      `${unavailable} funding candidates could not be confirmed by the current detail source. SBIR topic and solicitation identifiers can be ambiguous; no first match was selected.`,
    );
  return { items, limitations: [...limitations] };
}
