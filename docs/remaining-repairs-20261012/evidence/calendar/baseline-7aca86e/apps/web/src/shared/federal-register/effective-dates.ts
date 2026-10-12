import { z } from "zod";

/** Published wire contract only. The existing Core source owner verifies evidence. */
const day = z.iso.date();
const instant = z.iso.datetime();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const documentNumber = z.string().regex(/^\d{4}-\d{3,6}$/);
const prior = z.object({
  date: day.nullable(),
  status: z.enum([
    "supported",
    "missing_date",
    "invalid_date",
    "unsupported_document_type",
    "missing_official_pdf",
    "correction_requires_review",
    "incomplete_correction_metadata",
  ]),
  evidenceHash: hash,
  revision: z.number().int().positive(),
  observedAt: instant,
});
export const effectiveDateRecord = z
  .object({
    documentNumber,
    title: z.string(),
    agencyNames: z.array(z.string()),
    date: day,
    dateKind: z.literal("effective"),
    provenance: prior.extend({
      schemaVersion: z.literal(1),
      status: z.literal("supported"),
      dateKind: z.literal("effective"),
      documentNumber,
      publicationDate: day,
      date: day,
      rawEffectiveOn: day,
      sourceUrl: z.url(),
      officialPdfUrl: z.url(),
      correctionOf: z.null(),
      corrections: z.array(z.never()).length(0),
      authority: z.literal("federal_register_publisher_metadata"),
      sourceField: z.literal("effective_on"),
      changedAt: instant,
      previous: prior.nullable(),
    }),
  })
  .refine((row) => {
    const p = row.provenance;
    return (
      row.documentNumber === p.documentNumber &&
      row.date === p.date &&
      p.date === p.rawEffectiveOn &&
      p.sourceUrl ===
        `https://www.federalregister.gov/api/v1/documents/${row.documentNumber}.json` &&
      p.officialPdfUrl ===
        `https://www.govinfo.gov/content/pkg/FR-${p.publicationDate}/pdf/${row.documentNumber}.pdf`
    );
  }, "Effective-date provenance does not match the record identity.");
const run = z
  .object({
    source: z.string(),
    startedAt: instant,
    finishedAt: instant.nullable(),
    status: z.string(),
    rowsUpdated: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    stats: z.unknown(),
  })
  .nullable();
export const effectiveDatePage = z.object({
  data: z.array(effectiveDateRecord),
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
    scope: z.literal("locally_ingested_rule_publisher_metadata"),
    complete: z.literal(false),
    allFederalRules: z.literal(false),
    parsedFullDatesSection: z.literal(false),
    separatelyIssuedCorrectionsResolved: z.literal(false),
    asOf: instant,
    maximumObservationAgeHours: z.literal(48),
    catalogRules: z.number().int().nonnegative(),
    withoutEvidence: z.number().int().nonnegative(),
    unsupportedEvidence: z.number().int().nonnegative(),
    latestIngestion: run,
    latestRefresh: run,
    refreshRequired: z.literal(true),
  }),
});
export const effectiveDateQuery = z
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
export type EffectiveDateRecord = z.infer<typeof effectiveDateRecord>;
export type EffectiveDatePage = z.infer<typeof effectiveDatePage>;
export type EffectiveDateQuery = z.infer<typeof effectiveDateQuery>;

/** Empty filtered pages can still have more candidates. No date source substitution. */
export async function loadEffectiveDatePages(
  read: (query: EffectiveDateQuery) => Promise<EffectiveDatePage>,
  dateFrom: string,
  dateTo: string,
) {
  const records = new Map<string, EffectiveDateRecord>();
  let excluded = 0;
  const warnings: string[] = [];
  for (let page = 1; page <= 100; page++) {
    const query = effectiveDateQuery.parse({
      dateFrom,
      dateTo,
      page,
      limit: 100,
    });
    const result = effectiveDatePage.parse(await read(query));
    if (
      result.page !== page ||
      result.limit !== 100 ||
      result.range.dateFrom !== dateFrom ||
      result.range.dateTo !== dateTo ||
      result.pagination.returned !== result.data.length ||
      result.data.length + result.pagination.excludedOnPage > 100
    )
      throw new Error(
        "The effective-date page does not match the requested range or pagination.",
      );
    const asOf = Date.parse(result.coverage.asOf);
    for (const row of result.data) {
      const age = asOf - Date.parse(row.provenance.observedAt);
      if (
        row.date < dateFrom ||
        row.date > dateTo ||
        age < 0 ||
        age > 48 * 3600000 ||
        records.has(row.documentNumber)
      )
        throw new Error(
          "The effective-date source repeated a document or returned stale/out-of-range evidence.",
        );
      records.set(row.documentNumber, row);
    }
    excluded += result.pagination.excludedOnPage;
    const c = result.coverage;
    warnings[0] = `Government effective dates: local publisher metadata only; coverage is incomplete. ${records.size} records loaded from ${result.pagination.totalCandidates} candidates; ${excluded} excluded on loaded pages. Catalog ${c.catalogRules} RULE records; ${c.withoutEvidence} without evidence and ${c.unsupportedEvidence} unsupported. As of ${c.asOf}; observations must be within 48 hours. Continued refresh required. Full Dates text, separate corrections and forecasts remain unavailable. An empty result does not mean no rule takes effect.`;
    warnings[1] = `Latest ingestion: ${c.latestIngestion ? `${c.latestIngestion.startedAt} (${c.latestIngestion.status}; ${c.latestIngestion.errorCount} errors)` : "unavailable"}. Historical refresh: ${c.latestRefresh ? `${c.latestRefresh.startedAt} (${c.latestRefresh.status}; ${c.latestRefresh.errorCount} errors)` : "unavailable"}.`;
    if (!result.pagination.hasMoreCandidates)
      return { records: [...records.values()], warnings };
  }
  warnings.push(
    "Government pagination reached its safety limit; additional candidate pages remain unavailable.",
  );
  return { records: [...records.values()], warnings };
}
