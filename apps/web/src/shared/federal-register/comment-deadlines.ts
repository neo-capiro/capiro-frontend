import { z } from "zod";

// capirov2@46aa2164c299151225c6cdb9f3cc565fee347657;
// FederalRegisterService.getCommentDeadlineCalendar. Cache facts only.
const day = z.iso.date();
const instant = z.iso.datetime();
export const commentDeadlineRecord = z.object({
  documentNumber: z.string().min(1),
  title: z.string(),
  agencyNames: z.array(z.string()),
  htmlUrl: z.string().nullable(),
  date: day,
  dateKind: z.literal("comment_deadline"),
  precision: z.literal("date"),
  provenance: z.object({
    source: z.literal("federal_register"),
    sourceField: z.literal("comments_close_on"),
    cachedField: z.literal("commentEndDate"),
    rawPublisherValueVerified: z.literal(false),
  }),
});
export const commentDeadlinePage = z.object({
  data: z.array(commentDeadlineRecord).max(100),
  range: z.object({ dateFrom: day, dateTo: day }),
  page: z.number().int().min(1).max(10000),
  limit: z.number().int().min(1).max(100),
  pagination: z.object({
    totalCandidates: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative(),
    excludedOnPage: z.number().int().nonnegative(),
    hasMoreCandidates: z.boolean(),
  }),
  coverage: z.object({
    scope: z.literal("locally_ingested_comment_deadlines"),
    complete: z.literal(false),
    allFederalDocuments: z.literal(false),
    asOf: instant,
    latestIngestion: z
      .object({
        source: z.literal("sync-federal-register"),
        startedAt: instant,
        finishedAt: instant.nullable(),
        status: z.string(),
        rowsUpdated: z.number().int().nonnegative(),
        errorCount: z.number().int().nonnegative(),
        stats: z.unknown(),
      })
      .nullable(),
    limitation: z.string(),
  }),
});
export const commentDeadlineQuery = z
  .object({
    dateFrom: day,
    dateTo: day,
    page: z.number().int().min(1).max(10000).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    ({ dateFrom, dateTo }) =>
      dateFrom <= dateTo &&
      Date.parse(dateTo) - Date.parse(dateFrom) <= 366 * 86400000,
  );
export type CommentDeadlineRecord = z.infer<typeof commentDeadlineRecord>;
export type CommentDeadlinePage = z.infer<typeof commentDeadlinePage>;
export type CommentDeadlineQuery = z.infer<typeof commentDeadlineQuery>;

function checkedPage(
  value: CommentDeadlinePage,
  query: CommentDeadlineQuery & { page: number; limit: number },
) {
  const result = commentDeadlinePage.parse(value);
  const p = result.pagination;
  const offset = (query.page - 1) * query.limit;
  const candidates = p.returned + p.excludedOnPage;
  if (
    result.page !== query.page ||
    result.limit !== query.limit ||
    result.range.dateFrom !== query.dateFrom ||
    result.range.dateTo !== query.dateTo ||
    p.returned !== result.data.length ||
    candidates !==
      Math.min(query.limit, Math.max(0, p.totalCandidates - offset)) ||
    p.hasMoreCandidates !== offset + candidates < p.totalCandidates
  ) {
    throw new Error(
      "The comment deadline page does not match the requested range or candidate pagination.",
    );
  }
  return result;
}

function coverageWarnings(
  result: CommentDeadlinePage,
  loaded: number,
  excluded: number,
) {
  const c = result.coverage;
  const run = c.latestIngestion;
  return [
    `Regulatory comment deadlines: cached comments_close_on dates only; coverage is incomplete. ${loaded} records loaded; ${excluded} excluded on loaded candidate pages. Latest page reports ${result.pagination.totalCandidates} candidates. Raw publisher value unverified. Results may change between pages. Read as of ${c.asOf} (read time, not publisher freshness). ${c.limitation}`,
    `Latest ingestion attempt: ${run ? `${run.startedAt} (${run.status}; ${run.errorCount} errors; ${run.finishedAt ? `finished ${run.finishedAt}` : "not finished"})` : "unavailable"}. Ingestion does not establish complete or current publisher coverage.`,
  ];
}

/** Candidate pages may contain zero accepted dates. No timestamp/freshness promotion. */
export async function loadCommentDeadlinePages(
  read: (query: CommentDeadlineQuery) => Promise<CommentDeadlinePage>,
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
) {
  const records = new Map<string, CommentDeadlineRecord>();
  let excluded = 0;
  let previousTotal: number | undefined;
  let changed = false;
  let warnings: string[] = [];
  for (let page = 1; page <= 100; page++) {
    signal?.throwIfAborted();
    const query = {
      ...commentDeadlineQuery.parse({ dateFrom, dateTo, page, limit: 100 }),
      page,
      limit: 100,
    };
    const value = await read(query);
    signal?.throwIfAborted();
    const result = checkedPage(value, query);
    for (const row of result.data) {
      if (
        row.date < dateFrom ||
        row.date > dateTo ||
        records.has(row.documentNumber)
      )
        throw new Error(
          "The comment deadline source repeated a document or returned an out-of-range date.",
        );
      records.set(row.documentNumber, row);
    }
    excluded += result.pagination.excludedOnPage;
    if (
      previousTotal !== undefined &&
      previousTotal !== result.pagination.totalCandidates
    )
      changed = true;
    previousTotal = result.pagination.totalCandidates;
    warnings = coverageWarnings(result, records.size, excluded);
    if (changed)
      warnings.push(
        "Comment deadline candidate totals changed between pages; these reads are not one immutable snapshot.",
      );
    if (!result.pagination.hasMoreCandidates)
      return { records: [...records.values()], warnings };
  }
  warnings.push(
    "Comment deadlines reached the 100-page safety limit; additional candidate pages are not shown.",
  );
  return { records: [...records.values()], warnings };
}
