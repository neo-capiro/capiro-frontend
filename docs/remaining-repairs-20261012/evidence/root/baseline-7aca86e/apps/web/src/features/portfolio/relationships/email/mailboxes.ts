import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";

// Core PR2393 b1ac2649: owner-scoped eligibility, never browser authorization.
export const sendingMailboxSchema = z
  .object({
    id: z.uuid(),
    provider: z.enum(["google_workspace", "microsoft_365"]),
    accountEmail: z.email(),
    displayName: z.string().nullable(),
    availability: z.literal("available"),
    signaturePolicy: z.literal("actor"),
  })
  .strict();
export type SendingMailbox = z.infer<typeof sendingMailboxSchema>;
export const sendingMailboxesSchema = z
  .array(sendingMailboxSchema)
  .refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    "The mailbox list contains duplicate identities.",
  );
export async function confirmReviewedMailbox(
  api: ApiClient,
  reviewed: SendingMailbox,
  assert: () => void,
) {
  const expected = sendingMailboxSchema.parse(reviewed);
  assert();
  const rows = await api.request(
    "core",
    "engagement/mail/mailboxes",
    sendingMailboxesSchema,
  );
  assert();
  const current = rows.find((row) => row.id === expected.id);
  if (
    !current ||
    current.accountEmail !== expected.accountEmail ||
    current.displayName !== expected.displayName ||
    current.provider !== expected.provider
  )
    throw new ApiError(
      409,
      "The reviewed sending mailbox changed or is unavailable. Refresh the mailbox list and review this draft; no other mailbox was selected.",
    );
  return current;
}
export function senderReceiptMatches(
  receipt: unknown,
  expected: SendingMailbox,
) {
  const result = z
    .object({
      senderConnectionId: z.literal(expected.id),
      senderEmail: z.literal(expected.accountEmail),
      senderName: z.literal(expected.displayName),
      signaturePolicy: z.literal("actor"),
      signatureAppended: z.boolean(),
    })
    .safeParse(receipt);
  return result.success;
}
