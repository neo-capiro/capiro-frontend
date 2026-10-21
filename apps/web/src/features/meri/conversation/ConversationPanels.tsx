"use client";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { ConversationArtifacts } from "./ConversationArtifacts";
import { conversationArtifacts, type TurnView } from "./conversation-view";
import { ConversationIntents } from "./intents/ConversationIntents";
import { useIntentApprovalsEnabled } from "./intents/approvals-enabled";

/**
 * The session-bound panels below the turns: actions prepared for approval (only when the deployment
 * enables approvals), then published files.
 */
export function ConversationPanels({
  port,
  turn,
  earlier,
}: {
  port: MeriConversationPort;
  turn: TurnView | null;
  earlier: readonly TurnView[];
}) {
  const approvals = useIntentApprovalsEnabled();
  return (
    <>
      {approvals && (
        <ConversationIntents
          access={port.intents}
          scope={port.context}
          refreshKey={`${turn?.runState ?? ""}:${turn?.approvals.length ?? 0}:${turn?.artifacts.length ?? 0}`}
        />
      )}
      <ConversationArtifacts
        artifacts={conversationArtifacts(turn ? [...earlier, turn] : earlier)}
        access={port.artifacts}
      />
    </>
  );
}
