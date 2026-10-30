/**
 * SOURCE STAGE ONLY harness: mounts the real SessionComposer with a published control channel so the
 * Start Work / Delegate control appears exactly where the product puts it, and so the revision control
 * the composer itself mounts is the one under review. Served by tests/browser/work-stage.server.mjs,
 * which resolves the two canonical conversation contract families to the frozen successor generated
 * public files. The product build keeps the installed 0.1.26 package.
 */
import { useState, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import {
  createConversationComposer,
  useLiveComposer,
} from "@/features/meri/conversation/conversation-composer";
import { SessionComposer } from "@/features/meri/conversation/ConversationView";
import { createInitialDraftOwner } from "@/features/meri/conversation/initial-draft";
import type { MeriConversationPort } from "@/shared/meri-conversations/host-controller";
import type { ConversationSkillSelection } from "@/shared/meri-conversations/query-journal";
import type { ConversationContext } from "@/shared/meri-conversations/session";
import { revisionHandoff } from "@/shared/meri-documents/revision-handoff";
import type { ArtifactPreview } from "@/shared/meri-documents/artifact-access";
import {
  requireMeriTabStorage,
  syncMeriTabIdentity,
} from "@/shared/meri-conversations/tab-journal";
import type { LiveComposer } from "@/features/meri/MeriComposer";
import { CapiroDataProvider } from "@/shared/capiro/CapiroBoundary";
import "@/app/globals.css";
import { ALL_TYPED_SKILL_IDS } from "@/features/meri/conversation/quick-action-gate";

/**
 * The composer now mounts the native procedure control, which reads through the product's own Capiro
 * data provider. Its boundary answer is stubbed here — this host serves the work journey, not the
 * catalog — so the mounted composer is the same one the product mounts and nothing reaches a service.
 */
window.fetch = async (input: RequestInfo | URL) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  return url.includes("/api/capiro/")
    ? new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    : new Response(null, { status: 503 });
};

const context: ConversationContext = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "synthetic-client",
  conversationId: "synthetic-conversation",
  runId: "synthetic-run",
};
/**
 * The exact generated version the Files surface hands to the conversation. This host only plants
 * that input through the real handoff record; the fields the review does not exercise are not the
 * subject here, so the inspection payload is not rebuilt.
 */
const handedOver = {
  kind: "generated",
  filename: "Hearing brief.pdf",
  artifactId: "00000011-0000-4000-8000-000000000001",
  versionId: "00000012-0000-4000-8000-000000000002",
  objectSha256: "a".repeat(64),
} as unknown as ArtifactPreview;
/** Opening this version in the conversation is a handoff record written before the composer mounts. */
let handoverError = "";
try {
  syncMeriTabIdentity("synthetic-session");
  revisionHandoff(context).write(handedOver);
} catch (cause) {
  handoverError = cause instanceof Error ? cause.message : "handover failed";
}
const scope = { ...context, clientId: context.selectedClientId };
const port = { context } as unknown as MeriConversationPort;
const controls: LiveComposer = {
  onSend: () => undefined,
  onStop: () => undefined,
  scope: "Synthetic client",
  attachUnavailable: "Attachments unavailable",
};
type Session = ComponentProps<typeof SessionComposer>["session"];

function Harness() {
  const [selection, setSelection] = useState<ConversationSkillSelection>({});
  const [draft, setDraft] = useState("Start the research");
  const [channel] = useState(createConversationComposer);
  const [owner] = useState(() =>
    createInitialDraftOwner(scope, requireMeriTabStorage()),
  );
  useLiveComposer(channel, { port, running: false, controls });
  /** The product's own boundary: the draft owner admits and retains the whole selection. */
  const retainSelection = (value: ConversationSkillSelection) => {
    owner.selectSkill(value);
    setSelection(owner.selection() ?? {});
  };
  const session = {
    selectedId: context.conversationId,
    accessLost: false,
    connection: { state: { status: "ready" } },
    ready: { port, lifetimeKey: JSON.stringify(context) },
    draft,
    setDraft,
    textarea: { current: null },
    skillSelection: selection,
    setSkillSelection: retainSelection,
    initialDraft: owner,
    continuation: {
      intent: undefined,
      busy: false,
      failed: false,
      notReady: false,
      storageError: undefined,
      start: async () => false,
      retry: async () => false,
      readMapping: async () => false,
    },
  } as unknown as Session;
  return (
    <main style={{ padding: 24 }}>
      <h1>Synthetic Start Work / Delegate composer</h1>
      <SessionComposer
        toolsOpen
        onToggleTools={() => undefined}
        channel={channel}
        session={session}
        scope="Synthetic client"
        gate={{ status: "on", available: ALL_TYPED_SKILL_IDS }}
      />
      {handoverError ? <p role="alert">{handoverError}</p> : null}
      <output aria-label="Applied work">
        {JSON.stringify(selection.work ?? null)}
      </output>
      <output aria-label="Applied skill">
        {selection.skill ? selection.skill.skillId : "None"}
      </output>
      <output aria-label="Applied selection">
        {JSON.stringify(selection)}
      </output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <CapiroDataProvider onSessionExpired={() => undefined}>
    <Harness />
  </CapiroDataProvider>,
);
