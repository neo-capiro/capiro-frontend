import type { OperationRequest, OperationResponse } from "../contracts";
import type { legiwatchCalendarOperations } from "./legiwatch-calendar";
import type { CalendarHearing } from "./legiwatch-calendar-schemas";

type Operations = typeof legiwatchCalendarOperations;
export type HearingCalendarQuery = NonNullable<
  OperationRequest<Operations["legiwatch.calendar"]>["query"]
>;
type Page = OperationResponse<Operations["legiwatch.calendar"]>;
type Coverage = OperationResponse<Operations["legiwatch.calendarCoverage"]>;
export type HearingCalendarFeed = {
  rows: CalendarHearing[];
  warnings: string[];
  coverage: Coverage["rows"];
};

/** Load the requested official civil-day range without hiding later pages. */
export async function loadHearingCalendar(
  page: (query: HearingCalendarQuery) => Promise<Page>,
  coverage: (query: HearingCalendarQuery) => Promise<Coverage>,
  query: HearingCalendarQuery,
): Promise<HearingCalendarFeed> {
  const warnings: string[] = [];
  const rows = new Map<string, CalendarHearing>();
  const coverageRead =
    query.jurisdiction === "US"
      ? Promise.resolve([])
      : coverage(query).then(
          (value) => value.rows,
          () => {
            warnings.push(
              "Florida hearing source coverage could not be checked.",
            );
            return [];
          },
        );
  let expectedTotal: number | undefined;
  try {
    for (let number = 1; number <= 100; number += 1) {
      const result = await page({ ...query, page: number, pageSize: 200 });
      if (expectedTotal !== undefined && expectedTotal !== result.total)
        warnings.push(
          "The hearing schedule changed while loading. Refresh to check the latest range.",
        );
      expectedTotal = result.total;
      const previousSize = rows.size;
      result.rows.forEach((row) => rows.set(row.id, row));
      if (rows.size >= result.total) break;
      if (
        result.page !== number ||
        rows.size === previousSize ||
        result.pageSize <= 0
      ) {
        warnings.push(
          "Hearing pagination stopped before all records were received. Coverage is incomplete.",
        );
        break;
      }
      if (number === 100)
        warnings.push(
          "The hearing feed has more pages than this view can load. Coverage is incomplete.",
        );
    }
  } catch (error) {
    if (!rows.size) {
      await coverageRead;
      throw error;
    }
    warnings.push(
      "Some hearing pages could not be loaded. Coverage is incomplete; refresh to retry.",
    );
  }
  const checked = await coverageRead;
  if (query.jurisdiction !== "US" && !checked.length)
    warnings.push(
      "No Florida source coverage report is available for this hearing range.",
    );
  if (checked.some((row) => row.status !== "complete"))
    warnings.push(
      "Some Florida calendar sources are incomplete or could not be checked.",
    );
  return {
    rows: [...rows.values()],
    warnings: [...new Set(warnings)],
    coverage: checked,
  };
}

export function hearingCoverageText(coverage: Coverage["rows"]) {
  return coverage.map(
    (row) =>
      `Florida ${row.chamber}${row.session ? ` · ${row.session}` : ""}: ${row.status}; ${row.items} discovered items; checked ${row.checkedAt}`,
  );
}
