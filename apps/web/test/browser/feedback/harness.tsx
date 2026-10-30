import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  receiveConversationRequest,
  type ConversationFeedbackReceipt,
} from "@capiro/meri-contracts/conversation-application";
import { ConversationTurn } from "../../../src/features/meri/conversation/ConversationTurn";
import { FeedbackContext } from "../../../src/features/meri/conversation/feedback/FeedbackContext";
import type { TurnView } from "../../../src/features/meri/conversation/conversation-view";
import type { MeriConversationPort } from "../../../src/shared/meri-conversations/host-controller";
import { createFeedbackAccess } from "../../../src/shared/meri-feedback/access";
import { syncMeriTabIdentity } from "../../../src/shared/meri-conversations/tab-journal";
import {
  feedbackContext as context,
  feedbackReceipt,
  feedbackId,
} from "../../../tests/meri-feedback-fixtures";
import "../../../src/app/globals.css";
import "../font.css";

const params = new URLSearchParams(location.search),
  mode = params.get("mode");
syncMeriTabIdentity("synthetic-feedback-identity");
const serverKey = "synthetic-mo14-server-receipts",
  requestKey = "synthetic-mo14-server-requests";
const readReceipts = (): ConversationFeedbackReceipt[] =>
  JSON.parse(sessionStorage.getItem(serverKey) ?? "[]");
const response = (value: unknown, status = 200) =>
  Response.json(value, { status });
let release: (() => void) | undefined;
let current = true;
Object.assign(window, {
  feedbackFixture: {
    release: () => release?.(),
    receipts: readReceipts,
    requests: () => JSON.parse(sessionStorage.getItem(requestKey) ?? "[]"),
  },
});
const fetcher: typeof fetch = async (url, init) => {
  const bytes = init?.body as Uint8Array;
  if (String(url).endsWith("feedback-read")) {
    receiveConversationRequest("feedback-read", bytes);
    return response({ runId: context.runId, receipts: readReceipts() });
  }
  const input = receiveConversationRequest("feedback", bytes);
  const requests = JSON.parse(sessionStorage.getItem(requestKey) ?? "[]");
  requests.push(input);
  sessionStorage.setItem(requestKey, JSON.stringify(requests));
  if (mode === "stale")
    return response({ error: { code: "FEEDBACK_REVISION_CHANGED" } }, 409);
  if (mode === "expired" && requests.length === 1) {
    current = false;
    throw new Error("Synthetic lost acknowledgement followed by expiry");
  }
  if (mode === "slow")
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  if (mode === "lost-before" && requests.length === 1)
    throw new Error("Synthetic loss before durable write");
  const records = readReceipts(),
    existing = records.find((r) => r.requestId === input.requestId),
    receipt = existing ?? feedbackReceipt(input);
  if (!existing) {
    records.push(receipt);
    sessionStorage.setItem(serverKey, JSON.stringify(records));
  }
  if (mode === "lost-after" && requests.length === 1)
    throw new Error("Synthetic lost commit acknowledgement");
  if (mode === "forged")
    return response({
      receipt: { ...receipt, actorId: "foreign-actor" },
      replayed: false,
    });
  return response({ receipt, replayed: !!existing });
};
const lifetime = new AbortController();
const feedback = createFeedbackAccess({
  credential: `action_session_${"f".repeat(43)}`,
  context,
  lifetime: lifetime.signal,
  isCurrent: () => current && !lifetime.signal.aborted,
  onAccessLost: () => lifetime.abort(),
  fetcher,
});
const port = {
  context,
  feedback,
  getSnapshot: () => ({ status: "ready" }),
} as unknown as MeriConversationPort;
const turn: TurnView = {
  runId: context.runId,
  prompt: "Summarize the synthetic committee update.",
  runState: mode === "streaming" ? "running" : "completed",
  omittedPrefix: false,
  incompleteHistory: mode === "incomplete",
  browserReceipts: [],
  throughSequence: 7,
  messages: [
    {
      messageId: feedbackId(4),
      text: "The committee scheduled the next hearing for 25 October. The draft summary is ready for review.",
    },
  ],
  tools: [],
  sources: [],
  nativeSources: [],
  approvals: [],
  artifacts: [{ artifactId: feedbackId(6), versionId: feedbackId(7) }],
  errors: [],
  checkpointIds: [],
  reasonCode: null,
};
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ maxWidth: 880, padding: 24, margin: "0 auto" }}>
      <p>Synthetic native conversation feedback fixture</p>
      <FeedbackContext.Provider value={port}>
        <ConversationTurn turn={turn} label="Current turn" />
      </FeedbackContext.Provider>
    </main>
  </StrictMode>,
);
