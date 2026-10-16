"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
import { Popover } from "./Popover";
import type { CommentThreadState, CommentView } from "./types";
import type { CommentThreadControls } from "./useCommentThread";
import shared from "./artifacts.module.css";
import styles from "./document.module.css";
import c from "./comments.module.css";

const titles: Readonly<Record<CommentThreadState, string | null>> = {
  thread: null,
  reply: "Reply to comment",
  replied: "Reply added",
  resolved: "Comment resolved",
  reopened: "Comment reopened",
  open: "Comments · 1 open thread",
};

/** Local-only outcome of the state just reached; states without one show no status line. */
const outcomes: Readonly<Partial<Record<CommentThreadState, string>>> = {
  replied: "Added to this local preview only. Nothing was sent.",
  resolved: "Resolved in this local preview only. Nothing was saved.",
  reopened: "Reopened in this local preview only. Nothing was saved.",
};

const labelSuffix: Readonly<Partial<Record<CommentThreadState, string>>> = {
  resolved: " · Resolved",
  reopened: " · Reopened",
};

/** States whose overlay ends with Done: the outcomes and the open thread. */
const withDone: ReadonlySet<CommentThreadState> = new Set([
  "replied",
  "resolved",
  "reopened",
  "open",
]);

/** One comment or reply: label, author, text, time and its actions (an empty row keeps the card height). */
function CommentCard({
  label,
  comment,
  framed,
  children,
}: {
  label: string;
  comment: CommentView;
  framed: boolean;
  children?: ReactNode;
}) {
  return (
    <article
      className={framed ? c.card : c.bare}
      aria-label={`${label}, ${comment.author}`}
    >
      <p className={c.label}>{label}</p>
      <p className={c.author}>
        <span aria-hidden>{comment.initials}</span> {comment.author}
      </p>
      <p className={c.text}>{comment.text}</p>
      <p className={c.time}>{comment.time}</p>
      <div className={c.actions}>{children}</div>
    </article>
  );
}

/** The thread's own actions for its current state. */
function ThreadActions({ thread }: { thread: CommentThreadControls }) {
  if (thread.state === "reply") return null;
  if (thread.state === "resolved")
    return (
      <button
        type="button"
        className={ui.ghost}
        data-focus-on-state
        onClick={thread.reopen}
      >
        Reopen
      </button>
    );
  return (
    <>
      <button
        type="button"
        className={ui.outline}
        aria-haspopup="dialog"
        data-focus-on-state={thread.state !== "replied" || undefined}
        onClick={thread.startReply}
      >
        Reply
      </button>
      <button type="button" className={ui.ghost} onClick={thread.resolve}>
        Resolve
      </button>
    </>
  );
}

/** Reply field with Cancel and Send reply; sending adds the reply to this preview only. */
function ReplyForm({ thread }: { thread: CommentThreadControls }) {
  return (
    <form
      className={c.form}
      onSubmit={(event) => {
        event.preventDefault();
        thread.sendReply();
      }}
    >
      <FormField
        label="Reply"
        multiline
        value={thread.draft}
        onChange={thread.setDraft}
      />
      <div className={c.formActions}>
        <button
          type="button"
          className={ui.outline}
          onClick={thread.cancelReply}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={ui.primary}
          disabled={!thread.draft.trim()}
          title={thread.draft.trim() ? undefined : "Write a reply first."}
        >
          Send reply
        </button>
      </div>
    </form>
  );
}

/**
 * Document overlay · comments with its local reply, reply-added, resolved, reopened and
 * open-thread states (Figma 13.24 to 13.28). Focus moves to the main control of each new state.
 */
export function CommentThread({
  thread,
  onClose,
}: {
  thread: CommentThreadControls;
  onClose: () => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const shown = useRef(thread.state);
  useEffect(() => {
    if (shown.current === thread.state) return;
    shown.current = thread.state;
    content.current
      ?.querySelector<HTMLElement>("textarea, [data-focus-on-state]")
      ?.focus();
  }, [thread.state]);
  const title = titles[thread.state];
  const close = () => {
    thread.settle();
    onClose();
  };
  const resolved = thread.state === "resolved";
  const outcome = outcomes[thread.state];
  /** Done after a reply shows the open thread (13.28); everywhere else it closes the overlay. */
  const done = thread.state === "replied" ? thread.showOpenThread : close;
  return (
    <Popover
      label={title ?? "Comments"}
      onClose={close}
      className={title ? c.wide : styles.alignEnd}
    >
      <div ref={content} className={c.content}>
        {title ? <h2 className={c.title}>{title}</h2> : null}
        <CommentCard
          label={`Comment · 1${labelSuffix[thread.state] ?? ""}`}
          comment={thread.comment}
          framed={Boolean(title)}
        >
          <ThreadActions thread={thread} />
        </CommentCard>
        {resolved
          ? null
          : thread.replies.map((reply, index) => (
              <CommentCard
                key={reply.id}
                label={`Reply · ${index + 2}`}
                comment={reply}
                framed={Boolean(title)}
              />
            ))}
        {thread.state === "reply" ? <ReplyForm thread={thread} /> : null}
        {outcome ? (
          <p className={shared.caption} role="status">
            {outcome}
          </p>
        ) : null}
        {withDone.has(thread.state) ? (
          <button
            type="button"
            className={`${ui.outline} ${c.done}`}
            data-focus-on-state={thread.state === "replied" || undefined}
            onClick={done}
          >
            Done
          </button>
        ) : null}
      </div>
    </Popover>
  );
}
