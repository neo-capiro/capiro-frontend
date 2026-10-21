import type { Page } from "@playwright/test";
import {
  binding,
  contextFor,
  event,
  history,
  reply,
  runFor,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";
import { conversation, turn } from "./meri-history-fixtures";
import { testIdentity } from "./fixtures";

export const neighbour = {
  ...binding,
  conversationId: "30000000-0000-4000-8000-000000000033",
  runId: "40000000-0000-4000-8000-000000000033",
};
export const nextActor = {
  ...binding,
  actorId: "10000000-0000-4000-8000-000000000099",
  conversationId: "30000000-0000-4000-8000-000000000099",
  runId: "40000000-0000-4000-8000-000000000099",
};
export const answerFor = (value: typeof binding) =>
  `Synthetic accepted answer ${value.conversationId}`;

/** Two current conversations and one different actor; only public read receivers are mocked. */
export async function installRetentionConversations(page: Page) {
  const fixture = await setupConversation(page);
  const denied = new Set<string>();
  const mutations: string[] = [];
  let actor = binding.actorId;
  let selected = binding;
  const bindings = [binding, neighbour, nextActor];
  const events = (value: typeof binding) => [
    status(1, "running", value),
    event(2, answerFor(value), value),
  ];
  const permitted = (value: typeof binding) =>
    value.actorId === actor && !denied.has(value.conversationId);
  await page.route("**/api/backend/core/me", (route) =>
    reply(route, {
      ...testIdentity,
      user: {
        ...testIdentity.user,
        id: actor,
        clerkUserId:
          actor === binding.actorId ? "test-user" : "other-test-user",
      },
    }),
  );
  await page.route("**/api/action-followthrough/session", (route) => {
    const hints = route.request().postDataJSON();
    fixture.hints.push(hints);
    const target =
      bindings.find((value) => value.conversationId === hints.conversationId) ??
      binding;
    if (!permitted(target))
      return reply(route, { error: { code: "SESSION_REFUSED" } }, 403);
    selected = target;
    return reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 300_000,
      context: contextFor(target),
    });
  });
  await page.route("**/api/conversations/history", (route) =>
    permitted(selected)
      ? reply(route, {
          ...history(events(selected), {
            prompt: `Accepted input ${selected.conversationId}`,
          }),
          run: runFor("running", selected),
        })
      : reply(route, { error: { code: "SESSION_REFUSED" } }, 403),
  );
  await page.route("**/api/conversations/list", (route) =>
    reply(route, {
      schema: "meri.conversation-list/1",
      conversations: bindings.filter(permitted).map((value) => ({
        ...conversation,
        conversationId: value.conversationId,
        owner: { tenantId: value.tenantId, actorId: value.actorId },
      })),
      nextBefore: null,
    }),
  );
  await page.route("**/api/conversations/transcript", (route) => {
    const input = route.request().postDataJSON();
    const target = bindings.find(
      (value) => value.conversationId === input.conversationId,
    );
    if (!target || !permitted(target))
      return reply(route, { error: { code: "MEMBERSHIP_REVOKED" } }, 403);
    const pageEvents = events(target).filter(
      (item) => item.sequence > input.after,
    );
    const run = runFor("running", target);
    return reply(route, {
      schema: "meri.conversation-transcript/1",
      conversation: {
        ...conversation,
        conversationId: target.conversationId,
        owner: { tenantId: target.tenantId, actorId: target.actorId },
      },
      latestRun: run,
      latestSequenceBase: 0,
      turns: pageEvents.length
        ? [
            {
              ...turn(
                target,
                undefined,
                `Accepted input ${target.conversationId}`,
              ),
              run,
            },
          ]
        : [],
      events: pageEvents.map((item) => ({
        sequence: item.sequence,
        event: item,
      })),
      nextSequence: pageEvents.at(-1)?.sequence ?? input.after,
      lastSequence: 2,
      hasMore: false,
      pendingTurn: null,
    });
  });
  await page.route("**/api/conversations/events/*/stream", (route) =>
    permitted(selected)
      ? sse(route, [])
      : reply(route, { error: { code: "SESSION_REFUSED" } }, 403),
  );
  for (const path of [
    "submit",
    "next-turn",
    "cancel",
    "input/admit",
    "input/allocate",
  ])
    await page.route(`**/api/conversations/${path}`, (route) => {
      mutations.push(path);
      return reply(route, { error: { code: "NOT_DISPATCHED" } }, 409);
    });
  return {
    fixture,
    mutations,
    deny: (id: string) => denied.add(id),
    changeActor: () => {
      actor = nextActor.actorId;
    },
  };
}

export const recoveryEntries = (page: Page) =>
  page.evaluate(() =>
    Object.entries(sessionStorage)
      .filter(([key]) =>
        [
          "capiro-meri-chat-v1:",
          "capiro-meri-lifecycle-v1:",
          "capiro-meri-first-chat-intent-v1:",
        ].some((prefix) => key.startsWith(prefix)),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );

export const setTestSession = (
  page: Page,
  detail: {
    userId: string | null;
    sessionId: string | null;
    orgId: string | null;
  },
) =>
  page.evaluate(
    (value) =>
      window.dispatchEvent(new CustomEvent("test:session", { detail: value })),
    detail,
  );

/** The public form has no product nav; use the same popstate route transition as the harness. */
export const navigateInDocument = (page: Page, href: string) =>
  page.evaluate((url) => {
    window.history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, href);
