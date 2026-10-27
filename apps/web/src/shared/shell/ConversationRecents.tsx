"use client";
import { useContext } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useIdentity } from "../portfolio/auth/identity";
import { SessionContext } from "../session/SessionContext";
import { useSelectedClient } from "../session/SelectedClient";
import { useConversationDiscovery } from "../meri-conversations/history-queries";
import type { ConversationAccount } from "../meri-conversations/host-controller";
import { useRecentConversationTitles } from "../meri-conversations/history-queries";
import { recentTitle } from "../meri-conversations/recent-titles";
import { conversationLabel } from "../meri-conversations/conversation-navigation";

type Props = {
  enabled: boolean;
  className?: string | undefined;
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
  const params = useSearchParams();
  const general =
    params.getAll("scope").length === 1 &&
    params.get("scope") === "general" &&
    !params.has("clientId");
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  if (!current?.tenant?.id)
    return <p>Verify your account to load recent conversations.</p>;
  if (!general && selected.state !== "authorized-client")
    return (
      <p>Choose General or a permitted client to load recent conversations.</p>
    );
  const account = { tenantId: current.tenant.id, actorId: current.user.id };
  const clientId = general
    ? null
    : selected.state === "authorized-client"
      ? selected.client.id
      : null;
  return (
    <RecentLinks
      key={JSON.stringify([account, clientId])}
      {...props}
      account={account}
      clientId={clientId}
    />
  );
}

function RecentLinks({
  account,
  clientId,
  className,
  onNavigate,
}: Props & { account: ConversationAccount; clientId: string | null }) {
  const { query, conversations, unavailable } = useConversationDiscovery(
    account,
    clientId,
  );
  const loading = query.isPending || query.isRefetching;
  const summaries = useRecentConversationTitles(account);
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
              href={`/meri?${new URLSearchParams({ ...(clientId === null ? { scope: "general" } : { clientId }), conversationId: conversation.conversationId })}`}
              onClick={onNavigate}
            >
              {recentTitle(conversation, summaries) ??
                conversationLabel(conversation.createdAt)}
            </Link>
          ))}
          {!conversations.length && (
            <p>
              {clientId === null
                ? "No General conversations in the loaded pages."
                : "No conversations for this client in the loaded pages."}
            </p>
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
