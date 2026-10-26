import { createRoot } from "react-dom/client";
import { ConversationPanels } from "../../../src/features/meri/conversation/ConversationPanels";
import { IntentApprovalsEnabled } from "../../../src/features/meri/conversation/intents/approvals-enabled";
import { createIntentsAccess } from "../../../src/shared/meri-intents/access";
import { createArtifactAccess } from "../../../src/shared/meri-documents/artifact-access";
import { syncMeriTabIdentity } from "../../../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../../../src/shared/meri-conversations/host-controller";
import type { TurnView } from "../../../src/features/meri/conversation/conversation-view";
import { intentsMetadata, type IntentsItem } from "@capiro/meri-client/intents";
import { accessInspection } from "../../../tests/meri-document-access-fixtures";
import {
  documentBytes,
  ids,
  session,
} from "../../../tests/meri-document-public-fixtures";
import "../../../src/app/globals.css";
import "../font.css";

const mode = new URLSearchParams(location.search).get("mode");
syncMeriTabIdentity("synthetic-prepared-file-viewer");
const lifetime = new AbortController();
const requests: Array<{ path: string; body: unknown; credential: boolean }> =
  [];
let revoked = false;
Object.assign(window, {
  preparedFilesFixture: {
    requests,
    revoke: () => {
      revoked = true;
    },
  },
});
const base = {
  createdAt: "2026-10-26T00:00:00.000Z",
  operation: { id: "create_word", version: "0.2.0" },
} as const;
const items: IntentsItem[] = [
  {
    ...base,
    deliveryId: `sdk:${"a".repeat(64)}`,
    state: "prepared",
    kind: "schedule_proposal",
    proposalId: null,
  },
  {
    ...base,
    deliveryId: `sdk:${"b".repeat(64)}`,
    state: "prepared",
    kind: "draft",
    ...(mode === "withheld"
      ? { withheld: true as const }
      : { versionId: ids.version }),
  },
];
const receipt = accessInspection("docx");
const token = `${"c".repeat(40)}.${"m".repeat(43)}`;
const fetcher: typeof fetch = async (url, init) => {
  const path = String(url),
    raw = init?.body;
  const body = JSON.parse(
    typeof raw === "string" ? raw : new TextDecoder().decode(raw as Uint8Array),
  );
  requests.push({
    path,
    body,
    credential:
      new Headers(init?.headers).get("x-meri-action-session") ===
      session.credential,
  });
  if (path === intentsMetadata.routes.list.path) {
    if (mode === "unavailable") throw Error("Synthetic unavailable list");
    return Response.json({
      conversationId: ids.conversation,
      intents: revoked ? [] : items,
      next: null,
    });
  }
  if (path === "/api/documents/inspect") {
    if (revoked || mode === "denied")
      return Response.json(
        { error: { code: "ACCESS_DENIED", outcome: "READ_UNAVAILABLE" } },
        { status: 403 },
      );
    return Response.json(
      mode === "wrong-version"
        ? { ...receipt, version: { ...receipt.version, versionId: ids.other } }
        : receipt,
    );
  }
  if (path === "/api/documents/links/issue")
    return Response.json({
      versionId: ids.version,
      token,
      expiresAtMs: Date.now() + 60000,
    });
  if (path === "/api/documents/links/redeem")
    return new Response(documentBytes, {
      headers: {
        "content-type": receipt.version.mimeType,
        "content-disposition": `attachment; filename="${receipt.version.filename}"`,
        "content-length": String(documentBytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
    });
  throw Error("Unexpected synthetic request");
};
const port = {
  context: session.context,
  intents: createIntentsAccess(session.credential, lifetime.signal, fetcher),
  artifacts: createArtifactAccess(session.credential, lifetime.signal, fetcher),
} as MeriConversationPort;
const published: TurnView = {
  runId: ids.run,
  runState: "completed",
  prompt: null,
  omittedPrefix: false,
  reasonCode: null,
  messages: [],
  tools: [],
  sources: [],
  approvals: [],
  errors: [],
  checkpointIds: [],
  nativeSources: [],
  artifacts: [{ artifactId: ids.artifact, versionId: ids.version }],
};
createRoot(document.getElementById("root")!).render(
  <main style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px" }}>
    <h1>Synthetic prepared document</h1>
    <p>
      This harness verifies receipt and download plumbing. Its synthetic bytes
      do not qualify a DOCX reader.
    </p>
    <IntentApprovalsEnabled.Provider value={mode !== "disabled"}>
      <ConversationPanels
        port={port}
        turn={mode === "duplicate" || mode === "disabled" ? published : null}
        earlier={[]}
      />
    </IntentApprovalsEnabled.Provider>
  </main>,
);
