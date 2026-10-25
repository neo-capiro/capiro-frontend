import { z } from "zod";
const envelope = z.discriminatedUnion("state", [
  z
    .object({
      version: z.literal(1),
      scope: z.string(),
      requestId: z.uuid(),
      state: z.literal("discarded"),
      code: z.literal("TASK_PREPARATION_DISCARDED"),
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      scope: z.string(),
      requestId: z.uuid(),
      state: z.literal("pending"),
      data: z.unknown(),
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      scope: z.string(),
      requestId: z.uuid(),
      state: z.literal("acknowledged"),
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      scope: z.string(),
      requestId: z.uuid(),
      state: z.literal("refused"),
      code: z.enum([
        "WORKSPACE_BRIEF_STATE_CONFLICT",
        "ACTIVITY_UNDO_REFUSED",
        "DIRECTORY_NOTE_REFUSED",
        "PROSPECT_NEW_CLIENT_REFUSED",
        "PROSPECT_CONTACT_TRANSFER_REFUSED",
        "MEETING_COMMAND_REFUSED",
        "OBJECTIVE_GENERATION_FAILED",
        "OBJECTIVE_CONTEXT_INCOMPLETE",
        "OBJECTIVE_VERSION_CONFLICT",
        "OBJECTIVE_ASSOCIATION_REJECTED",
        "FILE_BATCH_MOVE_REFUSED",
        "TASK_EXECUTION_NOT_EXECUTED",
        "FILE_ACCESS_REFUSED",
      ]),
    })
    .strict(),
]);
export type JournalEnvelope = z.infer<typeof envelope>;
const recordSchema = z
  .object({
    version: z.literal(1),
    requestId: z.uuid(),
    key: z.custom<CryptoKey>(
      (value) =>
        value instanceof CryptoKey &&
        !value.extractable &&
        value.algorithm.name === "AES-GCM",
    ),
    iv: z.instanceof(Uint8Array).refine((value) => value.length === 12),
    ciphertext: z
      .instanceof(ArrayBuffer)
      .refine((value) => value.byteLength > 0),
  })
  .strict();
export async function encryptJournal(value: JournalEnvelope) {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(value.scope),
    },
    key,
    new TextEncoder().encode(JSON.stringify(envelope.parse(value))),
  );
  return { version: 1, requestId: value.requestId, key, iv, ciphertext };
}
export async function decryptJournal(
  scope: string,
  input: unknown,
): Promise<JournalEnvelope> {
  const record = recordSchema.parse(input);
  const clear = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(record.iv),
      additionalData: new TextEncoder().encode(scope),
    },
    record.key,
    record.ciphertext,
  );
  const value = envelope.parse(JSON.parse(new TextDecoder().decode(clear)));
  if (value.scope !== scope || value.requestId !== record.requestId)
    throw new Error("Recovery scope does not match.");
  return value;
}
