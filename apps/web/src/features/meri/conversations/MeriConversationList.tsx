"use client";

import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { LiveNewConversation } from "../../../shared/shell/LiveNewConversation";
import { MeriClientSelector } from "../MeriClientSelector";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import { ManagedConversationPanel } from "./ManagedConversationPanel";
import ui from "../ui/meri-ui.module.css";

type Props = {
  enabled: boolean;
  firstChatBootstrapEnabled: boolean;
  firstChatBootstrapClientId?: string;
};

/** Current account-owned discovery; Core rechecks each chat's immutable scope and client wall. */
export function MeriConversationList(props: Props) {
  const identity = useIdentity();
  const capabilities = useMeriCapabilities();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const enabled = props.enabled && capabilities.conversations.status === "on";
  const account = current?.tenant?.id
    ? { tenantId: current.tenant.id, actorId: current.user.id }
    : undefined;
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Conversations"
        description="Find your saved chats, or manage their titles and history. Each chat keeps its original scope."
        action={
          <LiveNewConversation
            assetSet="home"
            className={ui.primary}
            conversationEnabled={enabled}
            firstChatBootstrapEnabled={
              props.firstChatBootstrapEnabled &&
              capabilities.newConversation.status === "on"
            }
            firstChatBootstrapClientId={props.firstChatBootstrapClientId}
          />
        }
      />
      <MeriClientSelector
        destination="/meri/conversations"
        scope={
          account
            ? { tenantId: account.tenantId, userId: account.actorId }
            : undefined
        }
      />
      {!enabled ? (
        <p role="status">
          Conversation history is not enabled for this workspace.
        </p>
      ) : !account ? (
        <p role="status">Verify your account to load your chats.</p>
      ) : (
        <ManagedConversationPanel
          key={JSON.stringify([account.tenantId, account.actorId])}
        />
      )}
    </div>
  );
}
