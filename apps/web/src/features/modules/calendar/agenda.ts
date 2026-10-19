import type { EffectiveDateRecord } from "../../../shared/federal-register/effective-dates";
import type { CommentDeadlineRecord } from "../../../shared/federal-register/comment-deadlines";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import type { FundingRecord } from "../../../shared/capiro/operations/intelligence-funding";
import type { CalendarHearing } from "../../../shared/capiro/operations/legiwatch-calendar-schemas";
import type { PlannerTask } from "../../../shared/capiro/operations/planner-schemas";
import { eventClock, eventDay, eventTime } from "./range";

export const agendaSources = [
  "Meetings",
  "Hearings",
  "Planner",
  "Government",
  "Deadlines",
] as const;
export type AgendaSource = (typeof agendaSources)[number];
export type AgendaItem = {
  key: string;
  source: AgendaSource;
  title: string;
  date: string;
  time: string;
  sortTime?: string;
  context: string;
  meeting?: EngagementMeeting;
  href?: string;
  effectiveDate?: EffectiveDateRecord;
};
export function meetingItems(meetings: EngagementMeeting[]): AgendaItem[] {
  return meetings.map((meeting) => ({
    key: `meeting:${meeting.id}`,
    source: "Meetings",
    title: meeting.subject,
    date: eventDay(meeting.startsAt),
    time: eventTime(meeting.startsAt),
    sortTime: eventClock(meeting.startsAt),
    context: `${meeting.client?.name ?? "Unassigned"} · Eastern time`,
    meeting,
  }));
}
export function hearingItems(hearings: CalendarHearing[]): AgendaItem[] {
  return hearings.map((hearing) => ({
    key: `hearing:${hearing.id}`,
    source: "Hearings",
    title: hearing.title,
    date: hearing.date.slice(0, 10),
    time: hearing.startsAt
      ? eventTime(hearing.startsAt)
      : (hearing.time ?? "Time not confirmed"),
    sortTime: hearing.startsAt ? eventClock(hearing.startsAt) : undefined,
    context: `${hearing.committeeName} · ${hearing.startsAt ? "Eastern time" : hearing.timezone}`,
    href: `/modules/intelligence?view=legiwatch&hearing=${encodeURIComponent(hearing.id)}`,
  }));
}
export function plannerItems(tasks: PlannerTask[]): AgendaItem[] {
  return tasks.flatMap((task) => {
    if (task.archived) return [];
    const sameOccurrence =
      task.startOn === task.dueOn &&
      (task.startTime ?? null) === (task.dueTime ?? null);
    return (["start", "due"] as const).flatMap((kind): AgendaItem[] => {
      const date = kind === "start" ? task.startOn : task.dueOn;
      if (!date || (kind === "start" && sameOccurrence)) return [];
      const time = kind === "start" ? task.startTime : task.dueTime;
      const label = sameOccurrence
        ? "Start and due date"
        : kind === "start"
          ? "Start date"
          : "Due date";
      return [
        {
          key: `task:${task.id}:${kind}`,
          source: "Planner",
          title: task.name,
          date,
          time: time ?? "Date only",
          sortTime: time ?? undefined,
          context: `${label}${time && task.timeZone ? ` · ${task.timeZone}` : ""}`,
          href: `/modules/planner?task=${encodeURIComponent(task.id)}`,
        },
      ];
    });
  });
}

export function commentDeadlineItems(
  records: CommentDeadlineRecord[],
): AgendaItem[] {
  return records.map((record) => ({
    key: `federal-register:${record.documentNumber}`,
    source: "Deadlines",
    title: record.title,
    date: record.date,
    time: "Comments close · date only",
    context: `Federal Register · ${record.documentNumber} · Cached comments_close_on; raw publisher value unverified`,
    href: record.htmlUrl ?? undefined,
  }));
}
export function fundingDeadlineItems(records: FundingRecord[]): AgendaItem[] {
  return records.flatMap((record) =>
    record.deadline && /^\d{4}-\d{2}-\d{2}/.test(record.deadline)
      ? [
          {
            key: `funding:${record.source}:${record.sourceRecordId}`,
            source: "Deadlines" as const,
            title: record.title,
            date: record.deadline.slice(0, 10),
            time: `Source deadline: ${record.deadline}`,
            context: `${record.agency ?? record.source} · Source date precision retained`,
            href: record.sourceUrl ?? undefined,
          },
        ]
      : [],
  );
}
export function uniqueAgenda(items: AgendaItem[]): AgendaItem[] {
  return [...new Map(items.map((item) => [item.key, item])).values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.sortTime ?? "").localeCompare(b.sortTime ?? "") ||
      a.title.localeCompare(b.title),
  );
}
export function safeAgendaHref(href: string | undefined) {
  if (!href) return undefined;
  if (href.startsWith("/modules/")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
