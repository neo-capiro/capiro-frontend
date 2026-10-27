import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { readMailAttachments, attachmentRefusal } from "./attachments";
import { mailRecipient } from "./recipients";
import { mailReplyContextSchema } from "./read";
import {
  confirmReviewedMailbox,
  senderReceiptMatches,
  type SendingMailbox,
} from "./mailboxes";

export const sendInputSchema = z.object({
  operation: z.enum(["reply", "reply_all", "forward"]).optional(),
  originalMessageId: z.uuid().optional(),
  originalUpdatedAt: z.iso.datetime({ offset: true }).optional(),
  originalBodySha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  clientId: z.uuid(),
  personIds: z.array(z.uuid()).max(50).optional(),
  to: z.array(mailRecipient).min(1).max(50),
  cc: z.array(mailRecipient).max(10).optional(),
  bcc: z.array(mailRecipient).max(10).optional(),
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().min(1).max(40000),
  appendSignature: z.boolean(),
  threadId: z.uuid().optional(),
  attachmentIds: z.array(z.uuid()).max(5).optional(),
  senderConnectionId: z.uuid().optional(),
});
export type SendInput = z.infer<typeof sendInputSchema> & {
  /** Frozen local review evidence; excluded from the server DTO. */
  reviewedSender?: SendingMailbox;
};
export function replyReceiptMatches(
  receipt: {
    operation?: string;
    originalMessageId?: string;
    originalThreadId?: string;
    originalUpdatedAt?: string;
    originalBodySha256?: string;
    threadId?: string;
  },
  input: Pick<
    SendInput,
    | "operation"
    | "originalMessageId"
    | "originalUpdatedAt"
    | "threadId"
    | "originalBodySha256"
  >,
) {
  return input.operation === "reply" ||
    input.operation === "reply_all" ||
    input.operation === "forward"
    ? Boolean(
        input.originalMessageId && input.originalUpdatedAt && input.threadId,
      ) &&
        receipt.operation === input.operation &&
        receipt.originalMessageId === input.originalMessageId &&
        receipt.originalThreadId === input.threadId &&
        receipt.originalUpdatedAt === input.originalUpdatedAt &&
        (input.operation !== "forward" ||
          (Boolean(input.originalBodySha256) &&
            receipt.originalBodySha256 === input.originalBodySha256))
    : receipt.operation === undefined &&
        (!input.threadId || receipt.threadId === input.threadId);
}
export class MailSendError extends Error {
  constructor(
    message: string,
    public readonly uncertain: boolean,
  ) {
    super(message);
  }
}
export async function sendReviewedMail(
  api: ApiClient,
  input: SendInput,
  assert: () => void,
  requestKey: string,
) {
  let body: SendInput;
  let sender: SendingMailbox | undefined;
  try {
    body = sendInputSchema.parse(input);
    if (
      (body.threadId ||
        body.operation ||
        body.originalMessageId ||
        body.originalUpdatedAt ||
        body.originalBodySha256) &&
      (!["reply", "reply_all", "forward"].includes(body.operation ?? "") ||
        !body.threadId ||
        !body.originalMessageId ||
        !body.originalUpdatedAt ||
        !body.senderConnectionId ||
        (body.operation === "forward"
          ? !body.originalBodySha256
          : body.originalBodySha256 !== undefined) ||
        (body.operation === "reply" &&
          (body.to.length !== 1 || body.cc?.length)) ||
        body.bcc?.length)
    )
      throw new Error("Review a supported original message before replying.");
    if (
      Boolean(body.senderConnectionId) !== Boolean(input.reviewedSender) ||
      (input.reviewedSender &&
        input.reviewedSender.id !== body.senderConnectionId)
    )
      throw new Error("Review the exact sending mailbox before sending.");
    const emails = [...body.to, ...(body.cc ?? []), ...(body.bcc ?? [])].map(
      (item) => item.email,
    );
    if (new Set(emails).size !== emails.length)
      throw new Error("Duplicate email recipients are not allowed.");
    assert();
    if (input.reviewedSender)
      sender = await confirmReviewedMailbox(api, input.reviewedSender, assert);
    if (body.threadId) {
      await api.request(
        "core",
        `engagement/mail-threads/${body.threadId}?messageId=${body.originalMessageId}`,
        z
          .object({
            id: z.uuid(),
            clientId: z.string().nullable(),
            connectionId: z.uuid().optional(),
            messages: z.array(
              z.object({
                id: z.uuid(),
                replyContext: mailReplyContextSchema.optional(),
                replyAllContext: mailReplyContextSchema.optional(),
                forwardContext: mailReplyContextSchema.optional(),
              }),
            ),
          })
          .refine((thread) => {
            const original = thread.messages[0];
            const context =
              body.operation === "forward"
                ? original?.forwardContext
                : body.operation === "reply_all"
                  ? original?.replyAllContext
                  : original?.replyContext;
            return (
              thread.id === body.threadId &&
              thread.messages.length === 1 &&
              original?.id === body.originalMessageId &&
              context?.supported === true &&
              context.operation === body.operation &&
              context.originalMessageId === body.originalMessageId &&
              context.originalUpdatedAt === body.originalUpdatedAt &&
              context.senderConnectionId === body.senderConnectionId &&
              context.subject === body.subject &&
              (body.operation === "forward"
                ? context.originalBodySha256 === body.originalBodySha256
                : JSON.stringify(context.to.map((row) => row.email)) ===
                    JSON.stringify(body.to.map((row) => row.email)) &&
                  JSON.stringify((context.cc ?? []).map((row) => row.email)) ===
                    JSON.stringify((body.cc ?? []).map((row) => row.email))) &&
              (thread.clientId === body.clientId || thread.clientId === null) &&
              (!sender || thread.connectionId === sender.id)
            );
          }),
      );
      assert();
    }
    const attachments = await readMailAttachments(
      api,
      body.clientId,
      body.attachmentIds ?? [],
    );
    for (const attachment of attachments) {
      const refusal = attachmentRefusal(attachment);
      if (refusal) throw new Error(`${attachment.fileName}: ${refusal}`);
    }
    assert();
  } catch (error) {
    throw new MailSendError(
      error instanceof Error ? error.message : "Email preflight failed.",
      false,
    );
  }
  try {
    // No asynchronous boundary between the final actor check and dispatch.
    const receipt = await api.request(
      "core",
      "engagement/mail/send",
      z
        .object({
          ok: z.literal(true),
          intentId: z.uuid(),
          requestKey: z.uuid(),
          state: z.literal("accepted"),
          threadId: z.uuid(),
          messageId: z.uuid(),
          senderConnectionId: z.uuid().optional(),
          senderEmail: z.email().optional(),
          senderName: z.string().nullable().optional(),
          signaturePolicy: z.literal("actor").optional(),
          signatureAppended: z.boolean().optional(),
          operation: z.enum(["reply", "reply_all", "forward"]).optional(),
          originalMessageId: z.uuid().optional(),
          originalThreadId: z.uuid().optional(),
          originalUpdatedAt: z.iso.datetime({ offset: true }).optional(),
          originalBodySha256: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .optional(),
        })
        .refine(
          (receipt) =>
            receipt.requestKey === requestKey &&
            replyReceiptMatches(receipt, body) &&
            (!sender ||
              (senderReceiptMatches(receipt, sender) &&
                (body.appendSignature || receipt.signatureAppended === false))),
        ),
      {
        method: "POST",
        body: {
          ...body,
          requestKey,
          to: body.to.map(({ email, name }) => ({ email, name })),
          cc: body.cc?.map(({ email, name }) => ({ email, name })),
          bcc: body.bcc?.map(({ email, name }) => ({ email, name })),
        },
      },
    );
    try {
      assert();
    } catch {
      throw new MailSendError(
        "Your session changed while sending. Delivery may have completed; check the original mailbox Sent Items.",
        true,
      );
    }
    return receipt;
  } catch (error) {
    if (error instanceof MailSendError) throw error;
    const details =
      error instanceof ApiError && error.status === 400
        ? error.details
        : undefined;
    const rejection = z
      .object({
        error: z.literal("MAIL_SEND_REJECTED"),
        requestKey: z.uuid(),
        intentId: z.uuid(),
        state: z.literal("failed"),
        retryable: z.literal(false),
      })
      .safeParse(details);
    throw new MailSendError(
      error instanceof Error
        ? error.message
        : "Email delivery could not be confirmed.",
      // Access may be revoked after acceptance. HTTP status alone never proves
      // non-delivery. Require this exact request's durable rejection; a size
      // error without ledger ownership cannot exclude a concurrent send.
      !(rejection.success && rejection.data.requestKey === requestKey),
    );
  }
}
