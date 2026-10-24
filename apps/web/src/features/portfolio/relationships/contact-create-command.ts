import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { contactInput } from "./contracts";
import type { ContactValues } from "./contact-api";

const inputSchema = contactInput
  .extend({
    requestId: z.uuid(),
    email: z.email().nullable(),
    lastContact: z.null(),
  })
  .strict();
const retainedSchema = z
  .object({
    input: inputSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type ContactCreateAttempt = z.infer<typeof retainedSchema>;
export const contactCreateContract = {
  schema: retainedSchema,
  requestId: (value: ContactCreateAttempt) => value.input.requestId,
};
export const contactCreateScope = (actor: ClientWriter, clientId: string) =>
  JSON.stringify([
    "client-person-create",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
export async function prepareContactCreate(
  actor: ClientWriter,
  clientId: string,
  values: Omit<ContactValues, "email"> & { email: string | null },
  requestId: string = crypto.randomUUID(),
) {
  const body = contactInput.parse({
    ...values,
    email: values.email?.trim() ?? "",
  });
  const input = inputSchema.parse({
    ...body,
    email: body.email || null,
    lastContact: null,
    requestId,
  });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "client-person-create",
        1,
        actor.tenantId.toLowerCase(),
        actor.userId.toLowerCase(),
        clientId.toLowerCase(),
        input.requestId,
        input.name,
        input.title,
        input.email,
        input.phone,
        input.role,
        input.notes,
        input.lastContact,
      ]),
    ),
  );
  return {
    input,
    payloadDigest: Array.from(new Uint8Array(bytes), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
const receiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("completed"),
    tenantId: z.uuid(),
    actorUserId: z.uuid(),
    clientId: z.uuid(),
    requestId: z.uuid(),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    personId: z.uuid(),
    createdAt: z.iso.datetime(),
    available: z.boolean(),
  })
  .strict();
export type ContactCreateReceipt = z.infer<typeof receiptSchema>;
export async function contactCreateRequest(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  attempt: ContactCreateAttempt,
  send: boolean,
  signal: AbortSignal,
) {
  const schema = receiptSchema.refine(
    (value) =>
      value.tenantId === actor.tenantId.toLowerCase() &&
      value.actorUserId === actor.userId.toLowerCase() &&
      value.clientId === clientId.toLowerCase() &&
      value.requestId === attempt.input.requestId &&
      value.payloadDigest === attempt.payloadDigest,
    "Contact creation receipt does not match the original submission",
  );
  return api.request(
    "core",
    `clients/${z.uuid().parse(clientId)}/people${send ? "" : `/requests/${attempt.input.requestId}`}`,
    schema,
    {
      method: send ? "POST" : "GET",
      ...(send ? { body: attempt.input } : {}),
      signal,
    },
  );
}
type Action =
  | {
      kind: "save";
      values: Omit<ContactValues, "email"> & { email: string | null };
    }
  | { kind: "check" | "retry"; expected: ContactCreateAttempt };

/** Recovery uses the retained original command. Absence or a generic error never
 * clears it, and current roster contents are not a receipt. */
export async function runContactCreate(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  action: Action,
  guard: () => void,
  signal: AbortSignal,
  observe: (attempt: ContactCreateAttempt | null) => void,
) {
  const scope = contactCreateScope(actor, clientId);
  return withRecoveryCommandLock(scope, guard, async () => {
    let attempt = await readRecovery(scope, contactCreateContract, guard);
    observe(attempt);
    if (action.kind === "save") {
      if (attempt)
        throw new ApiError(
          409,
          "Check or retry the earlier contact save before starting another.",
        );
      const prepared = await prepareContactCreate(
        actor,
        clientId,
        action.values,
      );
      guard();
      attempt = await reserveRecovery(
        scope,
        prepared.input.requestId,
        prepared,
        contactCreateContract,
        guard,
      );
      observe(attempt);
      if (attempt.input.requestId !== prepared.input.requestId)
        throw new ApiError(
          409,
          "Another contact save needs recovery. No new contact was sent.",
        );
    } else if (
      !attempt ||
      JSON.stringify(attempt) !== JSON.stringify(action.expected)
    ) {
      throw new ApiError(
        409,
        "The saved contact attempt changed in another tab. Review it before continuing.",
      );
    }
    guard();
    signal.throwIfAborted();
    const result = await contactCreateRequest(
      api,
      actor,
      clientId,
      attempt,
      action.kind !== "check",
      signal,
    );
    guard();
    signal.throwIfAborted();
    await acknowledgeRecovery(scope, attempt.input.requestId, guard);
    observe(null);
    return result;
  });
}
