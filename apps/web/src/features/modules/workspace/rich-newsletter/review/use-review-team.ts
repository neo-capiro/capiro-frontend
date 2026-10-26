"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  parseNewsletterReviewerTeam,
  type NewsletterReviewerTeam,
} from "@capiro/shared/newsletter";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { isReviewAccessLoss } from "./use-review-actions";

export function useReviewTeam(
  documentId: string,
  currentUserId: string,
  onAccessLost: () => void,
) {
  const [requested, setRequested] = useState(false);
  const [written, setWritten] = useState<NewsletterReviewerTeam>();
  const clear = useCallback(() => {
    setWritten(undefined);
    setRequested(false);
  }, []);
  const query = useCapiroQuery(
    "workspace.richNewsletter.team",
    { params: { id: documentId } },
    { enabled: requested },
  );
  const received = useMemo(
    () => parseNewsletterReviewerTeam(query.data, { currentUserId }),
    [query.data, currentUserId],
  );
  const malformed = requested && !query.loading && !query.error && !received.ok;
  useEffect(() => {
    if (isReviewAccessLoss(query.error) || malformed) onAccessLost();
  }, [query.error, malformed, onAccessLost]);
  return {
    clear,
    team:
      written ??
      (requested && !query.loading && !query.error && received.ok
        ? received.value
        : undefined),
    loading: requested && query.loading,
    error:
      requested && !query.loading && (Boolean(query.error) || !received.ok),
    apply: setWritten,
    open() {
      setWritten(undefined);
      if (requested) query.reload();
      else setRequested(true);
    },
  };
}
