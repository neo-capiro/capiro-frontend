import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  syncIntentSchema,
  calendarReceiptSchema,
  type CalendarSyncIntent,
} from "./contracts";
import { verifyCalendarAccount } from "./api";

const retainedSchema = z
  .object({
    intent: syncIntentSchema,
    requestId: z.uuid(),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type CalendarCommand = z.infer<typeof retainedSchema>;
export const calendarRecoveryContract = {
  schema: retainedSchema,
  requestId: (value: CalendarCommand) => value.requestId,
};
export const calendarRecoveryScope = (actor: ClientWriter) =>
  JSON.stringify([
    "calendar-sync",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
  ]);

export async function prepareCalendarSync(
  actor: ClientWriter,
  change: CalendarSyncIntent,
  requestId = crypto.randomUUID(),
): Promise<CalendarCommand> {
  const intent = syncIntentSchema.parse(change);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        1,
        actor.tenantId.toLowerCase(),
        actor.userId.toLowerCase(),
        intent.connectionId,
        intent.provider,
        intent.range ?? null,
      ]),
    ),
  );
  return retainedSchema.parse({
    intent,
    requestId,
    payloadDigest: Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join(""),
  });
}
export async function requestCalendarSync(
  api: ApiClient,
  actor: ClientWriter,
  command: CalendarCommand,
  send: boolean,
  signal: AbortSignal,
  guard: () => void,
) {
  const canonical = await prepareCalendarSync(
    actor,
    command.intent,
    command.requestId,
  );
  if (JSON.stringify(canonical) !== JSON.stringify(command))
    throw new Error("The saved calendar request is inconsistent.");
  guard();
  signal.throwIfAborted();
  const provider =
    command.intent.provider === "microsoft_365" ? "microsoft" : "google";
  const path = `engagement/integrations/${provider}/${command.intent.connectionId}/calendar-commands`;
  return api.request(
    "core",
    path + (send ? "" : "/" + command.requestId),
    calendarReceiptSchema.refine(
      (value) =>
        value.requestId === command.requestId &&
        value.connectionId === command.intent.connectionId &&
        value.provider === command.intent.provider &&
        value.payloadDigest === command.payloadDigest &&
        JSON.stringify(value.range) ===
          JSON.stringify(command.intent.range ?? null) &&
        (!command.intent.range ||
          JSON.stringify(value.window) ===
            JSON.stringify(command.intent.range)),
    ),
    {
      method: send ? "POST" : "GET",
      ...(send
        ? {
            body: {
              schemaVersion: 1,
              requestId: command.requestId,
              range: command.intent.range ?? null,
            },
          }
        : {}),
      signal,
    },
  );
}
export type CalendarAction =
  | { kind: "start"; intent: CalendarSyncIntent }
  | { kind: "check" | "continue" | "done"; expected: CalendarCommand };

/** Keep the existing actor-scoped journal until the same authenticated request is completed. */
export async function runCalendarSync(
  api: ApiClient,
  actor: ClientWriter,
  action: CalendarAction,
  guard: () => void,
  signal: AbortSignal,
  observe: (command: CalendarCommand | null) => void,
  authorize: () => Promise<void>,
) {
  const scope = calendarRecoveryScope(actor);
  return withRecoveryCommandLock(scope, guard, async () => {
    let command = await readRecovery(scope, calendarRecoveryContract, guard);
    observe(command);
    if (action.kind === "start") {
      if (command)
        throw new ApiError(
          409,
          "Recover the saved calendar import before starting another.",
        );
      await authorize();
      guard();
      const intent = syncIntentSchema.parse(action.intent);
      await verifyCalendarAccount(api, intent, actor.userId, guard, signal);
      const prepared = await prepareCalendarSync(actor, intent);
      guard();
      signal.throwIfAborted();
      command = await reserveRecovery(
        scope,
        prepared.requestId,
        prepared,
        calendarRecoveryContract,
        guard,
      );
      observe(command);
      if (command.requestId !== prepared.requestId)
        throw new ApiError(409, "Another calendar import needs recovery.");
    } else {
      if (
        !command ||
        JSON.stringify(command) !== JSON.stringify(action.expected)
      )
        throw new ApiError(
          409,
          "The saved calendar import changed in another tab. Reload recovery.",
        );
      await authorize();
      guard();
      if (action.kind === "continue")
        await verifyCalendarAccount(
          api,
          command.intent,
          actor.userId,
          guard,
          signal,
          true,
        );
    }
    guard();
    signal.throwIfAborted();
    const result = await requestCalendarSync(
      api,
      actor,
      command,
      action.kind === "start" || action.kind === "continue",
      signal,
      guard,
    );
    guard();
    signal.throwIfAborted();
    if (action.kind === "done") {
      if (result.status !== "completed")
        throw new ApiError(409, "This calendar import has not completed.");
      await acknowledgeRecovery(scope, command.requestId, guard);
      observe(null);
    }
    return result;
  });
}
