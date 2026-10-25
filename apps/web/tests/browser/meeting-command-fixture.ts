import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import type { MeetingAttempt } from "../../src/features/portfolio/calendar/commands/recovery";
import { commandActor, commandMeeting } from "./meeting-command-data";
import { json } from "./fixtures";

export type CommandInput = MeetingAttempt["input"];
export async function installCommandActor(page: Page) {
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: commandActor.userId, email: "synthetic@example.test" },
      tenant: { id: commandActor.tenantId, name: "Synthetic" },
      role: "standard_user",
    }),
  );
}
/** Synthetic HTTP boundary fixture; real transaction behavior is covered by Core PG tests. */
export function commandReceipt(
  input: CommandInput,
  result?: {
    meetingId?: string;
    clientId?: string | null;
    revision?: string;
    artifacts?: Array<{ type: string; id: string; revision: string | number }>;
  },
) {
  const revision = "2026-10-25T00:00:00.000Z";
  return {
    schemaVersion: 1,
    tenantId: commandActor.tenantId,
    actorUserId: commandActor.userId,
    requestId: input.requestId,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify([
          "meeting-command",
          1,
          commandActor.tenantId,
          commandActor.userId,
          input,
        ]),
      )
      .digest("hex"),
    operation: input.operation,
    requestedMeetingId: input.meetingId,
    expectedClientId: input.expectedClientId,
    status: "completed",
    result: {
      meetingId: input.meetingId ?? commandMeeting.id,
      clientId: input.meeting?.assignClient
        ? input.meeting.clientId
        : input.expectedClientId,
      revision,
      artifacts: input.artifact
        ? [
            {
              type: input.operation.startsWith("note-") ? "note" : "debrief",
              id: input.artifact.id ?? "00000000-0000-4000-8000-000000000009",
              revision,
            },
          ]
        : input.artifacts.map((row) => ({
            ...row,
            revision:
              typeof row.revision === "number" ? row.revision + 1 : revision,
          })),
      ...result,
    },
    refusal: null,
    createdAt: revision,
    available: true,
  };
}
