import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { Prospect } from "../contracts";

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
export const newClientAttemptSchema = z
  .object({
    command: newClientCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
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
