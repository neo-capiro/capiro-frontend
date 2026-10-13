import { Temporal } from "temporal-polyfill";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { queryString } from "@/shared/portfolio/api/http";
import {
  effectiveDatePage,
  loadEffectiveDatePages,
} from "@/shared/federal-register/effective-dates";
import type { CalendarFeed } from "./contracts";
export async function fetchEffectiveDates(
  api: ApiClient,
  startDay: string,
  endDay: string,
  signal?: AbortSignal,
): Promise<CalendarFeed> {
  const lastDay = Temporal.PlainDate.from(endDay)
    .subtract({ days: 1 })
    .toString();
  const result = await loadEffectiveDatePages(
    (query) =>
      api.request(
        "core",
        `federal-register/effective-date-calendar?${queryString(query)}`,
        effectiveDatePage,
        { signal },
      ),
    startDay,
    lastDay,
  );
  return {
    items: result.records.map((record) => ({
      key: `effective:${record.documentNumber}`,
      kind: "government",
      sourceId: record.documentNumber,
      title: record.title,
      day: record.date,
      timeZone: "America/New_York",
      status: "Publisher effective date",
      provenance:
        "Date only · Federal Register publisher metadata; coverage incomplete",
      effectiveDate: record,
    })),
    limitations: result.warnings,
  };
}
