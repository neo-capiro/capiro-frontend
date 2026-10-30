import { createRoot } from "react-dom/client";
import { ConversationPanels } from "../../../src/features/meri/conversation/ConversationPanels";
import { IntentApprovalsEnabled } from "../../../src/features/meri/conversation/intents/approvals-enabled";
import { createIntentsAccess } from "../../../src/shared/meri-intents/access";
import { createArtifactAccess } from "../../../src/shared/meri-documents/artifact-access";
import { syncMeriTabIdentity } from "../../../src/shared/meri-conversations/tab-journal";
import {
  ConversationHostController,
  type MeriConversationPort,
} from "../../../src/shared/meri-conversations/host-controller";
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
const automatic = mode === "automatic-renewal";
const heldStage = new URLSearchParams(location.search).get("hold");
syncMeriTabIdentity("synthetic-prepared-file-viewer");
let lifetime = new AbortController();
let heldList: Promise<void> | null = null;
let releaseList = () => {};
let listDenied = false;
let credential = session.credential;
let sessionCount = 0;
let artifactHeld = false;
let artifactAborted = false;
let releaseArtifact = () => {};
const requests: Array<{ path: string; body: unknown; credential: boolean }> =
  [];
let revoked = false;
Object.assign(window, {
  preparedFilesFixture: {
    requests,
    revoke: () => {
      revoked = true;
    },
    artifactState: () => ({
      held: artifactHeld,
      aborted: artifactAborted,
      sessionCount,
    }),
    releaseArtifact: () => releaseArtifact(),
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
  if (path === "/api/action-followthrough/session") {
    sessionCount++;
    if (sessionCount > 1) holdList();
    credential =
      sessionCount === 1
        ? session.credential
        : `action_session_${"r".repeat(43)}`;
    return Response.json({
      ...session,
      credential,
      expiresAtMs: Date.now() + 120_000,
    });
  }
  if (path === intentsMetadata.routes.list.path) {
    if (heldList) await heldList;
    if (listDenied)
      return Response.json(
        { error: { code: "ACCESS_DENIED", outcome: "RESULT_NOT_RELEASED" } },
        { status: 403 },
      );
    if (mode === "unavailable") throw Error("Synthetic unavailable list");
    return Response.json({
      conversationId: ids.conversation,
      intents: revoked ? [] : items,
      next: null,
    });
  }
  if (path === "/api/documents/inspect") {
    if (automatic && heldStage === "inspect" && !artifactHeld) {
      artifactHeld = true;
      await new Promise<void>((resolve, reject) => {
        releaseArtifact = resolve;
        init?.signal?.addEventListener(
          "abort",
          () => {
            artifactAborted = true;
            reject(init.signal?.reason);
          },
          { once: true },
        );
      });
    }
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
  if (path === "/api/documents/links/redeem") {
    const bytes =
      automatic && heldStage === "bytes" && !artifactHeld
        ? new ReadableStream<Uint8Array>({
            start(controller) {
              artifactHeld = true;
              releaseArtifact = () => {
                controller.enqueue(documentBytes);
                controller.close();
              };
            },
            cancel() {
              artifactAborted = true;
            },
          })
        : documentBytes;
    return new Response(bytes, {
      headers: {
        "content-type": receipt.version.mimeType,
        "content-disposition": `attachment; filename="${receipt.version.filename}"`,
        "content-length": String(documentBytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
    });
  }
  throw Error("Unexpected synthetic request");
};
const makePort = () =>
  ({
    context: session.context,
    intents: createIntentsAccess(credential, lifetime.signal, fetcher),
    artifacts: createArtifactAccess(credential, lifetime.signal, fetcher),
  }) as MeriConversationPort;
const published: TurnView = {
  runId: ids.run,
  runState: "completed",
  prompt: null,
  omittedPrefix: false,
  browserReceipts: [],
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
const root = createRoot(document.getElementById("root")!);
const render = (port = makePort()) =>
  root.render(
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

function holdList() {
  heldList = new Promise<void>((resolve) => {
    releaseList = resolve;
  });
}
if (automatic) {
  const host = new ConversationHostController({
    hints: {
      clientId: ids.client,
      conversationId: ids.conversation,
      runId: ids.run,
    },
    account: session.context,
    fetcher,
  });
  const detach = host.attach();
  const unsubscribe = host.subscribe(() => {
    const state = host.getSnapshot();
    if (state.status === "ready") render(state.port);
    else if (
      state.status === "expired" &&
      host.getExpirationReason() === "renewal"
    )
      void host.connect();
  });
  window.addEventListener(
    "pagehide",
    () => {
      unsubscribe();
      detach();
    },
    { once: true },
  );
  void host.connect();
} else render();
Object.assign(
  (window as unknown as { preparedFilesFixture: object }).preparedFilesFixture,
  {
    renew: () => {
      holdList();
      lifetime.abort();
      lifetime = new AbortController();
      credential = `action_session_${"r".repeat(43)}`;
      render();
    },
    settleRenewal: (denied = false) => {
      listDenied = denied;
      releaseList();
      heldList = null;
    },
  },
);
