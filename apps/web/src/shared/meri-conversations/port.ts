import { createMeriConversation } from "@capiro/meri-client/conversation";
import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
import { createArtifactAccess } from "../meri-documents/artifact-access";
import { createUploadAccess } from "../meri-uploads/access";
import { createIntentsAccess } from "../meri-intents/access";
import { createFeedbackAccess } from "../meri-feedback/access";
import { SelectedTabAccess } from "../meri-selected-tab/access";
import { createConversationReads } from "./current-reads";

type Lifetime = {
  session: ConversationSessionReceipt;
  signal: AbortSignal;
  isCurrent: () => boolean;
  onAccessLost: () => void;
  now: () => number;
};

/** Compose the admitted conversation and its resources under one native session.
 * The host owns issuance/account matching; each resource retains its own receiver. */
export function createConversationPort(
  { session, signal, ...lifetime }: Lifetime,
  { fetcher, origin }: { fetcher?: typeof fetch; origin?: string },
) {
  const conversation = createMeriConversation({
    context: session.context,
    credential: session.credential,
    expiresAtMs: session.expiresAtMs,
    signal,
    ...lifetime,
    fetchImpl: fetcher,
    origin,
    credentialHeader: origin ? "authorization" : "x-meri-action-session",
  });
  // Established attachments reuse the conversation's exact admitted references.
  const uploads = createUploadAccess({
    credential: session.credential,
    lifetime: signal,
    isCurrent: lifetime.isCurrent,
    established: () =>
      conversation.getSnapshot().acceptedRequest?.uploads ?? [],
    ...(fetcher ? { fetcher } : {}),
  });
  const selectedTab = new SelectedTabAccess({
    context: session.context,
    uploads,
    lifetime: signal,
    expiresAtMs: session.expiresAtMs,
    isCurrent: lifetime.isCurrent,
    now: lifetime.now,
  });
  const dispose = () => {
    selectedTab.dispose();
    uploads.dispose();
    conversation.dispose();
  };
  try {
    return Object.freeze({
      ...conversation,
      context: session.context,
      uploads,
      selectedTab,
      dispose,
      feedback: createFeedbackAccess({
        credential: session.credential,
        context: session.context,
        lifetime: signal,
        isCurrent: lifetime.isCurrent,
        onAccessLost: lifetime.onAccessLost,
        fetcher,
        origin,
      }),
      reads: createConversationReads(
        session.context,
        signal,
        lifetime.isCurrent,
        lifetime.onAccessLost,
        fetcher,
      ),
      artifacts: createArtifactAccess(session.credential, signal, fetcher),
      intents: createIntentsAccess(
        session.credential,
        signal,
        fetcher,
        session.context,
        lifetime.onAccessLost,
      ),
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
export type MeriConversationPort = ReturnType<typeof createConversationPort>;
