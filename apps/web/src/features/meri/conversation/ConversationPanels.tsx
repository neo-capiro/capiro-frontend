"use client";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { ConversationArtifacts } from "./ConversationArtifacts";
import { conversationArtifacts, type TurnView } from "./conversation-view";
import { ConversationIntents } from "./intents/ConversationIntents";
import { useIntentApprovalsEnabled } from "./intents/approvals-enabled";
import { ConversationEvidence } from "./evidence/ConversationEvidence";
import type { IntentsItem } from "@capiro/meri-client/intents";
import { conversationFiles } from "./intents/prepared-files";

/**
 * The session-bound panels below the turns: actions prepared for approval (only when the deployment
 * enables approvals), then published files and authorized prepared drafts.
 */
export function ConversationPanels({
  port,
  turn,
  earlier,
  onDecisionSettled,
}: {
  port: MeriConversationPort;
  turn: TurnView | null;
  earlier: readonly TurnView[];
  onDecisionSettled?: ((runId: string) => void) | undefined;
}) {
  const approvals = useIntentApprovalsEnabled();
  const published = conversationArtifacts(turn ? [...earlier, turn] : earlier);
  const files = (items: readonly IntentsItem[]) => (
    <ConversationArtifacts
      artifacts={conversationFiles(published, items)}
      access={port.artifacts}
    />
  );
  return (
    <>
      <ConversationEvidence reads={port.reads} turn={turn} earlier={earlier} />
      {approvals ? (
        <ConversationIntents
          access={port.intents}
          scope={port.context}
          onDecisionSettled={onDecisionSettled}
          refreshKey={`${turn?.runState ?? ""}:${turn?.approvals.length ?? 0}:${turn?.artifacts.length ?? 0}`}
        >
          {files}
        </ConversationIntents>
      ) : (
        files([])
      )}
    </>
  );
}
