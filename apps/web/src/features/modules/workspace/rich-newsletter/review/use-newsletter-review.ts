"use client";
import { useMemo, useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { CapiroApiError } from "../../../../../shared/capiro/http";
import { receiveComments, receiveReview } from "./receiving";

/** One explicit read view. Existing hooks own cancellation and scope disposal. */
export function useNewsletterReview(documentId: string) {
  const [opened, setOpened] = useState(false);
  const [commentsRequested, setCommentsRequested] = useState(false);
  const query = useCapiroQuery(
    "workspace.richNewsletter.review",
    {
      params: { id: documentId },
    },
    { enabled: opened },
  );
  const received = useMemo(
    () => receiveReview(query.data, documentId),
    [query.data, documentId],
  );
  const admitted =
    opened && !query.loading && !query.error && received.ok
      ? received.value
      : undefined;
  const commentsQuery = useCapiroQuery(
    "workspace.richNewsletter.comments",
    {
      params: { id: documentId },
    },
    { enabled: commentsRequested && Boolean(admitted) },
  );
  const comments = useMemo(
    () => receiveComments(commentsQuery.data, documentId),
    [commentsQuery.data, documentId],
  );
  const refused =
    commentsQuery.error instanceof CapiroApiError &&
    [401, 403, 404].includes(commentsQuery.error.status);
  const malformed =
    commentsRequested &&
    !commentsQuery.loading &&
    !commentsQuery.error &&
    !comments.ok;
  const review = refused || malformed ? undefined : admitted;
  const unavailable = opened && !query.loading && !review;
  const accessLost =
    refused ||
    (query.error instanceof CapiroApiError &&
      [401, 403, 404].includes(query.error.status));
  return {
    opened,
    review,
    unavailable,
    accessLost,
    loading: query.loading,
    commentsLoading: commentsRequested && commentsQuery.loading,
    commentsError: Boolean(commentsQuery.error),
    comments: !review
      ? undefined
      : !commentsRequested
        ? review.comments
        : !commentsQuery.loading && !commentsQuery.error && comments.ok
          ? comments.value.items
          : undefined,
    open() {
      setCommentsRequested(false);
      if (opened) query.reload();
      else setOpened(true);
    },
    refreshComments() {
      if (!review || commentsQuery.loading) return;
      if (commentsRequested) commentsQuery.reload();
      else setCommentsRequested(true);
    },
  };
}
