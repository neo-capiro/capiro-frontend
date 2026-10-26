"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ActionButton,
  PageHeader,
  Panel,
} from "../../../../../shared/module-ui";
import { SavedNewsletterHtml } from "../RichPreview";
import { useNewsletterReview } from "./use-newsletter-review";
import { canEnterEditor } from "./receiving";
import { useNewsletterCollaboration } from "./use-newsletter-collaboration";
import { ReviewCollaborationDialogs } from "./ReviewCollaborationDialogs";
import { ReviewActionNotice } from "./ReviewActionNotice";
import styles from "./newsletter-review.module.css";

type ReviewProps = {
  documentId: string;
  onClose: () => void;
  onEdit?: (documentId: string) => void;
  onEditableAccessLost?: () => void;
};

export function NewsletterReview(props: ReviewProps) {
  const { userId } = useAuth();
  return userId ? (
    <ReviewSession
      key={`${userId}:${props.documentId}`}
      {...props}
      actorId={userId}
    />
  ) : null;
}

function ReviewSession({
  documentId,
  actorId,
  onClose,
  onEdit,
  onEditableAccessLost,
}: ReviewProps & { actorId: string }) {
  const state = useNewsletterReview(documentId);
  const collaboration = useNewsletterCollaboration(
    documentId,
    actorId,
    state.denyAccess,
    state.acceptComments,
    state.accessLost,
    state.review?.role,
  );
  const { actions } = collaboration;
  const [mobile, setMobile] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const heading = useRef<HTMLDivElement>(null);
  const { review } = state;
  const effectiveRole = collaboration.currentRole;
  const canComment = Boolean(effectiveRole && effectiveRole !== "viewer");
  useEffect(() => {
    if (state.accessLost || (effectiveRole && !canEnterEditor(effectiveRole)))
      onEditableAccessLost?.();
  }, [state.accessLost, effectiveRole, onEditableAccessLost]);
  useEffect(() => {
    if (state.opened) heading.current?.focus();
  }, [state.opened, state.loading, state.unavailable]);
  const role =
    effectiveRole && effectiveRole[0]!.toUpperCase() + effectiveRole.slice(1);
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
              <ActionButton disabled={actions.pending} onClick={onClose}>
                Workspace
              </ActionButton>
              {review &&
                effectiveRole &&
                canEnterEditor(effectiveRole) &&
                onEdit && (
                  <ActionButton
                    disabled={actions.pending}
                    onClick={() => onEdit(review.id)}
                  >
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
                This review displays saved content. Commenting does not save or
                change your unsaved editor draft.
              </p>
              <div className={styles.actions}>
                {effectiveRole === "owner" && (
                  <ActionButton
                    disabled={actions.pending}
                    onClick={() => collaboration.openTeam("sharing")}
                  >
                    Sharing and invitations
                  </ActionButton>
                )}
                <ActionButton
                  disabled={actions.pending}
                  onClick={() => collaboration.openTeam("preferences")}
                >
                  In-app notifications
                </ActionButton>
              </div>
              {!collaboration.dialog && (
                <ReviewActionNotice actions={actions} />
              )}
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
                  <ActionButton disabled={actions.pending} onClick={state.open}>
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
                {canComment && (
                  <ActionButton
                    primary
                    disabled={actions.blocked}
                    onClick={() => collaboration.compose()}
                  >
                    Add comment
                  </ActionButton>
                )}
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
                        {comment.parentId && <p>Reply to a saved thread</p>}
                        {canComment && (
                          <div className={styles.actions}>
                            <ActionButton
                              disabled={actions.blocked}
                              onClick={() => collaboration.compose(comment)}
                            >
                              Reply
                            </ActionButton>
                            <ActionButton
                              disabled={actions.blocked}
                              onClick={() => collaboration.resolve(comment)}
                            >
                              {comment.resolved
                                ? "Reopen comment"
                                : "Resolve comment"}
                            </ActionButton>
                            <ActionButton
                              disabled={actions.pending}
                              onClick={() =>
                                collaboration.openWatchers(comment)
                              }
                            >
                              Thread email choices
                            </ActionButton>
                          </div>
                        )}
                      </article>
                    ))}
                  </>
                )}
                <ActionButton
                  disabled={state.commentsLoading || actions.pending}
                  onClick={state.refreshComments}
                >
                  Refresh comments
                </ActionButton>
              </aside>
            </div>
          </>
        )
      )}
      {review && (
        <ReviewCollaborationDialogs
          state={collaboration}
          documentId={documentId}
          canComment={canComment}
          onAccessLost={state.denyAccess}
        />
      )}
    </section>
  );
}
