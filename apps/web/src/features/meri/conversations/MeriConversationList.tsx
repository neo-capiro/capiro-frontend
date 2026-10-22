"use client";

import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { LiveNewConversation } from "../../../shared/shell/LiveNewConversation";
import { MeriClientSelector } from "../MeriClientSelector";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import { ConversationList } from "./ConversationList";
import ui from "../ui/meri-ui.module.css";

type Props = {
  enabled: boolean;
  firstChatBootstrapEnabled: boolean;
  firstChatBootstrapClientId?: string;
};

/** Only a current account and active, verified client may mount private discovery. */
export function MeriConversationList(props: Props) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const capabilities = useMeriCapabilities();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const enabled = props.enabled && capabilities.conversations.status === "on";
  const client =
    selected.state === "authorized-client" ? selected.client : undefined;
  const account = current?.tenant?.id
    ? { tenantId: current.tenant.id, actorId: current.user.id }
    : undefined;
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Conversations"
        description="Open a saved conversation in its original client scope."
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
      ) : !account || !client ? (
        <p role="status">
          A verified account and current client are required to load
          conversations.
        </p>
      ) : client.status === "archived" ? (
        <p role="alert">
          This client is archived. Select an active client to load
          conversations.
        </p>
      ) : (
        <ConversationList
          key={JSON.stringify([account.tenantId, account.actorId, client.id])}
          account={account}
          clientId={client.id}
          clientName={client.name}
        />
      )}
    </div>
  );
}
