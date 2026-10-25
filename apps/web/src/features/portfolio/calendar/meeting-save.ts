import { z } from "zod";
import type { Meeting } from "./contracts";

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

/** Pin every edit; preserve automatic/internal provenance unless the association changes. */
export function meetingAssignmentFields(
  meeting: Meeting | undefined,
  target: string | null,
) {
  if (!meeting) return target ? { clientId: target } : {};
  if (!meeting.updatedAt)
    throw new Error("Refresh the meeting before saving changes.");
  if ((meeting.client?.id ?? null) === target)
    return { expectedRevision: meeting.updatedAt };
  return { clientId: target, expectedRevision: meeting.updatedAt };
}
