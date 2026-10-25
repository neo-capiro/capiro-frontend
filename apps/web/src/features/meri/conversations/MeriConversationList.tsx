"use client";

import { useSearchParams } from "next/navigation";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { LiveNewConversation } from "../../../shared/shell/LiveNewConversation";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import {
  ConversationHistoryList,
  GENERAL_CLIENT_FILTER,
} from "./ConversationHistoryList";
import ui from "../ui/meri-ui.module.css";
import cards from "../ui/phone-cards.module.css";
import phone from "../ui/phone-page.module.css";

type Props = {
  enabled: boolean;
  firstChatBootstrapEnabled: boolean;
};

/** Figma 01.04 Conversation history: account-owned discovery; Core rechecks each chat's immutable scope and client wall. */
export function MeriConversationList(props: Props) {
  const capabilities = useMeriCapabilities();
  const params = useSearchParams();
  const enabled = props.enabled && capabilities.conversations.status === "on";
  const initialClient =
    params.get("scope") === "general" && !params.has("clientId")
      ? GENERAL_CLIENT_FILTER
      : (params.get("clientId") ?? undefined);
  const newConversation = (variant: "primary" | "outline") => (
    <LiveNewConversation
      assetSet="home"
      className={ui[variant]}
      conversationEnabled={enabled}
      firstChatBootstrapEnabled={
        props.firstChatBootstrapEnabled &&
        capabilities.newConversation.status === "on"
      }
    />
  );
  return (
    <div className={`${ui.page} ${phone.page} ${cards.cards}`}>
      <MeriPageHeading
        title="Conversations"
        description="Find previous work, including runs that are still active."
        action={newConversation("primary")}
      />
      {!enabled ? (
        <p role="status">
          Conversation history is not enabled for this workspace.
        </p>
      ) : (
        <ConversationHistoryList
          initialClient={initialClient}
          newConversation={newConversation("outline")}
        />
      )}
    </div>
  );
}
