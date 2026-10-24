import { z } from "zod";
import { meetingSchema, type Meeting } from "./contracts";

export const meetingInputSchema = z.object({
  subject: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  clientId: z.string().nullable().optional(),
  expectedRevision: z.string().datetime().optional(),
});
export type MeetingInput = z.infer<typeof meetingInputSchema>;

/** Check only native persisted input semantics, not derived virtuality or association hints. */
export function meetingSaveReceiptSchema(
  id: string | undefined,
  input: MeetingInput,
) {
  return meetingSchema.refine(
    (row) =>
      Boolean(row.id.trim()) &&
      (!id || row.id === id) &&
      row.subject === input.subject.trim() &&
      (input.description === undefined ||
        row.description === (input.description?.trim() || null)) &&
      (input.location === undefined ||
        row.location === (input.location?.trim() || null)) &&
      Date.parse(row.startsAt) === Date.parse(input.startsAt) &&
      Date.parse(row.endsAt) === Date.parse(input.endsAt) &&
      // An unscoped create may be associated by the backend. An explicit update
      // to null clears the association; neither case requires a browser echo.
      (input.clientId === undefined ||
        (!id && !input.clientId) ||
        (row.client?.id ?? null) === input.clientId),
    "The saved meeting does not match the submitted meeting and client.",
  );
}

/** Preserve automatic/internal provenance unless the reviewed association changes. */
export function meetingAssignmentFields(
  meeting: Meeting | undefined,
  target: string | null,
) {
  if (!meeting) return target ? { clientId: target } : {};
  if ((meeting.client?.id ?? null) === target) return {};
  if (!meeting.updatedAt)
    throw new Error("Refresh the meeting before changing its client.");
  return { clientId: target, expectedRevision: meeting.updatedAt };
}
