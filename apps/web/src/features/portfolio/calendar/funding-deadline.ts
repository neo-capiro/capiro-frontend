import { Temporal } from "temporal-polyfill";
import type { z } from "zod";
import { fundingDetailRecord } from "@/shared/capiro/operations/intelligence-funding";
import type { CalendarItem } from "./contracts";
import { instantDay, validDay } from "./range";

export const fundingCalendarSources = ["sam_gov", "sbir_sttr"] as const;
export const fundingSourceLabel = (source: string) =>
  source === "sam_gov" ? "SAM.gov" : "SBIR/STTR";

// Native search compares inclusive normalized instants. Enclose both source
// date-only days and the displayed zone; projection applies the exact range.
export function fundingSearchWindow(
  startDay: string,
  endDay: string,
  zone: string,
) {
  const start = Temporal.PlainDate.from(startDay);
  const end = Temporal.PlainDate.from(endDay);
  if (Temporal.PlainDate.compare(start, end) >= 0)
    throw new Error("Choose a valid funding deadline range.");
  const first = ["UTC", zone]
    .map((timeZone) => start.toZonedDateTime(timeZone).toInstant())
    .sort(Temporal.Instant.compare);
  const last = ["UTC", zone]
    .map((timeZone) => end.toZonedDateTime(timeZone).toInstant())
    .sort(Temporal.Instant.compare);
  return {
    deadlineFrom: first[0]!.toString(),
    deadlineTo: last[1]!.toString(),
  };
}

export function fundingDeadlineItem(
  record: z.infer<typeof fundingDetailRecord>,
  authoritativeSourceUrl: string | null,
  zone: string,
): CalendarItem | undefined {
  if (
    !fundingCalendarSources.some((source) => source === record.source) ||
    !record.capabilities.view.allowed
  )
    return;
  const fact = record.dates.responseDeadline;
  if (!fact.value || fact.unavailableReason) return;
  let day: string;
  let startAt: string | undefined;
  try {
    if (fact.precision === "date") {
      const date = validDay(fact.value);
      if (!date) return;
      day = date;
    } else if (fact.precision === "timestamp") {
      startAt = Temporal.Instant.from(fact.value).toString();
      day = instantDay(startAt, zone);
    } else return;
  } catch {
    return;
  }
  let href: string | undefined;
  if (record.capabilities.sourceClick.allowed && authoritativeSourceUrl) {
    try {
      const url = new URL(authoritativeSourceUrl);
      if (url.protocol === "https:" && !url.username && !url.password)
        href = url.toString();
    } catch {
      // An unavailable source link does not fabricate another destination.
    }
  }
  return {
    key: `funding:${JSON.stringify([record.source, record.sourceRecordId, record.sourceFacts.provenance])}`,
    kind: "deadline",
    sourceId: record.sourceRecordId,
    title: record.title,
    day,
    startAt,
    timeZone: zone,
    status: `${fundingSourceLabel(record.source)} · ${record.lifecycle}`,
    href,
    provenance: `${fundingSourceLabel(record.source)} response deadline · ${fact.precision === "date" ? "source date only" : `source timestamp, displayed in ${zone}`} · ${record.sourceFacts.provenance}`,
  };
}
