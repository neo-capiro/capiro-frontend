import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  retireMeetingRefusalRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  commandSchema,
  parseMeetingCommand,
  type MeetingCommand,
} from "./input";
import { meetingReceiptSchema } from "./receipt";

const retained = z
  .object({
    input: commandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type MeetingAttempt = z.infer<typeof retained>;
export type MeetingChange = Omit<MeetingCommand, "schemaVersion" | "requestId">;
export const meetingCommandContract = {
  schema: retained,
  requestId: (value: MeetingAttempt) => value.input.requestId,
};
export const meetingCommandScope = (
  actor: ClientWriter,
  meetingId: string | null,
) =>
  JSON.stringify([
    "meeting-command",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
    meetingId?.toLowerCase() ?? "create",
  ]);

export async function prepareMeetingCommand(
  actor: ClientWriter,
  change: MeetingChange,
  requestId = crypto.randomUUID(),
): Promise<MeetingAttempt> {
  const input = parseMeetingCommand({ ...change, schemaVersion: 1, requestId });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "meeting-command",
        1,
        actor.tenantId.toLowerCase(),
        actor.userId.toLowerCase(),
        input,
      ]),
    ),
  );
  return {
    input,
    payloadDigest: Array.from(new Uint8Array(bytes), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function requestMeetingCommand(
  api: ApiClient,
  actor: ClientWriter,
  attempt: MeetingAttempt,
  send: boolean,
  signal: AbortSignal,
) {
  // A valid encrypted record still needs exact canonical binding on recovery.
  const canonical = await prepareMeetingCommand(
    actor,
    attempt.input,
    attempt.input.requestId,
  );
  if (JSON.stringify(canonical) !== JSON.stringify(attempt))
    throw new Error("The saved meeting action is inconsistent.");
  return api.request(
    "core",
    `engagement/meeting-commands${send ? "" : `/${attempt.input.requestId}`}`,
    meetingReceiptSchema(actor, attempt.input, attempt.payloadDigest),
    {
      method: send ? "POST" : "GET",
      ...(send ? { body: attempt.input } : {}),
      signal,
    },
  );
}
export type MeetingAction =
  | { kind: "save"; change: MeetingChange }
  | { kind: "check" | "retry" | "done" | "review"; expected: MeetingAttempt };

export async function runMeetingCommand(
  api: ApiClient,
  actor: ClientWriter,
  meetingId: string | null,
  action: MeetingAction,
  guard: () => void,
  signal: AbortSignal,
  observe: (value: MeetingAttempt | null) => void,
  authorize: () => Promise<void> = async () => {},
) {
  const scope = meetingCommandScope(actor, meetingId);
  return withRecoveryCommandLock(scope, guard, async () => {
    let attempt = await readRecovery(scope, meetingCommandContract, guard);
    observe(attempt);
    if (action.kind === "save") {
      if (attempt)
        throw new ApiError(
          409,
          "Recover the saved meeting action before starting another.",
        );
      if (action.change.meetingId !== meetingId)
        throw new ApiError(
          409,
          "The meeting changed. Reopen it before saving.",
        );
      await authorize();
      guard();
      const prepared = await prepareMeetingCommand(actor, action.change);
      guard();
      signal.throwIfAborted();
      attempt = await reserveRecovery(
        scope,
        prepared.input.requestId,
        prepared,
        meetingCommandContract,
        guard,
      );
      observe(attempt);
      if (attempt.input.requestId !== prepared.input.requestId)
        throw new ApiError(
          409,
          "Another meeting action needs recovery. No new action was sent.",
        );
    } else if (
      !attempt ||
      JSON.stringify(attempt) !== JSON.stringify(action.expected)
    ) {
      throw new ApiError(
        409,
        "The saved meeting action changed in another tab. Reload recovery before continuing.",
      );
    } else {
      await authorize();
      guard();
    }
    if (attempt.input.meetingId !== meetingId)
      throw new ApiError(409, "The saved action belongs to another meeting.");
    guard();
    signal.throwIfAborted();
    const result = await requestMeetingCommand(
      api,
      actor,
      attempt,
      action.kind === "save" || action.kind === "retry",
      signal,
    );
    guard();
    signal.throwIfAborted();
    if (action.kind === "done") {
      if (result.status !== "completed")
        throw new ApiError(409, "This action has not completed.");
      await acknowledgeRecovery(scope, attempt.input.requestId, guard);
      observe(null);
    } else if (action.kind === "review") {
      if (result.status !== "refused")
        throw new ApiError(
          409,
          "Only a confirmed refusal can return to review.",
        );
      await retireMeetingRefusalRecovery(
        scope,
        attempt.input.requestId,
        {
          requestId: result.requestId,
          code: result.refusal!.code,
          status: result.status,
        },
        guard,
      );
      observe(null);
    }
    return result;
  });
}
