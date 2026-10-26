"use client";
import { useState, type ReactNode } from "react";
import type { NewsletterComment } from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
} from "../../../../../shared/module-ui";
import styles from "./newsletter-collaboration.module.css";

export function CommentComposer({
  parent,
  busy,
  blocked,
  onClose,
  onSubmit,
  children,
}: {
  parent?: NewsletterComment;
  busy: boolean;
  blocked: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<boolean>;
  children?: (insert: (text: string) => void) => ReactNode;
}) {
  const [message, setMessage] = useState("");
  const submit = async () => {
    if (await onSubmit(message.trim())) setMessage("");
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      closeDisabled={busy}
      title={parent ? "Reply to comment" : "Add comment"}
      description="Comment on the saved newsletter. Your unsaved editor changes stay untouched."
      className={styles.dialog}
      footer={
        <>
          <ActionButton disabled={busy} onClick={onClose}>
            Close
          </ActionButton>
          <ActionButton
            primary
            disabled={blocked || !message.trim()}
            onClick={() => {
              void submit();
            }}
          >
            {parent ? "Post reply" : "Post comment"}
          </ActionButton>
        </>
      }
    >
      <div
        className={styles.stack}
        data-design-node={parent ? "1176:300100" : "1176:300051"}
      >
        {parent && (
          <div className={styles.card}>
            <strong>{parent.authorName}</strong>
            <p>{parent.message}</p>
            <span>
              {parent.resolved
                ? "This comment is resolved; replies are still allowed."
                : "Saved comment"}
            </span>
          </div>
        )}
        <div className={styles.card}>
          <h3>Your {parent ? "reply" : "comment"}</h3>
          <Field
            label="Message"
            htmlFor="review-comment-message"
            description="Up to 10,000 characters. Mentions are plain text."
          >
            <TextArea
              id="review-comment-message"
              maxLength={10000}
              value={message}
              disabled={blocked}
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>
          {children?.((text) =>
            setMessage((current) =>
              `${current}${current && !current.endsWith(" ") ? " " : ""}${text} `.slice(
                0,
                10000,
              ),
            ),
          )}
        </div>
      </div>
    </Modal>
  );
}
