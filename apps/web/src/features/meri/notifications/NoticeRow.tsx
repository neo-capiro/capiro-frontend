import Link from "next/link";
import type { ProjectedNotice } from "../../../shared/meri-notifications/projection";
import { friendlyUtc, readableTitle } from "../../../shared/presentation/text";
import { runRecordHref } from "../runs/RunRecord";
import ui from "../ui/meri-ui.module.css";
import styles from "./notifications.module.css";

export function NoticeRow({
  notice,
  clientId,
  markRead,
  readDisabled,
}: {
  notice: ProjectedNotice;
  clientId: string | null;
  markRead: (id: string) => void;
  readDisabled: boolean;
}) {
  return (
    <li className={styles.row} data-source={notice.source}>
      <h3>
        {readableTitle(
          notice.title,
          notice.source === "memory-review"
            ? "Memory review update"
            : "Run update",
        )}
      </h3>
      <p>{notice.detail}</p>
      <p className={styles.meta}>
        {notice.source === "memory-review" ? "Memory review" : "Run update"} ·{" "}
        {notice.delivery === "required" ? "Required notice" : "Optional notice"}{" "}
        ·{" "}
        {notice.read === null
          ? "Read status not tracked"
          : notice.read
            ? "Read"
            : "Unread"}
      </p>
      <time className={styles.meta} dateTime={notice.occurredAt}>
        {friendlyUtc(notice.occurredAt)}
      </time>
      <div className={styles.actions}>
        {notice.run && (
          <Link
            className={`${ui.outline} ${styles.action}`}
            href={runRecordHref(notice.run, clientId)}
          >
            Open run
          </Link>
        )}
        {notice.reviewRequestId && (
          <Link
            className={`${ui.outline} ${styles.action}`}
            href={`/meri/memory/review/${notice.reviewRequestId}`}
          >
            Open memory review
          </Link>
        )}
        {notice.source === "memory-review" && notice.read === false && (
          <button
            type="button"
            className={`${ui.outline} ${styles.action}`}
            disabled={readDisabled}
            onClick={() => markRead(notice.id.slice("memory-review:".length))}
          >
            Mark read
          </button>
        )}
        <details className={styles.details}>
          <summary>Technical details</summary>
          <dl>
            <div>
              <dt>Original notice title</dt>
              <dd>{notice.title}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{notice.source}</dd>
            </div>
            <div>
              <dt>Recorded time</dt>
              <dd>{notice.occurredAt}</dd>
            </div>
            <div>
              <dt>Notice reference</dt>
              <dd>{notice.id}</dd>
            </div>
            {notice.reviewRequestId && (
              <div>
                <dt>Review reference</dt>
                <dd>{notice.reviewRequestId}</dd>
              </div>
            )}
            {notice.run && (
              <>
                <div>
                  <dt>Conversation reference</dt>
                  <dd>{notice.run.conversationId}</dd>
                </div>
                <div>
                  <dt>Run reference</dt>
                  <dd>{notice.run.runId}</dd>
                </div>
              </>
            )}
          </dl>
          <p className={styles.meta}>
            Opening these details does not mark the notice read.
          </p>
        </details>
      </div>
    </li>
  );
}
