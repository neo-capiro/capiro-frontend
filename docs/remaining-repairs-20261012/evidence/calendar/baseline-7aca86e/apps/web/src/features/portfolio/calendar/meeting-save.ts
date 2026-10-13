import { z } from "zod";
import { meetingSchema } from "./contracts";

export const meetingInputSchema = z.object({
  subject: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  clientId: z.string().nullable().optional(),
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
