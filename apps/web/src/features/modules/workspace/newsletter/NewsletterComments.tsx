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

/** One comment draft and write lifetime, retained while the workflow changes steps. */
export function useNewsletterComments(
  documentId: string | undefined,
  active: boolean,
) {
  const [view, setView] = useState("open");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string>();
  const [writeError, setWriteError] = useState<Error>();
  const query = useCapiroQuery(
    "workspace.comments",
    { params: { documentId: documentId ?? "" } },
    { enabled: active && Boolean(documentId) },
  );
  const create = useCapiroMutation("workspace.comment.create");
  const resolve = useCapiroMutation("workspace.comment.resolve");
  async function post() {
    if (!documentId) return;
    const submitted = body;
    try {
      await create.run({
        params: { documentId },
        body: { body: submitted, parentId: replyTo },
      });
      setBody((current) => (current === submitted ? "" : current));
      setReplyTo(undefined);
      query.reload();
    } catch (failure) {
      setWriteError(
        failure instanceof Error
          ? failure
          : new Error("The comment result could not be confirmed."),
      );
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
    } catch (failure) {
      setWriteError(
        failure instanceof Error
          ? failure
          : new Error("The comment result could not be confirmed."),
      );
    }
  }
  return {
    documentId,
    view,
    setView,
    body,
    setBody,
    replyTo,
    setReplyTo,
    query,
    create,
    resolve,
    post,
    toggle,
    dirty: Boolean(body.trim()),
    pending: create.pending || resolve.pending,
    error: writeError ?? create.error ?? resolve.error,
  };
}

export function NewsletterComments({
  model,
}: {
  model: ReturnType<typeof useNewsletterComments>;
}) {
  const {
    documentId,
    view,
    setView,
    body,
    setBody,
    replyTo,
    setReplyTo,
    query,
    create,
    resolve,
    post,
    toggle,
    error,
  } = model;
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
      {error && (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}
      <div className={styles.success} style={{ marginTop: 20 }}>
        <strong>Review checklist</strong>
        <p>Check links, client references and accessibility before staging.</p>
      </div>
    </aside>
  );
}
