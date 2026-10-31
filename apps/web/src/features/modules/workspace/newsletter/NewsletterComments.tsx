"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  StatusPanel,
  Tabs,
  TextArea,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import parity from "./newsletter-figma.module.css";

export function NewsletterComments({
  documentId,
  view: controlledView,
  onViewChange,
  query: sharedQuery,
}: {
  documentId?: string;
  view?: string;
  onViewChange?: (view: string) => void;
  query?: ReturnType<typeof useCapiroQuery<"workspace.comments">>;
}) {
  const [localView, setLocalView] = useState("open");
  const view = controlledView ?? localView;
  const setView = onViewChange ?? setLocalView;
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string>();
  const localQuery = useCapiroQuery(
    "workspace.comments",
    { params: { documentId: documentId ?? "" } },
    { enabled: Boolean(documentId) && !sharedQuery },
  );
  const query = sharedQuery ?? localQuery;
  const create = useCapiroMutation("workspace.comment.create");
  const resolve = useCapiroMutation("workspace.comment.resolve");
  async function post() {
    if (!documentId) return;
    try {
      await create.run({
        params: { documentId },
        body: { body, parentId: replyTo },
      });
      setBody("");
      setReplyTo(undefined);
      query.reload();
    } catch {
      /* Preserve unsent comment text. */
    }
  }
  async function toggle(id: string, resolved: boolean) {
    if (!documentId) return;
    try {
      await resolve.run({
        params: { documentId, commentId: id },
        body: { resolved },
      });
      query.reload();
    } catch {
      /* Server owns comment review permissions. */
    }
  }
  const comments = query.data ?? [];
  const open = comments.filter((comment) => !comment.resolved).length;
  const resolved = comments.length - open;
  return (
    <aside className={parity.panel}>
      <h3 className={parity.panelTitle}>Comments</h3>
      <p className={parity.panelHint}>
        Feedback attaches to the newsletter or a selected block.
      </p>
      {onViewChange ? null : (
        <div
          className={parity.tabs}
          style={{ marginTop: 12, marginBottom: 12 }}
        >
          <Tabs
            items={[
              { id: "open", label: `Open · ${open}` },
              { id: "resolved", label: `Resolved · ${resolved}` },
            ]}
            value={view}
            onChange={setView}
            label="Comment status"
            wrap
          />
        </div>
      )}
      {documentId ? (
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          {comments
            .filter((comment) => comment.resolved === (view === "resolved"))
            .map((comment) => (
              <article key={comment.id} className={parity.commentItem}>
                <span
                  className={`${parity.statusBadge} ${parity.statusBadgeMuted}`}
                >
                  {comment.resolved ? "Resolved" : "Open"}
                </span>
                <p className={parity.commentBody}>{comment.body}</p>
                <p className={parity.commentTime}>
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
                {comment.replies?.map((reply) => (
                  <p key={reply.id} className={parity.commentBody}>
                    {reply.body}
                  </p>
                ))}
                <div className={parity.commentActions}>
                  <ActionButton onClick={() => setReplyTo(comment.id)}>
                    Reply
                  </ActionButton>
                  <ActionButton
                    disabled={resolve.pending}
                    onClick={() => toggle(comment.id, !comment.resolved)}
                  >
                    {comment.resolved ? "Reopen" : "Resolve"}
                  </ActionButton>
                </div>
              </article>
            ))}
        </StatusPanel>
      ) : (
        <p className={parity.panelHint}>
          Save the newsletter before adding comments.
        </p>
      )}
      <div className={parity.commentForm}>
        <label htmlFor="newsletter-comment">
          {replyTo ? "Reply to comment" : "Add a comment"}
        </label>
        <TextArea
          id="newsletter-comment"
          value={body}
          maxLength={20000}
          placeholder="Write a comment…"
          onChange={(event) => setBody(event.target.value)}
        />
        <div className={parity.commentActions}>
          <ActionButton
            primary
            disabled={!documentId || !body.trim() || create.pending}
            onClick={post}
          >
            Post comment
          </ActionButton>
          {replyTo && (
            <ActionButton onClick={() => setReplyTo(undefined)}>
              Cancel reply
            </ActionButton>
          )}
        </div>
      </div>
      {(create.error || resolve.error) && (
        <p role="alert" className={styles.error}>
          {(create.error ?? resolve.error)?.message}
        </p>
      )}
    </aside>
  );
}
