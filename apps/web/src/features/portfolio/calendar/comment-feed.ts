import { Temporal } from "temporal-polyfill";
import {
  commentDeadlinePage,
  loadCommentDeadlinePages,
} from "@/shared/federal-register/comment-deadlines";
import { queryString, type ApiClient } from "@/shared/portfolio/api/http";
import type { CalendarFeed } from "./contracts";
import { validDay } from "./range";

function sourceLink(value: string | null) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.toString();
  } catch {
    // Missing or unusable source links do not remove a valid cached date.
  }
}

export async function fetchCommentDeadlines(
  api: ApiClient,
  startDay: string,
  endDay: string,
  signal?: AbortSignal,
): Promise<CalendarFeed> {
  if (validDay(endDay) !== endDay)
    throw new Error("Choose a valid comment deadline range.");
  const lastDay = Temporal.PlainDate.from(endDay)
    .subtract({ days: 1 })
    .toString();
  const result = await loadCommentDeadlinePages(
    (query) =>
      api.request(
        "core",
        `federal-register/comment-deadline-calendar?${queryString(query)}`,
        commentDeadlinePage,
        { signal },
      ),
    startDay,
    lastDay,
    signal,
  );
  return {
    items: result.records.map((record) => ({
      key: `deadline:${record.documentNumber}`,
      kind: "deadline",
      sourceId: record.documentNumber,
      title: record.title,
      day: record.date,
      timeZone: "UTC",
      status: "Cached public comment deadline",
      href: sourceLink(record.htmlUrl),
      provenance:
        "Federal Register comments_close_on · cached date only · raw publisher value unverified",
    })),
    limitations: result.warnings,
  };
}
