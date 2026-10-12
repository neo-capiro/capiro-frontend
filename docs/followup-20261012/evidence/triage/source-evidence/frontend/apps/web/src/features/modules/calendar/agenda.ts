import type { z } from "zod";
import type { EffectiveDateRecord } from "../../../shared/federal-register/effective-dates";
import type { commentDeadline } from "../../../shared/capiro/operations/calendar";
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
    const date = task.dueOn ?? task.startOn;
    if (!date || task.archived) return [];
    const time = task.dueOn ? task.dueTime : task.startTime;
    return [
      {
        key: `task:${task.id}`,
        source: "Planner" as const,
        title: task.name,
        date,
        time: time ?? "Date only",
        sortTime: time ?? undefined,
        context: `${task.dueOn ? "Due date" : "Start date"}${time && task.timeZone ? ` · ${task.timeZone}` : ""}`,
        href: `/modules/planner?task=${encodeURIComponent(task.id)}`,
      },
    ];
  });
}
export function commentDeadlineItems(
  records: z.infer<typeof commentDeadline>[],
): AgendaItem[] {
  return records.map((record) => ({
    key: `federal-register:${record.documentNumber}`,
    source: "Deadlines",
    title: record.title,
    date: record.commentEndDate.slice(0, 10),
    time: "Comments close",
    context: `Federal Register · ${record.documentNumber}`,
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
