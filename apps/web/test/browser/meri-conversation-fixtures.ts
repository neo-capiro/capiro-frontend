import type { Page, Route } from "@playwright/test";
import type { ConversationSubmittedResponse } from "@capiro/meri-contracts/conversation-application";
import {
  installFixtures,
  json,
  client,
  clientId,
} from "../../tests/browser/fixtures";
import { testIdentity } from "./fixtures";
export { clientId };
export const conversationId = "30000000-0000-4000-8000-000000000003";
export const runId = "40000000-0000-4000-8000-000000000004";
export const nextRunId = "40000000-0000-4000-8000-000000000044";
export const binding = {
  tenantId: testIdentity.tenant.id,
  actorId: testIdentity.user.id,
  conversationId,
  runId,
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
/** The conversation's successor run, bound by a fresh session after the first run finished. */
export const nextBinding = {
  ...binding,
  runId: nextRunId,
  attemptId: "50000000-0000-4000-8000-000000000055",
  workerId: "60000000-0000-4000-8000-000000000066",
  writerFence: 2,
};
type Binding = typeof binding;
export const contextFor = (value: Binding = binding) => ({
  tenantId: value.tenantId,
  actorId: value.actorId,
  conversationId: value.conversationId,
  runId: value.runId,
  selectedClientId: clientId,
});
export const context = contextFor();
export const scopes: ConversationSubmittedResponse["run"]["scopes"] = [
  {
    tenantId: binding.tenantId,
    kind: "client",
    resourceId: clientId,
    policyRevision: "policy1",
  },
];
type RunState = ConversationSubmittedResponse["run"]["state"];
export const runFor = (
  state: RunState = "running",
  value = binding,
): ConversationSubmittedResponse["run"] => ({
  binding: value,
  state,
  scopes,
  createdAt: "2026-10-13T00:00:00Z",
  policyRevision: "policy1",
  versions: {
    imageDigest: `sha256:${"a".repeat(64)}`,
    sdk: "0.3.295",
    cli: "2.1.295",
    contracts: "0.1.0",
    skillsDigest: "b".repeat(64),
    checkpointFormat: "0.1.0",
  },
});
export const run = runFor();
/** One synthetic governed event; per-run wire sequences restart at 1. */
export const eventOf = (
  sequence: number,
  type: string,
  data: object,
  value = binding,
) => ({
  contractVersion: "0.1.0",
  eventId: `70000000-0000-4000-${value === binding ? "8000" : "9000"}-${String(sequence).padStart(12, "0")}`,
  binding: value,
  sequence,
  createdAt: run.createdAt,
  scopes,
  type,
  data,
});
export const event = (sequence: number, text: string, value = binding) =>
  eventOf(
    sequence,
    "message.delta",
    { messageId: "80000000-0000-4000-8000-000000000008", text },
    value,
  );
export const status = (sequence: number, state: RunState, value = binding) =>
  eventOf(sequence, "run.status", { state, reasonCode: null }, value);
type Event = ReturnType<typeof eventOf>;
export const history = (
  events: Event[] = [event(1, "Service-backed transcript")],
  options: { state?: RunState; prompt?: string } = {},
) => ({
  run: runFor(options.state ?? "running"),
  request: {
    requestId: "a0000000-0000-4000-8000-00000000000a",
    prompt: options.prompt ?? "Previously stored request",
    windowRequest: null,
    window: null,
    skill: null,
  },
  events,
  nextSequence: events.at(-1)?.sequence ?? 0,
  hasMore: false,
  lastSequence: events.at(-1)?.sequence ?? 0,
});
export function stream(events: Event[]) {
  return (
    "data: " +
    JSON.stringify({
      type: "start",
      messageId: "90000000-0000-4000-8000-000000000009",
    }) +
    "\n\n" +
    events
      .map(
        (item) =>
          "data: " +
          JSON.stringify({
            type: "data-meri-event",
            transient: true,
            id: item.eventId,
            data: item,
          }) +
          "\n\n",
      )
      .join("") +
    "data: " +
    JSON.stringify({ type: "finish" }) +
    "\n\ndata: [DONE]\n\n"
  );
}
export const sse = (route: Route, events: Event[]) =>
  route.fulfill({
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
    },
    body: stream(events),
  });
/**
 * Synthetic session owner. `contexts` lists the server-selected context for each successive
 * bootstrap; the last entry repeats.
 */
export async function setupConversation(
  page: Page,
  mutate?: (receipt: object) => object,
  contexts: object[] = [context],
  lifetimeMs = 60_000,
) {
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-conversation-enabled", "true"),
  );
  const unexpected = await installFixtures(page);
  page.on("pageerror", (error) => unexpected.push(error.message));
  await page.route("**/api/backend/core/me", (r) => json(r, testIdentity));
  // The Capiro operation gateway reads identity through this boundary too; without an answer it
  // falls back to the Vite SPA shell, which the client correctly rejects as an unexpected response.
  await page.route("**/api/capiro/me.read*", (r) => json(r, testIdentity));
  await page.route(`**/api/backend/core/clients/${clientId}`, (r) =>
    json(r, { ...client, name: "Verified conversation client" }),
  );
  const hints: object[] = [];
  // New native history routes remain explicitly unavailable unless a focused test supplies them.
  // These synthetic failures do not stand in for a production owner or real history acceptance.
  for (const path of ["list", "transcript", "next-turn", "input/admit"])
    await page.route(`**/api/conversations/${path}`, (r) =>
      json(r, { error: { code: "CONVERSATION_UNAVAILABLE" } }, 503),
    );
  await page.route("**/api/conversations/input/allocate", (r) =>
    json(
      r,
      { error: { code: "INITIAL_INPUT_UNAVAILABLE", outcome: "UNKNOWN" } },
      503,
    ),
  );
  await page.route("**/api/action-followthrough/session", (r) => {
    hints.push(r.request().postDataJSON());
    const value = {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + lifetimeMs,
      context: contexts[Math.min(hints.length, contexts.length) - 1],
    };
    return json(r, mutate ? mutate(value) : value);
  });
  return { unexpected, hints };
}
/** Opens Meri; the conversation connects and loads its transcript on its own. */
export async function connect(page: Page) {
  await page.goto(`/meri?clientId=${clientId}`);
  await page
    .getByRole("heading", { name: "Conversation", exact: true })
    .waitFor();
}
export const reply = (route: Route, payload: unknown, status = 200) =>
  json(route, payload, status);
export const composer = (page: Page) =>
  page.getByLabel("Meri message", { exact: true });
export const sendButton = (page: Page) =>
  page.getByRole("button", { name: "Send message", exact: true });
export const stopButton = (page: Page) =>
  page.getByRole("button", { name: "Stop run", exact: true });
