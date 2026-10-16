"use client";
import { useContext } from "react";
import Link from "next/link";
import { useIdentity } from "../portfolio/auth/identity";
import { SessionContext } from "../session/SessionContext";
import { useSelectedClient } from "../session/SelectedClient";
import { useConversationDiscovery } from "../meri-conversations/history-queries";
import type { ConversationAccount } from "../meri-conversations/host-controller";

type Props = {
  enabled: boolean;
  className: string;
  onNavigate?: (() => void) | undefined;
};

/** The surrounding shell can render before sign-in and outside the data provider. */
export function ConversationRecents(props: Props) {
  const session = useContext(SessionContext);
  if (!props.enabled || session !== "signed-in")
    return <p>Recent conversations unavailable</p>;
  return <VerifiedRecents {...props} />;
}

function VerifiedRecents(props: Props) {
  const identity = useIdentity(),
    selected = useSelectedClient();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  if (!current?.tenant?.id || selected.state !== "authorized-client")
    return <p>A verified account and current client are required.</p>;
  const account = { tenantId: current.tenant.id, actorId: current.user.id };
  return (
    <RecentLinks
      key={JSON.stringify([account, selected.client.id])}
      {...props}
      account={account}
      clientId={selected.client.id}
    />
  );
}

function RecentLinks({
  account,
  clientId,
  className,
  onNavigate,
}: Props & { account: ConversationAccount; clientId: string }) {
  const { query, conversations, unavailable } = useConversationDiscovery(
    account,
    clientId,
  );
  const loading = query.isPending || query.isRefetching;
  return (
    <>
      {loading ? (
        <p role="status">Loading recent conversations.</p>
      ) : unavailable ? (
        <p
          role="status"
          title="The conversation list could not be verified for the current account and client."
        >
          Recent conversations unavailable.
        </p>
      ) : (
        <>
          {conversations.map((conversation) => (
            <Link
              key={conversation.conversationId}
              className={className}
              href={`/meri?${new URLSearchParams({ clientId, conversationId: conversation.conversationId })}`}
              onClick={onNavigate}
            >
              Conversation ·{" "}
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              }).format(new Date(conversation.createdAt))}{" "}
              UTC
            </Link>
          ))}
          {!conversations.length && (
            <p>No conversations for this client in the loaded pages.</p>
          )}
        </>
      )}
      {unavailable ? (
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
