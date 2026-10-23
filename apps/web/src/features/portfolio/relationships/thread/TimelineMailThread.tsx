"use client";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { canManageContacts } from "../contact-api";
import { MailCompose, type MailInitialDraft } from "../MailCompose";
import { threadKey, type ThreadScope } from "./contracts";
import { useMailThread } from "../email/read-pages";
import { replyRecipients } from "./recipients";
import { ThreadContent } from "./ThreadContent";
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
type SessionProps = {
  scope: ThreadScope;
  actorEmail: string | null;
  canReply: boolean;
};

function useThreadSession({ scope, actorEmail, canReply }: SessionProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<MailInitialDraft | null>(null);
  const [error, setError] = useState("");
  const [bodyError, setBodyError] = useState<Error | null>(null);
  const query = useMailThread(scope.threadId, scope.clientId, expanded);
  const thread =
    query.isSuccess && !query.error && !query.isFetching && !bodyError
      ? query.data
      : undefined;
  async function refresh() {
    const previous = bodyError;
    setDraft(null);
    setError("");
    await query.refresh();
    setBodyError((current) => (current === previous ? null : current));
  }
  function bodyFailed(failure: Error) {
    setBodyError(failure);
    setDraft(null);
  }
  function review(all: boolean) {
    if (!thread || !canReply || thread.hasMore) return;
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
  return {
    id,
    expanded,
    setExpanded,
    draft,
    setDraft,
    error,
    bodyError,
    query,
    thread,
    refresh,
    bodyFailed,
    review,
  };
}

function ThreadSession(props: SessionProps) {
  const state = useThreadSession(props);
  const {
    id,
    expanded,
    setExpanded,
    draft,
    setDraft,
    error,
    bodyError,
    query,
    thread,
    refresh,
    bodyFailed,
  } = state;
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
            pending={query.isPending || query.isFetching}
            error={bodyError ?? query.error}
            retry={refresh}
          />
          {thread && (
            <>
              <ThreadContent
                thread={thread}
                scope={query.scope}
                onReadFailure={bodyFailed}
              />
              <ThreadActions state={state} canReply={props.canReply} />
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
          clientId={props.scope.clientId}
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

function ThreadActions({
  state,
  canReply,
}: {
  state: ReturnType<typeof useThreadSession>;
  canReply: boolean;
}) {
  const { id, setExpanded, query, thread, refresh, review } = state;
  if (!thread) return null;
  return (
    <>
      <div className={styles.actions}>
        <small>
          Synced email · {thread.messages.length} of {thread.totalMessages}{" "}
          stored messages
        </small>
        <button
          className="button"
          disabled={!canReply || !thread.messages.length || thread.hasMore}
          onClick={() => review(false)}
        >
          Reply
        </button>
        <button
          className="button"
          disabled={!canReply || !thread.messages.length || thread.hasMore}
          onClick={() => review(true)}
        >
          Reply all
        </button>
        {query.hasNextPage && (
          <button className="button" onClick={() => void query.fetchNextPage()}>
            Load more messages
          </button>
        )}
        <button className="button ghost" onClick={refresh}>
          Refresh thread
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
      <small className="muted">
        {thread.hasMore
          ? query.hasNextPage
            ? "Load the remaining stored messages before preparing a reply."
            : "More messages exist beyond this reading limit. Open your mailbox to continue."
          : "End of stored messages."}{" "}
        Stored active text, newest loaded message first. Provider history may be
        incomplete.
        {thread.coverage.sourceStatus !== "healthy" &&
          " Mailbox sync is incomplete or unavailable."}
      </small>
      {!canReply && <small>Reply requires a permitted mailbox role.</small>}
    </>
  );
}
