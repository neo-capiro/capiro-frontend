import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  ambiguousClientWrite,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { saveContact } from "./api";
import { contactInput, type ContactInput } from "./contracts";

const attemptSchema = z
  .object({ requestId: z.uuid(), values: contactInput, editable: z.boolean() })
  .strict();
export type ContactCreateAttempt = z.infer<typeof attemptSchema>;
export const createContract = {
  schema: attemptSchema,
  requestId: (attempt: ContactCreateAttempt) => attempt.requestId,
};
export const createScope = (actor: ClientWriter, prospectId: string) =>
  JSON.stringify([
    "prospect-contact-create",
    actor.tenantId,
    actor.userId,
    prospectId,
  ]);

type Action =
  | { kind: "save"; values: ContactInput; expected?: ContactCreateAttempt }
  | { kind: "retry"; expected: ContactCreateAttempt };

/** The existing journal owns persistence and tab serialization. Only a matching
 * native save receipt settles creation; an error never proves it did not run. */
export async function runContactCreate(
  api: ApiClient,
  actor: ClientWriter,
  prospectId: string,
  action: Action,
  guard: () => void,
  signal: AbortSignal,
  observe: (attempt: ContactCreateAttempt | null) => void,
) {
  const scope = createScope(actor, prospectId);
  return withRecoveryCommandLock(scope, guard, async () => {
    let attempt = await readRecovery(scope, createContract, guard);
    observe(attempt);
    if (action.kind === "save") {
      if (
        (attempt || action.expected) &&
        (!attempt ||
          !attempt.editable ||
          JSON.stringify(attempt) !== JSON.stringify(action.expected))
      )
        throw new ApiError(
          409,
          "Review the earlier contact creation before starting another.",
        );
      const prepared = attemptSchema.parse({
        requestId: attempt?.requestId ?? crypto.randomUUID(),
        values: action.values,
        editable: false,
      });
      if (attempt) {
        await updateRecovery(
          scope,
          attempt.requestId,
          prepared,
          createContract,
          guard,
        );
        attempt = prepared;
      } else {
        attempt = await reserveRecovery(
          scope,
          prepared.requestId,
          prepared,
          createContract,
          guard,
        );
      }
      observe(attempt);
      if (attempt.requestId !== prepared.requestId)
        throw new ApiError(
          409,
          "Another contact creation needs recovery. No new contact was sent.",
        );
    } else if (
      !attempt ||
      JSON.stringify(attempt) !== JSON.stringify(action.expected)
    ) {
      throw new ApiError(
        409,
        "The saved contact creation changed. Reopen it before continuing.",
      );
    }
    guard();
    signal.throwIfAborted();
    let result;
    try {
      result = await saveContact(
        api,
        prospectId,
        attempt.values,
        attempt.requestId,
        undefined,
        signal,
      );
    } catch (error) {
      // Only a first/corrected submission with a definite refusal is editable.
      // A later refusal cannot settle an earlier unknown dispatch.
      if (action.kind === "save" && !ambiguousClientWrite(error)) {
        guard();
        signal.throwIfAborted();
        const refused = { ...attempt, editable: true };
        await updateRecovery(
          scope,
          attempt.requestId,
          refused,
          createContract,
          guard,
        );
        observe(refused);
      }
      throw error;
    }
    guard();
    signal.throwIfAborted();
    await acknowledgeRecovery(scope, attempt.requestId, guard);
    observe(null);
    return result;
  });
}
