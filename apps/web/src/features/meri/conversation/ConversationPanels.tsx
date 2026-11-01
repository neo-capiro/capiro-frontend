"use client";
import type { ReactNode } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { ConversationArtifacts } from "./ConversationArtifacts";
import { conversationArtifacts, type TurnView } from "./conversation-view";
import { ConversationIntents } from "./intents/ConversationIntents";
import { useIntentApprovalsEnabled } from "./intents/approvals-enabled";
import { ConversationEvidence } from "./evidence/ConversationEvidence";
import type { IntentsItem } from "@capiro/meri-client/intents";
import { conversationFiles } from "./intents/prepared-files";

/**
 * The session-bound panels below the turns: the closed sources/usage details, actions prepared for
 * approval (only when the deployment enables approvals and Meri prepared one), then published files
 * and authorized prepared drafts.
 */
export function ConversationPanels({
  port,
  turn,
  earlier,
  onDecisionSettled,
  browser,
  details,
}: {
  port: MeriConversationPort;
  turn: TurnView | null;
  earlier: readonly TurnView[];
  onDecisionSettled?: ((runId: string) => void) | undefined;
  /** Browser controls, mounted only for a browser task or an opened Tools panel. */
  browser?: ReactNode;
  /** Extra audit material for the same details disclosure, e.g. a finished run's checkpoint. */
  details?: ReactNode;
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
      <ConversationEvidence
        reads={port.reads}
        uploads={port.uploads}
        turn={turn}
        earlier={earlier}
      >
        {details}
      </ConversationEvidence>
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
      {browser}
    </>
  );
}
