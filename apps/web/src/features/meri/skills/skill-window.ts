import type { SkillWindow } from "../../../shared/meri-conversations/skill-draft";

export type WindowFields = Readonly<Record<string, string>>;
export const windowLabels: Record<SkillWindow["basis"], string> = {
  "calendar-week": "Calendar week",
  "calendar-month": "Calendar month",
  "calendar-year": "Calendar year",
  "relative-duration": "Number of days",
  explicit: "Exact timestamps",
  "fiscal-year": "Fiscal year and revision",
  unbounded: "All time",
};
export const windowFields = (window: SkillWindow | null): WindowFields =>
  window
    ? Object.fromEntries(
        Object.entries(window).map(([key, value]) => [key, String(value)]),
      )
    : {};

/** Preserve requested boundaries verbatim. Only the server resolves DST, weeks and fiscal calendars. */
export function requestedWindow(fields: WindowFields): unknown {
  const { basis, timezone } = fields;
  const number = (key: string) =>
    fields[key]?.trim() ? Number(fields[key]) : NaN;
  switch (basis) {
    case "unbounded":
      return { basis };
    case "calendar-week":
      return {
        basis,
        timezone,
        offset: number("offset"),
        weekStartsOn: fields.weekStartsOn,
      };
    case "calendar-month":
    case "calendar-year":
      return { basis, timezone, offset: number("offset") };
    case "relative-duration":
      return {
        basis,
        timezone,
        days: number("days"),
        anchorAt: fields.anchorAt,
      };
    case "explicit":
      return {
        basis,
        timezone,
        startInclusive: fields.startInclusive,
        endExclusive: fields.endExclusive,
      };
    case "fiscal-year":
      return {
        basis,
        timezone,
        year: number("year"),
        calendarId: fields.calendarId,
        stage: fields.stage,
        revisionId: fields.revisionId,
      };
    default:
      throw new Error("Choose a supported time window.");
  }
}
