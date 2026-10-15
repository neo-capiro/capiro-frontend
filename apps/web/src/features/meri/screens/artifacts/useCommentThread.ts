"use client";
import { useState } from "react";
import type {
  CommentThreadOpening,
  CommentThreadState,
  CommentThreadView,
  CommentView,
} from "./types";

/**
 * Local comment thread state (Figma document comments and 13.24 to 13.26): replying,
 * resolving and reopening change only this preview; nothing is sent or saved.
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
    cancelReply: () => setState("thread"),
    sendReply,
    resolve: () => setState("resolved"),
    reopen: () => setState("thread"),
    /** Closing after a reply returns the thread to its resting state; a resolved thread stays resolved. */
    settle: () =>
      setState((current) => (current === "replied" ? "thread" : current)),
  };
}

export type CommentThreadControls = ReturnType<typeof useCommentThread>;
