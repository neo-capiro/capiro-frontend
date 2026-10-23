"use client";
import { useContext } from "react";
import Link from "next/link";
import { useIdentity } from "../portfolio/auth/identity";
import { SessionContext } from "../session/SessionContext";
import { useManagedConversations } from "../meri-conversations/useManagedConversations";
import { conversationHref } from "../meri-conversations/conversation-navigation";

type Props = {
  enabled: boolean;
  className?: string | undefined;
  onNavigate?: (() => void) | undefined;
};
/** The shell may render outside signed-in providers. Read nothing until the verified owner is present. */
export function ConversationRecents(props: Props) {
  const session = useContext(SessionContext);
  if (!props.enabled || session !== "signed-in")
    return <p>Recent conversations unavailable</p>;
  return <VerifiedRecents {...props} />;
}
function VerifiedRecents(props: Props) {
  const identity = useIdentity();
  const account =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  if (!account?.tenant?.id) return <p>A verified account is required.</p>;
  return (
    <RecentLinks key={`${account.tenant.id}:${account.user.id}`} {...props} />
  );
}
function RecentLinks({ className, onNavigate }: Props) {
  const { query, current } = useManagedConversations("", "active");
  const chats = current
    ? (query.data?.pages.flatMap((page) => page.conversations) ?? [])
    : [];
  return (
    <>
      {query.isPending || query.isFetching ? (
        <p role="status">Loading recent conversations.</p>
      ) : !current ? (
        <p role="status">Recent conversations unavailable.</p>
      ) : (
        <>
          {chats.map((row) => (
            <Link
              key={row.conversationId}
              className={className}
              href={conversationHref(row.clientId, row.conversationId)}
              onClick={onNavigate}
            >
              {row.title}
              <span>
                {" "}
                · {row.scopeKind === "general" ? "General" : "Client chat"}
              </span>
            </Link>
          ))}
          {!chats.length && <p>No recent conversations.</p>}
        </>
      )}
      {query.error ? (
        <button
          type="button"
          className={className}
          onClick={() => void query.refetch()}
        >
          Retry recent conversations
        </button>
      ) : (
        query.hasNextPage && (
          <button
            type="button"
            className={className}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? "Loading conversations…"
              : "More conversations"}
          </button>
        )
      )}
    </>
  );
}
