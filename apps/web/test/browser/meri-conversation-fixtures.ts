import type { Page, Route } from "@playwright/test";
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
export const binding = {
  tenantId: testIdentity.tenant.id,
  actorId: testIdentity.user.id,
  conversationId,
  runId,
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
export const context = {
  tenantId: binding.tenantId,
  actorId: binding.actorId,
  conversationId,
  runId,
  selectedClientId: clientId,
};
export const scopes = [
  {
    tenantId: binding.tenantId,
    kind: "client",
    resourceId: clientId,
    policyRevision: "policy1",
  },
];
export const run = {
  binding,
  state: "running",
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
};
export const event = (sequence: number, text: string) => ({
  contractVersion: "0.1.0",
  eventId: `70000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
  binding,
  sequence,
  createdAt: run.createdAt,
  scopes,
  type: "message.delta",
  data: { messageId: "80000000-0000-4000-8000-000000000008", text },
});
export const history = (
  events: ReturnType<typeof event>[] = [event(1, "Service-backed transcript")],
) => ({
  run,
  request: {
    requestId: "a0000000-0000-4000-8000-00000000000a",
    prompt: "Previously stored request",
    windowRequest: null,
    window: null,
    skill: null,
  },
  events,
  nextSequence: events.at(-1)?.sequence ?? 0,
  hasMore: false,
  lastSequence: events.at(-1)?.sequence ?? 0,
});
export function stream(events: ReturnType<typeof event>[]) {
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
export async function setupConversation(
  page: Page,
  mutate?: (receipt: object) => object,
) {
  await page.addInitScript(() =>
    sessionStorage.setItem("meri-conversation-enabled", "true"),
  );
  const unexpected = await installFixtures(page);
  page.on("pageerror", (error) => unexpected.push(error.message));
  await page.route("**/api/backend/core/me", (r) => json(r, testIdentity));
  await page.route(`**/api/backend/core/clients/${clientId}`, (r) =>
    json(r, { ...client, name: "Verified conversation client" }),
  );
  const hints: object[] = [];
  await page.route("**/api/action-followthrough/session", (r) => {
    hints.push(r.request().postDataJSON());
    const value = {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60000,
      context,
    };
    return json(r, mutate ? mutate(value) : value);
  });
  return { unexpected, hints };
}
export async function connect(page: Page) {
  await page.goto(`/meri?clientId=${clientId}`);
  await page
    .getByRole("button", { name: "Connect conversation service", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Current conversation", exact: true })
    .waitFor();
}
export const reply = (route: Route, payload: unknown, status = 200) =>
  json(route, payload, status);
