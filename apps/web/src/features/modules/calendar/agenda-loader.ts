import type { CapiroApi } from "../../../shared/capiro/http";
import type { CalendarHearing } from "../../../shared/capiro/operations/legiwatch-calendar-schemas";
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
  const items: CalendarHearing[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await api.request(
      "legiwatch.calendar",
      {
        query: {
          from: range.firstDay,
          to: range.lastDay,
          jurisdiction: "ALL",
          page,
          pageSize: 200,
          sort: "asc",
        },
      },
      { signal: signal },
    );
    items.push(...result.rows);
    if (page * result.pageSize >= result.total || !result.rows.length)
      return { items: hearingItems(items), warning: undefined };
  }
  return {
    items: hearingItems(items),
    warning:
      "The hearing feed has more pages than this view can load. Its agenda is incomplete.",
  };
}
export async function loadCommentDeadlines(
  api: SourceApi,
  signal: AbortSignal,
): Promise<SourceResult> {
  return {
    items: commentDeadlineItems(
      await api.request("calendar.commentDeadlines", {}, { signal: signal }),
    ),
    warning:
      "Federal Register deadlines cover the next 30 days and up to 50 records. Government milestones and forecasts have no verified calendar mapping.",
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
) {
  const sources = [
    { name: "Planner", load: () => loadPlanner(api, signal) },
    { name: "Hearings", load: () => loadHearings(api, range, signal) },
    {
      name: "Federal Register deadlines",
      load: () => loadCommentDeadlines(api, signal),
    },
    { name: "Funding deadlines", load: () => loadFunding(api, range, signal) },
  ];
  const results = await Promise.allSettled(
    sources.map((source) => source.load()),
  );
  const warnings: string[] = [];
  const items: AgendaItem[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      if (result.value.warning) warnings.push(result.value.warning);
    } else
      warnings.push(
        `${sources[index]!.name} unavailable: ${result.reason instanceof Error ? result.reason.message : "The source could not be loaded."}`,
      );
  });
  return {
    items: items.filter((item) => inCalendarRange(item.date, range)),
    warnings,
  };
}
