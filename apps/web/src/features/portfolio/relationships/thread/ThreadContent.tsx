import type { FullThread } from "./contracts";
import { orderedMessages } from "./recipients";
import styles from "./thread.module.css";
import { MailMessageBody } from "../email/MailMessageBody";
import type { MailReadScope } from "../email/read-contracts";

export function ThreadContent({
  thread,
  scope,
  onReadFailure,
}: {
  thread: FullThread;
  scope: MailReadScope;
  onReadFailure: (error: Error) => void;
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
            <MailMessageBody
              thread={thread}
              message={message}
              scope={scope}
              onReadFailure={onReadFailure}
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
