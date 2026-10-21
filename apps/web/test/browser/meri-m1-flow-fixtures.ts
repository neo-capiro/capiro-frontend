import type { Page } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import { client } from "../../tests/browser/fixtures";
import {
  binding,
  contextFor,
  event,
  nextBinding,
  reply,
  runFor,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";
import {
  installCurrentRun,
  installHistory,
  reserved,
  turn,
} from "./meri-history-fixtures";

export const otherClientId = "10000000-0000-4000-8000-000000000002";
export const firstAnswer = "M1 first streamed answer";
export const secondAnswer = "M1 second accepted answer";
type SavedOwner = Awaited<ReturnType<typeof installHistory>>["native"];

/** Explicit synthetic HTTP owner; browser code and public receivers remain real. */
export async function installM1Flow(page: Page) {
  const fixture = await setupConversation(page);
  const initial = await installInitialInput(page, true);
  let saved: SavedOwner | undefined;
  const calls = {
    reservations: [] as unknown[],
    successors: [] as { requestId: string; prompt: string }[],
    cursors: [] as string[],
    cancel: 0,
    lifecycle: [] as string[],
  };
  const currentEvents = () => {
    const latest = saved?.turns.at(-1);
    return (
      saved?.events
        .filter(
          ({ event }) => event.binding.runId === latest?.run.binding.runId,
        )
        .map(({ event }) => event) ?? []
    );
  };
  const owner = () => {
    if (!saved) throw new Error("Synthetic input has not been accepted");
    return saved;
  };
  await page.route("**/api/action-followthrough/session", (route) => {
    const hints = route.request().postDataJSON();
    fixture.hints.push(hints);
    return reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      context: contextFor(
        hints.runId === nextBinding.runId ? nextBinding : binding,
      ),
    });
  });
  await page.route("**/api/backend/core/clients", (route) =>
    reply(route, [
      { ...client, name: "Verified conversation client" },
      { ...client, id: otherClientId, name: "Other permitted client" },
    ]),
  );
  await page.route(`**/api/backend/core/clients/${otherClientId}`, (route) =>
    reply(route, {
      ...client,
      id: otherClientId,
      name: "Other permitted client",
    }),
  );
  await page.route("**/api/conversations/submit", async (route) => {
    const input = route.request().postDataJSON();
    if (!saved) {
      const receipt = initial.submitResponse(route);
      const events = [
        status(1, "queued"),
        status(2, "running"),
        event(3, firstAnswer),
      ];
      const current = {
        ...turn(binding, input.requestId, input.prompt, 0, events.length),
        run: runFor("running"),
      };
      saved = (
        await installHistory(page, {
          turns: [current],
          events: events.map((item) => ({
            sequence: item.sequence,
            event: item as UIEvent,
          })),
        })
      ).native;
      await installCurrentRun(page, saved);
      return reply(route, { ...receipt, lastSequence: events.length });
    }
    calls.successors.push(input);
    const source = saved.turns[0]!;
    source.sequenceEnd = source.lastSequence;
    const events = [
      event(1, secondAnswer, nextBinding),
      status(2, "completed", nextBinding),
    ];
    saved.turns.push(
      turn(nextBinding, input.requestId, input.prompt, source.lastSequence, 2),
    );
    saved.events.push(
      ...events.map((item, index) => ({
        sequence: source.lastSequence + index + 1,
        event: item as UIEvent,
      })),
    );
    saved.pendingTurn = null;
    return reply(route, {
      run: runFor("running", nextBinding),
      requestId: input.requestId,
      lastSequence: 2,
      replayed: false,
    });
  });
  await page.route("**/api/conversations/next-turn", (route) => {
    calls.reservations.push(route.request().postDataJSON());
    if (owner().turns[0]!.run.state !== "cancelled")
      return reply(
        route,
        {
          error: {
            code: "CONVERSATION_TURN_CONFLICT",
            outcome: "NOT_DISPATCHED",
          },
        },
        409,
      );
    owner().pendingTurn = { ...reserved };
    return reply(route, { ...reserved, replayed: false });
  });
  await page.route("**/api/conversations/events", (route) =>
    sse(route, currentEvents()),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => {
      const cursor = route.request().headers()["x-meri-resume-sequence"] ?? "";
      calls.cursors.push(cursor);
      return sse(
        route,
        currentEvents().filter((item) => item.sequence > Number(cursor)),
      );
    },
  );
  await page.route("**/api/conversations/cancel", (route) => {
    calls.cancel++;
    // A fence receipt is deliberately available before the terminal event.
    return reply(route, { state: "cancelled" });
  });
  for (const path of ["control", "checkpoints/inspect"])
    await page.route(`**/api/conversations/${path}`, (route) => {
      calls.lifecycle.push(path);
      return reply(
        route,
        {
          error: { code: "LIFECYCLE_STATE_REFUSED", outcome: "NOT_DISPATCHED" },
        },
        409,
      );
    });
  return {
    fixture,
    initial,
    calls,
    retire() {
      const native = owner();
      native.turns[0] = {
        ...native.turns[0]!,
        run: runFor("cancelled"),
        lastSequence: 4,
      };
      native.events.push({
        sequence: 4,
        event: status(4, "cancelled") as UIEvent,
      });
    },
  };
}
