"use client";
import { useState } from "react";
import type {
  CommentThreadOpening,
  CommentThreadState,
  CommentThreadView,
  CommentView,
} from "./types";

/**
 * Local comment thread state (Figma document comments and 13.24 to 13.28): replying,
 * resolving and reopening change only this preview; nothing is sent or saved.
 * Replies stay with the thread through resolve and reopen.
 */
export function useCommentThread(
  view: CommentThreadView,
  opening: CommentThreadOpening = { state: "thread" },
) {
  const [state, setState] = useState<CommentThreadState>(opening.state);
  const [replies, setReplies] = useState<readonly CommentView[]>(
    opening.replies ?? [],
  );
  const [draft, setDraft] = useState(view.replyDraft);
  /** A thread with replies rests as the open thread (13.28); without them, as the bare thread. */
  const resting: CommentThreadState = replies.length ? "open" : "thread";
  const sendReply = () => {
    const text = draft.trim();
    if (!text) return;
    setReplies((current) => [
      ...current,
      {
        ...view.replyAuthor,
        id: `reply-${current.length + 1}`,
        text,
        time: "Just now",
      },
    ]);
    setDraft("");
    setState("replied");
  };
  return {
    comment: view.comment,
    state,
    replies,
    draft,
    setDraft,
    startReply: () => setState("reply"),
    cancelReply: () => setState(resting),
    sendReply,
    resolve: () => setState("resolved"),
    reopen: () => setState("reopened"),
    /** Done after a reply shows the open thread with that reply (13.25 to 13.28). */
    showOpenThread: () => setState("open"),
    /** Closing returns the thread to its resting state; a resolved thread stays resolved. */
    settle: () =>
      setState((current) => (current === "resolved" ? current : resting)),
  };
}

export type CommentThreadControls = ReturnType<typeof useCommentThread>;
