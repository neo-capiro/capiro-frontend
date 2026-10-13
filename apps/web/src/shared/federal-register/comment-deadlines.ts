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
