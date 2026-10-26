"use client";
import { useEffect, useRef, useState } from "react";
import {
  ActionButton,
  PageHeader,
  Panel,
} from "../../../../../shared/module-ui";
import { SavedNewsletterHtml } from "../RichPreview";
import { useNewsletterReview } from "./use-newsletter-review";
import { canEnterEditor } from "./receiving";
import styles from "./newsletter-review.module.css";

export function NewsletterReview({
  documentId,
  onClose,
  onEdit,
  onEditableAccessLost,
}: {
  documentId: string;
  onClose: () => void;
  onEdit?: (documentId: string) => void;
  onEditableAccessLost?: () => void;
}) {
  const state = useNewsletterReview(documentId);
  const [mobile, setMobile] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const heading = useRef<HTMLDivElement>(null);
  const { review } = state;
  useEffect(() => {
    if (state.accessLost || (review && !canEnterEditor(review.role)))
      onEditableAccessLost?.();
  }, [state.accessLost, review, onEditableAccessLost]);
  useEffect(() => {
    if (state.opened) heading.current?.focus();
  }, [state.opened, state.loading, state.unavailable]);
  const role = review && review.role[0]!.toUpperCase() + review.role.slice(1);
  const shown = state.comments?.filter(
    (comment) =>
      filter === "all" || comment.resolved === (filter === "resolved"),
  );
  return (
    <section className={styles.screen} data-design-node="1176:299839">
      <div tabIndex={-1} ref={heading} className={styles.heading}>
        <PageHeader
          title="Saved newsletter review"
          description={review?.name}
          actions={
            <>
              <ActionButton onClick={onClose}>Workspace</ActionButton>
              {review && canEnterEditor(review.role) && onEdit && (
                <ActionButton onClick={() => onEdit(review.id)}>
                  Edit newsletter
                </ActionButton>
              )}
            </>
          }
        />
      </div>
      {!state.opened ? (
        <Panel title="Open saved newsletter review">
          <p>
            Opening checks your current access and may activate an existing
            invitation.
          </p>
          <ActionButton primary onClick={state.open}>
            Open review
          </ActionButton>
        </Panel>
      ) : state.loading ? (
        <Panel>
          <p role="status">Loading saved newsletter review…</p>
        </Panel>
      ) : state.unavailable ? (
        <Panel title="Review unavailable">
          <p role="alert">
            The newsletter could not be loaded with current access.
          </p>
          <ActionButton onClick={state.open}>Retry review</ActionButton>
        </Panel>
      ) : (
        review && (
          <>
            <div className={styles.notice}>
              <strong>Your role: {role}</strong>
              <p>
                This review displays saved content and existing comments.
                Comment writing is not available in this view.
              </p>
            </div>
            <div className={styles.layout}>
              <div className={styles.preview}>
                <div
                  className={styles.actions}
                  aria-label="Newsletter preview width"
                >
                  <ActionButton
                    aria-pressed={!mobile}
                    onClick={() => setMobile(false)}
                  >
                    Desktop
                  </ActionButton>
                  <ActionButton
                    aria-pressed={mobile}
                    onClick={() => setMobile(true)}
                  >
                    Mobile
                  </ActionButton>
                  <ActionButton onClick={state.open}>
                    Refresh review
                  </ActionButton>
                </div>
                <div
                  className={`${styles.canvas} ${mobile ? styles.mobile : ""}`}
                >
                  <SavedNewsletterHtml
                    html={review.html}
                    title="Saved newsletter review content"
                  />
                </div>
                <p className={styles.caption}>
                  External images and live links are disabled. Email clients may
                  render differently.
                </p>
              </div>
              <aside
                className={styles.inspector}
                aria-label="Saved newsletter comments"
                data-design-node="1176:300030"
              >
                <h2>Comments</h2>
                <p>
                  Up to 500 comments are loaded. Older comments may not be
                  shown.
                </p>
                <div
                  className={styles.actions}
                  aria-label="Filter loaded comments"
                >
                  {(["all", "open", "resolved"] as const).map((value) => (
                    <ActionButton
                      key={value}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {value[0]!.toUpperCase() + value.slice(1)}
                    </ActionButton>
                  ))}
                </div>
                {state.commentsLoading ? (
                  <p role="status">Loading comments…</p>
                ) : state.commentsError ? (
                  <p role="alert">Comments could not be loaded.</p>
                ) : (
                  <>
                    <p role="status">
                      {shown?.length ?? 0} shown of{" "}
                      {state.comments?.length ?? 0} loaded comments
                    </p>
                    {!state.comments?.length && (
                      <p>No comments in this loaded view.</p>
                    )}
                    {shown?.map((comment) => (
                      <article className={styles.comment} key={comment.id}>
                        <span className={styles.status}>
                          {comment.resolved ? "Resolved" : "Open"}
                        </span>
                        <h3>{comment.authorName}</h3>
                        <time dateTime={comment.createdAt}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </time>
                        <p>{comment.message}</p>
                      </article>
                    ))}
                  </>
                )}
                <ActionButton
                  disabled={state.commentsLoading}
                  onClick={state.refreshComments}
                >
                  Refresh comments
                </ActionButton>
              </aside>
            </div>
          </>
        )
      )}
    </section>
  );
}
