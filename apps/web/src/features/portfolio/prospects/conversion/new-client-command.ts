import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { prospectForIdSchema, type Prospect } from "../contracts";

const website = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "Use an HTTP or HTTPS website without credentials.");
export const newClientCommandSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: z.uuid(),
    prospectId: z.uuid(),
    expectedUpdatedAt: z.iso.datetime(),
    mode: z.literal("new_client"),
    clientName: z.string().trim().min(1).max(200),
    clientWebsite: website.nullable(),
    clientDescription: z.string().trim().min(1).max(600).nullable(),
  })
  .strict();
const newClientRefusalSchema = z
  .object({
    schemaVersion: z.literal(1),
    code: z.literal("PROSPECT_NEW_CLIENT_REFUSED"),
    requestId: z.uuid(),
    prospectId: z.uuid(),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.union([
      z.literal(400),
      z.literal(402),
      z.literal(404),
      z.literal(409),
    ]),
    message: z.string().min(1).max(2000),
  })
  .strict();
export const newClientAttemptSchema = z
  .object({
    command: newClientCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    refusal: newClientRefusalSchema.optional(),
  })
  .strict()
  .refine(
    (attempt) =>
      !attempt.refusal ||
      (attempt.refusal.requestId === attempt.command.requestId &&
        attempt.refusal.prospectId === attempt.command.prospectId &&
        attempt.refusal.payloadDigest === attempt.payloadDigest),
  );
export type NewClientAttempt = z.infer<typeof newClientAttemptSchema>;
const receiptSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  prospectId: z.uuid(),
  clientId: z.uuid(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  outcome: z.literal("created"),
  expectedUpdatedAt: z.iso.datetime(),
  prospectUpdatedAt: z.iso.datetime(),
  committedAt: z.iso.datetime(),
});
export type NewClientReceipt = z.infer<typeof receiptSchema>;
export const newClientRecoveryContract = {
  schema: newClientAttemptSchema,
  requestId: (attempt: NewClientAttempt) => attempt.command.requestId,
};

export function newClientRefusal(error: unknown, attempt: NewClientAttempt) {
  if (!(error instanceof ApiError)) return undefined;
  const parsed = newClientRefusalSchema.safeParse(error.details);
  if (
    !parsed.success ||
    parsed.data.status !== error.status ||
    parsed.data.requestId !== attempt.command.requestId ||
    parsed.data.prospectId !== attempt.command.prospectId ||
    parsed.data.payloadDigest !== attempt.payloadDigest
  )
    return undefined;
  return parsed.data;
}

/** The typed rollback envelope establishes the original no-write result.
 * Fresh reads only prevent retiring after a later conversion or authority change. */
export async function reviewNewClientRefusal(
  api: ApiClient,
  attempt: NewClientAttempt,
  signal: AbortSignal,
  guard: () => void,
) {
  const failure = attempt.refusal;
  if (
    !failure ||
    !newClientRefusal(
      new ApiError(failure.status, failure.message, failure),
      attempt,
    )
  )
    throw new Error(
      "This conversion has no verified refusal. Recover its original receipt.",
    );
  try {
    await newClientCommandRequest(api, attempt, "recover", signal, guard);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    guard();
    signal.throwIfAborted();
    const current = await api.request(
      "core",
      `business-development/prospects/${attempt.command.prospectId}`,
      prospectForIdSchema(attempt.command.prospectId),
      { signal },
    );
    guard();
    signal.throwIfAborted();
    if (current.linkedClientId || current.convertedAt)
      throw new Error(
        "This prospect has a conversion. Recover and review the original command before continuing.",
      );
    return failure;
  }
  throw new Error(
    "The original conversion has a saved receipt. Recover it before continuing.",
  );
}

export async function prepareNewClient(
  record: Prospect,
  fields: { website: string; description: string },
  requestId = crypto.randomUUID(),
): Promise<NewClientAttempt> {
  // Property order is the canonical Core v1 serialization, including existing identity fields.
  const command = newClientCommandSchema.parse({
    schemaVersion: 1,
    requestId,
    prospectId: record.id,
    expectedUpdatedAt: record.updatedAt,
    mode: "new_client",
    clientName: record.displayName,
    clientWebsite: fields.website.trim() || null,
    clientDescription: fields.description.trim() || null,
  });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(command)),
  );
  return {
    command,
    payloadDigest: Array.from(new Uint8Array(bytes), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function newClientCommandRequest(
  api: ApiClient,
  attempt: NewClientAttempt,
  mode: "create" | "recover",
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const path = `business-development/prospects/${attempt.command.prospectId}/conversion-commands`;
  const value = await api.request(
    "core",
    mode === "create" ? path : `${path}/${attempt.command.requestId}`,
    receiptSchema,
    mode === "create"
      ? { method: "POST", body: attempt.command, signal }
      : { signal },
  );
  guard();
  signal.throwIfAborted();
  if (
    value.requestId !== attempt.command.requestId ||
    value.prospectId !== attempt.command.prospectId ||
    value.payloadDigest !== attempt.payloadDigest ||
    value.expectedUpdatedAt !== attempt.command.expectedUpdatedAt
  )
    throw new ApiError(
      502,
      "The conversion receipt does not match the reviewed new client. Recover the original command before continuing.",
    );
  return value;
}
