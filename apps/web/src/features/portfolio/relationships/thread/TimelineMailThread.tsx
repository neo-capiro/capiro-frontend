"use client";
import { useId, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { canManageContacts } from "../contact-api";
import { MailCompose, type MailInitialDraft } from "../MailCompose";
import { readTimelineThread, threadKey, type ThreadScope } from "./contracts";
import { replyRecipients } from "./recipients";
import { ThreadContent, MailCoverageNotice } from "./ThreadContent";
import {
  mergeMailPages,
  nextMailPage,
  type MailContinuation,
} from "../email/read";
import styles from "./thread.module.css";

const replyGap =
  "Reply sending is unavailable here. You can review recipients and text, then reply from your mailbox.";
export function TimelineMailThread({
  clientId,
  threadId,
}: {
  clientId: string;
  threadId: string;
}) {
  const identity = useIdentity();
  const cache = useQueryClient();
  const owner = identity.data;
  const invalidated =
    identity.isStale && cache.getQueryState(["identity"])?.isInvalidated;
  const verified =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    !invalidated &&
    Boolean(owner?.tenant?.id.trim() && owner.user.id.trim());
  if (!verified || !owner?.tenant)
    return (
      <QueryState
        pending={identity.isPending || identity.isFetching}
        error={identity.error}
      />
    );
  const scope = {
    tenantId: owner.tenant.id,
    userId: owner.user.id,
    clientId,
    threadId,
  };
  return (
    <ThreadSession
      key={JSON.stringify(threadKey(scope))}
      scope={scope}
      actorEmail={owner.user.email}
      canReply={canManageContacts(owner.role)}
    />
  );
}
function ThreadSession({
  scope,
  actorEmail,
  canReply,
}: {
  scope: ThreadScope;
  actorEmail: string | null;
  canReply: boolean;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<MailInitialDraft | null>(null);
  const [error, setError] = useState("");
  const [bodyError, setBodyError] = useState<Error | null>(null);
  const query = useInfiniteQuery({
    queryKey: threadKey(scope),
    enabled: expanded,
    initialPageParam: {} as MailContinuation,
    queryFn: ({ signal, pageParam }) =>
      readTimelineThread(api, scope, signal, pageParam),
    getNextPageParam: nextMailPage,
    select: (data) => mergeMailPages(data.pages),
  });
  const thread =
    query.isSuccess &&
    !query.error &&
    !bodyError &&
    (!query.isFetching || query.isFetchingNextPage)
      ? query.data
      : undefined;
  function review(all: boolean) {
    if (!thread || !canReply || thread.hasMore || query.isFetching) return;
    try {
      const recipients = replyRecipients(thread, actorEmail, all);
      setError("");
      setDraft({
        subject: `Re: ${thread.subject.replace(/^Re:\s*/i, "")}`,
        to: recipients.to,
        cc: recipients.cc,
      });
    } catch (error) {
      setError(
        error instanceof Error && !error.message.startsWith("[")
          ? error.message
          : "Stored recipient data could not be verified. Review this message in your mailbox.",
      );
    }
  }
  return (
    <section className={styles.thread} aria-label="Synced email thread">
      {!expanded ? (
        <button
          className="button ghost"
          aria-expanded={false}
          aria-controls={id}
          onClick={() => setExpanded(true)}
        >
          Expand email thread
        </button>
      ) : (
        <div id={id} className={styles.expanded}>
          <QueryState
            pending={
              query.isPending || (query.isFetching && !query.isFetchingNextPage)
            }
            error={query.error ?? bodyError}
            retry={() => {
              setBodyError(null);
              void cache.resetQueries({
                queryKey: threadKey(scope),
                exact: true,
              });
            }}
          />
          {thread && (
            <>
              <ThreadContent
                thread={thread}
                scope={scope}
                onReadError={setBodyError}
              />
              <MailCoverageNotice coverage={thread.coverage} />
              <div className={styles.actions}>
                <small>
                  Synced email · {thread.messages.length} of{" "}
                  {thread.totalMessages} stored messages loaded
                </small>
                <button
                  className="button"
                  disabled={
                    !canReply ||
                    !thread.messages.length ||
                    thread.hasMore ||
                    query.isFetching
                  }
                  onClick={() => review(false)}
                >
                  Reply
                </button>
                <button
                  className="button"
                  disabled={
                    !canReply ||
                    !thread.messages.length ||
                    thread.hasMore ||
                    query.isFetching
                  }
                  onClick={() => review(true)}
                >
                  Reply all
                </button>
                <button
                  className="button ghost"
                  aria-expanded={true}
                  aria-controls={id}
                  onClick={() => setExpanded(false)}
                >
                  Show less
                </button>
              </div>
              {query.hasNextPage && (
                <button
                  className="button"
                  disabled={query.isFetching}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage
                    ? "Loading messages…"
                    : "Load more messages"}
                </button>
              )}
              {thread.hasMore && !query.hasNextPage && (
                <p className="muted">
                  The stored thread read limit was reached. Review remaining
                  messages in your mailbox.
                </p>
              )}
              {thread.hasMore && (
                <small>
                  Load the remaining stored messages before reviewing reply
                  recipients.
                </small>
              )}
              <button
                className="button ghost"
                disabled={query.isFetching}
                onClick={() => {
                  setDraft(null);
                  setBodyError(null);
                  void cache.resetQueries({
                    queryKey: threadKey(scope),
                    exact: true,
                  });
                }}
              >
                Refresh thread
              </button>
              <small className="muted">
                Loaded active messages, newest first. Earlier pages load first.
                Refresh if the stored thread changes.
              </small>
              {!canReply && (
                <small>Reply requires a permitted mailbox role.</small>
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {!thread && (
            <button
              className="button ghost"
              aria-expanded={true}
              aria-controls={id}
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          )}
        </div>
      )}
      {draft && thread && (
        <MailCompose
          clientId={scope.clientId}
          person={{
            name: draft.to?.[0]?.name ?? draft.to?.[0]?.email ?? "Recipient",
            email: draft.to?.[0]?.email ?? null,
            title: null,
          }}
          thread={{ id: thread.id, subject: thread.subject }}
          initialDraft={draft}
          onClose={() => setDraft(null)}
          sendBlockedReason={replyGap}
        />
      )}
    </section>
  );
}
