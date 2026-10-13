"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  StatusPanel,
  TextArea,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function NewsletterComments({ documentId }: { documentId?: string }) {
  const [view, setView] = useState("open");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string>();
  const query = useCapiroQuery(
    "workspace.comments",
    { params: { documentId: documentId ?? "" } },
    { enabled: Boolean(documentId) },
  );
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
  return (
    <aside className={styles.info}>
      <h3>Comments</h3>
      <div className={styles.pills}>
        {["open", "resolved"].map((value) => (
          <button
            className={view === value ? styles.active : ""}
            key={value}
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {value[0]!.toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {documentId ? (
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          {query.data
            ?.filter((comment) => comment.resolved === (view === "resolved"))
            .map((comment) => (
              <article key={comment.id}>
                <p>
                  {comment.body}
                  <span className={styles.secondary}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </p>
                {comment.replies?.map((reply) => (
                  <p key={reply.id}>{reply.body}</p>
                ))}
                <div className={styles.actions}>
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
        <p>Save the newsletter before adding comments.</p>
      )}
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
      {replyTo && (
        <ActionButton onClick={() => setReplyTo(undefined)}>
          Cancel reply
        </ActionButton>
      )}
      <ActionButton
        primary
        disabled={!documentId || !body.trim() || create.pending}
        onClick={post}
      >
        Post comment
      </ActionButton>
      {(create.error || resolve.error) && (
        <p role="alert" className={styles.error}>
          {(create.error ?? resolve.error)?.message}
        </p>
      )}
      <div className={styles.success} style={{ marginTop: 20 }}>
        <strong>Review checklist</strong>
        <p>Check links, client references and accessibility before staging.</p>
      </div>
    </aside>
  );
}
