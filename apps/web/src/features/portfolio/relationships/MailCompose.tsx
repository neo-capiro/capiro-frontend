"use client";
import { useRef, useState } from "react";
import { RichMailEditor, MailBodyPreview } from "./email/RichMailEditor";
import { mailBodyError } from "./email/mail-body";
import { RecipientFields } from "./email/RecipientFields";
import { AttachmentFields } from "./email/AttachmentFields";
import { useMailAttachments } from "./email/useMailAttachments";
import { useMailAuthority } from "./email/authority";
import { useMailRewrite } from "./email/useMailRewrite";
import { SignaturePreview } from "./email/SignaturePreview";
import { recipients, type Recipient } from "./email/recipients";
import { MailSendError, type SendInput } from "./email/send";
import type { MailInitialDraft } from "./email/draft";
export type { MailInitialDraft } from "./email/draft";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { type MailContact } from "./email";
import { useSendMail, useSignature } from "./email";
import { useMailboxes } from "./email/useMailboxes";
import { MailboxField } from "./email/MailboxField";
import type { MailReplyContext } from "./email/read";
export function MailCompose({
  person,
  clientId,
  thread,
  onClose,
  initialDraft,
  sendBlockedReason: requestedSendBlock,
  reply,
}: {
  person: MailContact;
  clientId: string;
  thread?: { id: string; subject: string };
  onClose: () => void;
  initialDraft?: MailInitialDraft;
  reply?: Extract<MailReplyContext, { supported: true }>;
  /** A verified contract gap: review is available, dispatch/upload/rewrite are not. */
  sendBlockedReason?: string;
}) {
  const sendBlockedReason =
    requestedSendBlock ??
    (thread && !reply
      ? "Native reply is unavailable for this original. Reply from your mailbox."
      : undefined);
  const [subject, setSubject] = useState(
    reply?.subject ??
      initialDraft?.subject ??
      (thread ? `Re: ${thread.subject.replace(/^Re:\s*/i, "")}` : ""),
  );
  const [append, setAppend] = useState<boolean | null>(null);
  const [review, setReview] = useState<{
    input: SendInput;
    signatureHtml: string | null;
    signatureStatus: "current" | "loading" | "unavailable";
  } | null>(null);
  const [to, setTo] = useState<Recipient[]>(
    reply?.to ??
      initialDraft?.to ??
      (person.email
        ? [
            {
              email: person.email.trim().toLowerCase(),
              name: person.name,
              ...(person.personId ? { personId: person.personId } : {}),
            },
          ]
        : []),
  );
  const [cc, setCc] = useState(
    (reply?.cc ?? initialDraft?.cc)?.map((item) => item.email).join(", ") ?? "",
  );
  const [bcc, setBcc] = useState("");
  const [validation, setValidation] = useState("");
  const send = useSendMail(
    clientId,
    thread
      ? `thread:${thread.id}`
      : person.personId
        ? `person:${person.personId}`
        : `recipient:${person.email?.trim().toLowerCase() ?? ""}`,
  );
  const signature = useSignature();
  const authority = useMailAuthority(clientId);
  const mailboxes = useMailboxes(
    clientId,
    thread?.id,
    person.email,
    !sendBlockedReason,
  );
  const sourceKey = JSON.stringify([clientId, person, thread, to, cc, bcc]);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const rewrite = useMailRewrite({
    sourceKey,
    initialBody: initialDraft?.body ?? "",
    recipient: person,
    captureAuthority: authority.capture,
  });
  const body = rewrite.body;
  const bodyError = mailBodyError(body);
  const attachments = useMailAttachments(clientId, initialDraft?.attachments);
  const uncertain = send.error instanceof MailSendError && send.error.uncertain;
  const locked = send.isPending || attachments.busy || uncertain;
  const signatureEnabled = append ?? signature.data?.enabled ?? false;
  const signatureCurrent =
    signature.isSuccess && !signature.error && !signature.isFetching;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !send.isPending && !attachments.busy) onClose();
      }}
      title={
        reply?.operation === "reply_all"
          ? "Reply all"
          : thread
            ? "Reply"
            : "New email"
      }
      description={
        sendBlockedReason
          ? "Review this reply. Sending is unavailable for this thread."
          : "Sends through your own connected mailbox. Backend permissions and connection policy apply."
      }
    >
      {sendBlockedReason && <p role="note">{sendBlockedReason}</p>}
      {send.isSuccess ? (
        <div className="stack">
          <p role="status">Your mailbox accepted the email.</p>
          {send.data?.senderEmail && <p>From: {send.data.senderEmail}</p>}
          {send.data?.signatureAppended === false && (
            <small>Your saved signature was not appended.</small>
          )}
          <button className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              locked ||
              !authority.ready ||
              attachments.blocked ||
              rewrite.isPending ||
              (!sendBlockedReason && !mailboxes.selected)
            )
              return;
            try {
              if (bodyError) throw new Error(bodyError);
              if (reply && mailboxes.selected?.id !== reply.senderConnectionId)
                throw new Error("Review the original sending mailbox again.");
              const selected = recipients(to, cc, bcc);
              const personIds = selected.to.flatMap((item) =>
                item.personId ? [item.personId] : [],
              );
              setValidation("");
              setReview({
                signatureHtml:
                  signatureEnabled && signatureCurrent
                    ? (signature.data.html ?? null)
                    : null,
                signatureStatus: signatureCurrent
                  ? "current"
                  : signature.isFetching
                    ? "loading"
                    : "unavailable",
                input: {
                  ...(reply
                    ? {
                        operation: reply.operation,
                        originalMessageId: reply.originalMessageId,
                        originalUpdatedAt: reply.originalUpdatedAt,
                      }
                    : {}),
                  clientId,
                  ...(personIds.length ? { personIds } : {}),
                  ...selected,
                  subject: subject.trim(),
                  bodyHtml: body.html,
                  appendSignature: signatureEnabled,
                  attachmentIds: attachments.ids,
                  ...(thread ? { threadId: thread.id } : {}),
                  ...(mailboxes.selected
                    ? {
                        senderConnectionId: mailboxes.selected.id,
                        reviewedSender: { ...mailboxes.selected },
                      }
                    : {}),
                },
              });
            } catch (error) {
              setValidation(
                error instanceof Error && !error.message.startsWith("[")
                  ? error.message
                  : "Enter valid, unique recipient addresses. To allows 1–50; Cc and Bcc allow up to 10 each.",
              );
            }
          }}
        >
          {!sendBlockedReason && (
            <MailboxField state={mailboxes} disabled={locked} />
          )}
          <RecipientFields
            clientId={clientId}
            to={to}
            onTo={setTo}
            cc={cc}
            onCc={setCc}
            bcc={bcc}
            onBcc={setBcc}
            disabled={locked || Boolean(reply)}
          />
          <label>
            Subject
            <input
              required
              maxLength={300}
              value={subject}
              disabled={locked || Boolean(reply)}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <RichMailEditor
            key={sourceKey}
            value={body}
            disabled={locked}
            onChange={rewrite.edit}
            onAttach={
              sendBlockedReason
                ? undefined
                : () => attachmentInput.current?.click()
            }
            attachDisabled={
              locked || !authority.ready || attachments.jobs.length >= 5
            }
          />
          <button
            type="button"
            className="button"
            disabled={
              locked ||
              !authority.ready ||
              rewrite.isPending ||
              Boolean(bodyError) ||
              Boolean(sendBlockedReason)
            }
            onClick={() => void rewrite.rewrite()}
          >
            {" "}
            {rewrite.isPending ? "Rewriting…" : "Rewrite with Meri"}
          </button>
          {rewrite.canUndo && (
            <button
              type="button"
              className="button"
              disabled={
                locked ||
                !authority.ready ||
                rewrite.isPending ||
                Boolean(sendBlockedReason)
              }
              onClick={rewrite.undo}
            >
              Undo Meri rewrite
            </button>
          )}
          {rewrite.warning && <p role="status">{rewrite.warning}</p>}
          <div role="group" aria-label="Draft rewrite status">
            <QueryState error={rewrite.error} />
          </div>
          <label className="row">
            <input
              type="checkbox"
              disabled={!signature.data?.html}
              checked={signatureEnabled}
              onChange={(e) => setAppend(e.target.checked)}
            />
            Append my saved signature
          </label>
          <section aria-label="Saved signature" className="stack">
            <QueryState
              pending={signature.isPending || signature.isFetching}
              error={signature.error}
            />
            {signature.error && (
              <button
                type="button"
                className="button"
                onClick={() => void signature.refetch()}
              >
                Retry signature
              </button>
            )}
            {signatureCurrent &&
              (signature.data.html ? (
                <SignaturePreview html={signature.data.html} />
              ) : (
                <small>No saved signature is available.</small>
              ))}
          </section>
          {!sendBlockedReason && (
            <AttachmentFields
              state={attachments}
              inputRef={attachmentInput}
              disabled={send.isPending || uncertain || !authority.ready}
            />
          )}
          {validation && <p role="alert">{validation}</p>}
          {!authority.ready && (
            <p role="alert">
              A verified mailbox session is required before sending or
              uploading.
            </p>
          )}
          <QueryState error={authority.error} />
          <QueryState error={send.error} />
          {uncertain && (
            <p role="alert">
              Delivery may be uncertain. Check your Sent Items before sending
              again. This attempt cannot be retried here.
            </p>
          )}
          <button
            className="button primary"
            disabled={
              !to.length ||
              locked ||
              !authority.ready ||
              attachments.blocked ||
              signature.isPending ||
              rewrite.isPending ||
              (!sendBlockedReason && !mailboxes.selected)
            }
          >
            Review email
          </button>
        </form>
      )}
      <Dialog
        open={Boolean(review)}
        onOpenChange={(value) => {
          if (!value && !send.isPending) setReview(null);
        }}
        title={sendBlockedReason ? "Review reply" : "Send email"}
        description={
          sendBlockedReason
            ? `Review “${review?.input.subject ?? ""}”. Sending is unavailable here.`
            : `Send “${review?.input.subject ?? ""}” through your connected mailbox?`
        }
      >
        {review && (
          <div className="stack">
            {sendBlockedReason && <p role="note">{sendBlockedReason}</p>}
            {review.input.reviewedSender && (
              <p>
                From:{" "}
                {review.input.reviewedSender.displayName
                  ? `${review.input.reviewedSender.displayName} · `
                  : ""}
                {review.input.reviewedSender.accountEmail}
              </p>
            )}
            <p>To: {review.input.to.map((item) => item.email).join(", ")}</p>
            {Boolean(review.input.cc?.length) && (
              <p>Cc: {review.input.cc?.map((item) => item.email).join(", ")}</p>
            )}
            {Boolean(review.input.bcc?.length) && (
              <p>
                Bcc: {review.input.bcc?.map((item) => item.email).join(", ")}
              </p>
            )}
            <MailBodyPreview html={review.input.bodyHtml} />
            {!sendBlockedReason && (
              <small>
                {review.input.attachmentIds?.length ?? 0} attachment(s),
                rechecked before sending.
              </small>
            )}
            {review.input.appendSignature && (
              <div className="stack">
                <small>
                  Your saved signature will be requested when this email is
                  sent.
                </small>
                {review.signatureHtml ? (
                  <SignaturePreview html={review.signatureHtml} />
                ) : (
                  <small role="status">
                    {review.signatureStatus === "loading"
                      ? "Signature preview was still loading when this review opened. Close this review and review again after it loads."
                      : review.signatureStatus === "unavailable"
                        ? "Saved signature preview is unavailable. Close this review to retry loading it."
                        : "No saved signature is available."}
                  </small>
                )}
              </div>
            )}
          </div>
        )}
        <QueryState error={send.error} />
        {uncertain && (
          <p role="alert">
            Sending may have completed. Check your mailbox Sent Items before
            starting another email. This reviewed attempt cannot be sent again.
          </p>
        )}
        <button
          className="button primary"
          disabled={
            send.isPending ||
            uncertain ||
            !authority.ready ||
            !review ||
            !mailboxes.selected ||
            Boolean(sendBlockedReason)
          }
          onClick={() => {
            if (
              !review ||
              send.isPending ||
              uncertain ||
              !authority.ready ||
              !mailboxes.selected ||
              sendBlockedReason
            )
              return;
            send.mutate(review.input, { onSuccess: () => setReview(null) });
          }}
        >
          {sendBlockedReason
            ? "Sending unavailable"
            : send.isPending
              ? "Sending…"
              : "Send email"}
        </button>
      </Dialog>
    </Dialog>
  );
}
