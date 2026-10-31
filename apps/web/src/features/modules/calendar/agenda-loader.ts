import type { CapiroApi } from "../../../shared/capiro/http";
import { loadEffectiveDatePages } from "../../../shared/federal-register/effective-dates";
import { loadCommentDeadlinePages } from "../../../shared/federal-register/comment-deadlines";
import {
  hearingCoverageText,
  loadHearingCalendar,
} from "../../../shared/capiro/operations/legiwatch-calendar-feed";
import type { PlannerTask } from "../../../shared/capiro/operations/planner-schemas";
import type { capiroOperations } from "../../../shared/capiro/registry";
import {
  commentDeadlineItems,
  fundingDeadlineItems,
  hearingItems,
  plannerItems,
  type AgendaItem,
} from "./agenda";
import { inCalendarRange, type CalendarRange } from "./range";

type SourceApi = CapiroApi<typeof capiroOperations>;
type SourceResult = { items: AgendaItem[]; warning?: string };
export async function loadPlanner(
  api: SourceApi,
  signal: AbortSignal,
): Promise<SourceResult> {
  const items: PlannerTask[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page += 1) {
    const result = await api.request(
      "planner.tasks",
      { query: { archived: "false", ...(cursor ? { cursor } : {}) } },
      { signal: signal },
    );
    items.push(...result.items);
    if (!result.nextCursor)
      return { items: plannerItems(items), warning: undefined };
    if (seen.has(result.nextCursor))
      return {
        items: plannerItems(items),
        warning:
          "Planner pagination repeated a cursor; some work is unavailable.",
      };
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  return {
    items: plannerItems(items),
    warning:
      "Planner has more pages than this view can load. Its agenda is incomplete.",
  };
}
export async function loadHearings(
  api: SourceApi,
  range: CalendarRange,
  signal: AbortSignal,
): Promise<SourceResult> {
  const result = await loadHearingCalendar(
    (query) => api.request("legiwatch.calendar", { query }, { signal }),
    (query) => api.request("legiwatch.calendarCoverage", { query }, { signal }),
    {
      from: range.firstDay,
      to: range.lastDay,
      jurisdiction: "ALL",
      sort: "asc",
    },
  );
  return {
    items: hearingItems(result.rows),
    warning:
      [...result.warnings, ...hearingCoverageText(result.coverage)].join(" ") ||
      undefined,
  };
}
export async function loadCommentDeadlines(
  api: SourceApi,
  range: CalendarRange,
  signal: AbortSignal,
): Promise<SourceResult> {
  const result = await loadCommentDeadlinePages(
    (query) =>
      api.request("calendar.commentDeadlineCalendar", { query }, { signal }),
    range.firstDay,
    range.lastDay,
    signal,
  );
  return {
    items: commentDeadlineItems(result.records),
    warning: `${result.warnings.join(" ")} Comment deadlines are not effective dates.`,
  };
}
export async function loadFunding(
  api: SourceApi,
  range: CalendarRange,
  signal: AbortSignal,
): Promise<SourceResult> {
  const items: AgendaItem[] = [];
  let incomplete = false;
  for (let page = 1; page <= 100; page += 1) {
    const result = await api.request(
      "intelligence.funding.search",
      {
        query: {
          mode: "all",
          sort: "deadline",
          direction: "asc",
          deadlineWindow: "any",
          deadlineFrom: range.firstDay,
          deadlineTo: range.lastDay,
          page,
          pageSize: 100,
        },
      },
      { signal: signal },
    );
    items.push(...fundingDeadlineItems(result.opportunities));
    incomplete ||= !result.catalogComplete || result.totalIsCapped;
    if (
      result.opportunities.length < result.pageSize ||
      (result.total !== null && page * result.pageSize >= result.total)
    )
      return {
        items,
        warning: incomplete
          ? "The funding source reports incomplete or capped coverage; deadline counts cover loaded records only."
          : undefined,
      };
  }
  return {
    items,
    warning:
      "Funding has more pages than this view can load. Deadline coverage is incomplete.",
  };
}

/** Each source retains its own ACL, date contract and completeness signal. */
export async function loadAgendaSources(
  api: SourceApi,
  range: CalendarRange,
  signal: AbortSignal,
  hearingsOnly = false,
) {
  const sources = [
    {
      name: "Government",
      load: async (): Promise<SourceResult> => {
        const result = await loadEffectiveDatePages(
          (query) =>
            api.request("calendar.effectiveDates", { query }, { signal }),
          range.firstDay,
          range.lastDay,
        );
        return {
          items: result.records.map((record) => ({
            key: `effective:${record.documentNumber}`,
            source: "Government",
            title: record.title,
            date: record.date,
            time: "Publisher effective date · date only",
            context: `Federal Register · ${record.documentNumber} · coverage incomplete`,
            effectiveDate: record,
          })),
          warning: result.warnings.join(" "),
        };
      },
    },
    { name: "Planner", load: () => loadPlanner(api, signal) },
    { name: "Hearings", load: () => loadHearings(api, range, signal) },
    {
      name: "Federal Register deadlines",
      load: () => loadCommentDeadlines(api, range, signal),
    },
    { name: "Funding deadlines", load: () => loadFunding(api, range, signal) },
  ];
  const selectedSources = hearingsOnly
    ? sources.filter((source) => source.name === "Hearings")
    : sources;
  const results = await Promise.allSettled(
    selectedSources.map((source) => source.load()),
  );
  const warnings: string[] = [];
  const items: AgendaItem[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      if (result.value.warning) warnings.push(result.value.warning);
    } else
      warnings.push(
        `${selectedSources[index]!.name} unavailable: ${result.reason instanceof Error ? result.reason.message : "The source could not be loaded."}`,
      );
  });
  return {
    items: items.filter((item) => inCalendarRange(item.date, range)),
    warnings,
  };
}
