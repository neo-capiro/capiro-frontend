import { Temporal } from "temporal-polyfill";
import type { HillDayResolutionRead } from "../../../../shared/capiro/operations/workspace-schemas";

export type SavedMeetingFacts = NonNullable<
  HillDayResolutionRead["meetingFacts"][number]["facts"]
>;
export type EndpointDraft = {
  date: string;
  time: string;
  occurrence: "" | "earlier" | "later";
};
export type FactsDraft = {
  subject: string;
  location: string;
  start: EndpointDraft;
  end: EndpointDraft;
};
export type FactsChanges = Partial<
  Pick<SavedMeetingFacts, "subject" | "startsAt" | "endsAt">
> & { location?: string };

export function bindMeetingFacts(
  data: HillDayResolutionRead,
  documentId: string,
  meetingId: string,
  eventId: string,
) {
  const rows = data.meetingFacts.filter((row) => row.meetingId === meetingId);
  if (
    data.documentId !== documentId ||
    rows.length !== 1 ||
    rows[0]!.eventId !== eventId
  )
    throw new Error(
      "Saved meeting details do not match this document and meeting. Refresh to check again.",
    );
  return rows[0]!.facts;
}

export function savedEndpoint(value: string, zone: string) {
  try {
    const zoned = Temporal.Instant.from(value).toZonedDateTimeISO(zone);
    const date = zoned.toPlainDate().toString();
    const time = zoned.toPlainTime().toString();
    // Native time inputs support at most millisecond precision. Keep richer
    // saved values read-only, rather than rounding unrelated text edits.
    return {
      date,
      time,
      offset: zoned.offset,
      editable:
        /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(date) && !/\.\d{4}/.test(time),
    };
  } catch {
    return { date: "", time: "", offset: "", editable: false };
  }
}

export function createFactsDraft(facts: SavedMeetingFacts): FactsDraft {
  const endpoint = (value: string): EndpointDraft => {
    const saved = savedEndpoint(value, facts.timeZone);
    return { date: saved.date, time: saved.time, occurrence: "" };
  };
  return {
    subject: facts.subject,
    location: facts.location ?? "",
    start: endpoint(facts.startsAt),
    end: endpoint(facts.endsAt),
  };
}

type EndpointResult = {
  value?: string;
  offset: string;
  error?: string;
  choices?: { value: "earlier" | "later"; offset: string }[];
};
export function resolveEndpoint(
  value: string,
  zone: string,
  draft: EndpointDraft,
): EndpointResult {
  const saved = savedEndpoint(value, zone);
  if (!saved.editable) return { value, offset: saved.offset };
  try {
    const plain = Temporal.PlainDateTime.from(`${draft.date}T${draft.time}`, {
      overflow: "reject",
    });
    // Native inputs may pad fractional zeros. Equivalent wall-clock text is
    // still unchanged, including the known occurrence of a saved repeated time.
    if (plain.equals(`${saved.date}T${saved.time}`))
      return { value, offset: saved.offset };
    const earlier = plain.toZonedDateTime(zone, { disambiguation: "earlier" });
    const later = plain.toZonedDateTime(zone, { disambiguation: "later" });
    if (
      !earlier.toPlainDateTime().equals(plain) ||
      !later.toPlainDateTime().equals(plain)
    )
      return {
        offset: "",
        error: `This time does not exist in ${zone}. Choose another time.`,
      };
    if (earlier.epochNanoseconds !== later.epochNanoseconds) {
      const choices = [
        { value: "earlier" as const, offset: earlier.offset },
        { value: "later" as const, offset: later.offset },
      ];
      if (!draft.occurrence)
        return {
          offset: "",
          choices,
          error: "Choose which occurrence of this repeated time to use.",
        };
      const chosen = draft.occurrence === "earlier" ? earlier : later;
      return {
        value: chosen.toInstant().toString(),
        offset: chosen.offset,
        choices,
      };
    }
    return { value: earlier.toInstant().toString(), offset: earlier.offset };
  } catch {
    return { offset: "", error: "Enter a valid date and time." };
  }
}

export function prepareFactsChanges(
  facts: SavedMeetingFacts,
  draft: FactsDraft,
) {
  const changes: FactsChanges = {};
  const errors: string[] = [];
  if (draft.subject !== facts.subject) {
    if (!draft.subject.trim() || draft.subject.length > 240)
      errors.push("Enter a subject of up to 240 characters.");
    else changes.subject = draft.subject;
  }
  if (draft.location !== (facts.location ?? "")) {
    if (!draft.location.trim() || draft.location.length > 240)
      errors.push(
        "Enter a nonempty location of up to 240 characters. Clearing a saved location is not supported.",
      );
    else changes.location = draft.location;
  }
  const start = resolveEndpoint(facts.startsAt, facts.timeZone, draft.start);
  const end = resolveEndpoint(facts.endsAt, facts.timeZone, draft.end);
  if (start.error) errors.push(`Start: ${start.error}`);
  if (end.error) errors.push(`End: ${end.error}`);
  if (start.value && end.value) {
    // Match Core's millisecond ordering while retaining original source strings.
    const instant = (value: string) =>
      Temporal.Instant.fromEpochMilliseconds(Date.parse(value));
    if (Temporal.Instant.compare(instant(end.value), instant(start.value)) <= 0)
      errors.push("End must be after Start.");
    if (start.value !== facts.startsAt) changes.startsAt = start.value;
    if (end.value !== facts.endsAt) changes.endsAt = end.value;
  }
  return {
    changes,
    errors,
    start,
    end,
    changed: Object.keys(changes).length > 0,
  };
}
