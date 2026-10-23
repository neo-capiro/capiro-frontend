import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import {
  prepareOrdinaryRecovery,
  retainCanonicalSignature,
} from "./ordinary-write-recovery";
import {
  reconcileSettingsWrite,
  settingsWriteNeedsReadback,
} from "./security-write-reconciliation";
import type {
  SettingsWrite,
  SettingsWriteJournal,
} from "./security-write-types";
import {
  assertSettingsReceipt,
  isDefiniteSettingsRejection,
  snapshotSettingsWrite,
  uncertainSettingsWrite,
} from "./security-writes";

type Execution = {
  api: CapiroApi<typeof capiroOperations>;
  journal: SettingsWriteJournal;
  verified: boolean;
  subjectId?: string;
};

/** Resend replaces a provider invitation; capture its current identity before dispatch. */
async function prepareWrite(
  execution: Execution,
  write: SettingsWrite,
  signal?: AbortSignal,
) {
  await prepareOrdinaryRecovery(write, execution.journal.scopeKey);
  if (write.operation !== "settings.team.resend") return;
  const invitations = await execution.api.request(
    "settings.team.invitations",
    {},
    { signal },
  );
  const invitation = invitations.find(
    (entry) => entry.id === write.input.params?.invitationId,
  );
  if (!invitation)
    throw new Error(
      "The invitation is no longer available. Reload the team before trying again.",
    );
  write.expectedInvitation = { email: invitation.email, role: invitation.role };
}

/** A delivered receipt must identify this write before a readback can release its fence. */
async function confirmWrite(
  execution: Execution,
  write: SettingsWrite,
  captured: unknown,
  result: unknown,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  assertSettingsReceipt(write, result);
  write.receiptConfirmed = true;
  await retainCanonicalSignature(write, result);
  await execution.journal.persist(write, captured);
  if (
    settingsWriteNeedsReadback(write.operation) &&
    !(await reconcileSettingsWrite(
      execution.api,
      write,
      signal ?? new AbortController().signal,
    ))
  )
    throw new Error(uncertainSettingsWrite);
  execution.journal.clear(write);
}

/** Own one dispatch and its uncertainty; callers retain the operation's typed transport. */
export async function executeSettingsWrite<Input, Result>(
  execution: Execution,
  operation: string,
  input: Input,
  signal: AbortSignal | undefined,
  dispatch: (captured: Input) => Promise<Result>,
): Promise<Result> {
  if (!execution.verified)
    throw new Error("Your sign-in must be verified before changing settings.");
  if (execution.journal.current()) throw new Error(uncertainSettingsWrite);
  signal?.throwIfAborted();
  const captured = structuredClone(input);
  const write = snapshotSettingsWrite(operation, captured);
  write.subjectId = execution.subjectId;
  execution.journal.record(write);
  let dispatched = false;
  let accepted = false;
  try {
    await prepareWrite(execution, write, signal);
    await execution.journal.persist(write, captured);
    signal?.throwIfAborted();
    dispatched = true;
    const result = await dispatch(captured);
    accepted = true;
    await confirmWrite(execution, write, captured, result, signal);
    return result;
  } catch (error) {
    const definite =
      !dispatched || (!accepted && isDefiniteSettingsRejection(error));
    if (definite) execution.journal.clear(write);
    else execution.journal.markUnknown(write);
    throw definite ? error : new Error(uncertainSettingsWrite);
  }
}
