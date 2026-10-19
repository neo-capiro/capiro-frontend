"use client";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { ConversationArtifacts } from "./ConversationArtifacts";
import { conversationArtifacts, type TurnView } from "./conversation-view";
import { ConversationIntents } from "./intents/ConversationIntents";

/** The session-bound panels below the turns: actions prepared for approval, then published files. */
export function ConversationPanels({
  port,
  turn,
  earlier,
}: {
  port: MeriConversationPort;
  turn: TurnView | null;
  earlier: readonly TurnView[];
}) {
  return (
    <>
      <ConversationIntents
        access={port.intents}
        scope={port.context}
        refreshKey={`${turn?.runState ?? ""}:${turn?.approvals.length ?? 0}:${turn?.artifacts.length ?? 0}`}
      />
      <ConversationArtifacts
        artifacts={conversationArtifacts(turn ? [...earlier, turn] : earlier)}
        access={port.artifacts}
      />
    </>
  );
}
