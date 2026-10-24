"use client";
import { useEffect, useRef, useState } from "react";
import type { FullThread } from "./contracts";
import { orderedMessages } from "./recipients";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  readMailThreadPage,
  type MailBody,
  type MailCoverage,
  type MailReadScope,
} from "../email/read";
import styles from "./thread.module.css";

export function ThreadContent({
  thread,
  scope,
  onReadError,
}: {
  thread: FullThread;
  scope: MailReadScope;
  onReadError: (error: Error) => void;
}) {
  return (
    <div className={styles.messages}>
      {orderedMessages(thread).map((message) => {
        const date = message.sentAt ?? message.receivedAt ?? message.createdAt;
        return (
          <article className={styles.message} key={message.id}>
            <header>
              <span>
                {message.fromName ? `${message.fromName} ` : ""}
                {message.fromEmail
                  ? `<${message.fromEmail}>`
                  : "Sender unavailable"}
              </span>
              <time dateTime={date} title={date}>
                {Number.isFinite(Date.parse(date))
                  ? new Date(date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Date unavailable"}
              </time>
            </header>
            <StoredMailBody
              key={`${message.id}:${message.bodySha256}:${thread.asOf}`}
              message={message}
              thread={thread}
              scope={scope}
              onReadError={onReadError}
            />
          </article>
        );
      })}
      {!thread.messages.length && (
        <p className="muted">No active stored messages in this thread.</p>
      )}
    </div>
  );
}

function StoredMailBody({
  message,
  thread,
  scope,
  onReadError,
}: {
  message: MailBody;
  thread: FullThread;
  scope: MailReadScope;
  onReadError: (error: Error) => void;
}) {
  const api = useApi();
  const [body, setBody] = useState({
    text: message.bodyText,
    next: message.nextBodyOffset,
  });
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  async function loadMore() {
    if (body.next === null || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const result = await readMailThreadPage(
        api,
        scope,
        { asOf: thread.asOf, expectedUpdatedAt: thread.updatedAt },
        controller.signal,
        {
          messageId: message.id,
          bodyOffset: body.next,
          expectedBodySha256: message.bodySha256,
        },
      );
      const section = result.messages[0]!;
      if (
        section.bodyLength !== message.bodyLength ||
        section.bodyCompleteness !== message.bodyCompleteness ||
        section.bodyStoredPresent !== message.bodyStoredPresent
      )
        throw new Error(
          "This stored message changed. Refresh the thread before continuing.",
        );
      if (!controller.signal.aborted)
        setBody({
          text: body.text + section.bodyText,
          next: section.nextBodyOffset,
        });
    } catch (error) {
      if (!controller.signal.aborted)
        onReadError(
          error instanceof Error
            ? error
            : new Error("Message text could not be loaded."),
        );
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  }
  return (
    <>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {message.bodyStoredPresent
          ? body.text || "Stored message text is empty."
          : "Stored message text is unavailable."}
      </p>
      {message.bodyStoredPresent && message.bodyCompleteness !== "full" && (
        <small>
          {message.bodyCompleteness === "preview"
            ? "Only a provider preview was stored."
            : message.bodyCompleteness === "truncated"
              ? "The stored provider text is truncated."
              : "Provider body completeness is unknown."}
        </small>
      )}
      {body.next !== null && (
        <div>
          <small>
            Showing {body.text.length.toLocaleString()} of{" "}
            {message.bodyLength.toLocaleString()} stored text units.
          </small>{" "}
          <button
            className="button ghost"
            disabled={pending}
            onClick={() => void loadMore()}
          >
            {pending ? "Loading message text…" : "Load more message text"}
          </button>
        </div>
      )}
    </>
  );
}

export function MailCoverageNotice({ coverage }: { coverage: MailCoverage }) {
  const status =
    coverage.sourceStatus === "unavailable"
      ? "Mailbox currently unavailable."
      : !coverage.backfillComplete ||
          coverage.hasMore ||
          coverage.captureRepair === "in_progress" ||
          coverage.captureRepair === "required"
        ? "Mail import is incomplete; more messages may become available."
        : coverage.sourceStatus === "degraded"
          ? "Mail sync is degraded; stored results may be incomplete or out of date."
          : "The provider's bounded backfill is complete.";
  return (
    <p className="muted">
      <small>
        {status}{" "}
        {coverage.lastMailSyncAt ? (
          <>
            Last mail sync:{" "}
            <time dateTime={coverage.lastMailSyncAt}>
              {new Date(coverage.lastMailSyncAt).toLocaleString()}
            </time>
            .
          </>
        ) : (
          "No completed mail sync is recorded."
        )}{" "}
        Stored mail only; complete provider history is not guaranteed.
      </small>
    </p>
  );
}
