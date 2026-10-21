import { expect, test, type Route } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  context,
  event,
  history,
  reply,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";

const exact = {
  clientId,
  conversationId: binding.conversationId,
  runId: binding.runId,
};

test("M1 fixture: two automatic renewals retain exact run, accepted cursor and zero mutation calls", async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await setupConversation(page);
  const mutations: string[] = [];
  const cursors: string[] = [];
  await page.route("**/api/action-followthrough/session", async (route) => {
    fixture.hints.push(route.request().postDataJSON());
    const now = await page.evaluate(() => Date.now());
    return reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: now + 60_000,
      context,
    });
  });
  for (const path of ["submit", "next-turn", "cancel", "input/admit"])
    await page.route(`**/api/conversations/${path}`, (route) => {
      mutations.push(path);
      return reply(route, { error: { code: "NOT_FOUND" } }, 404);
    });
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history(
        fixture.hints.length === 1
          ? [event(1, "Verified prefix")]
          : [event(1, "Verified prefix"), event(2, " and accepted suffix")],
      ),
    ),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => {
      const cursor = route.request().headers()["x-meri-resume-sequence"]!;
      cursors.push(cursor);
      return sse(
        route,
        fixture.hints.length >= 3
          ? [status(3, "completed")]
          : cursor === "1"
            ? [event(2, " and accepted suffix")]
            : [],
      );
    },
  );
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(
    page.getByText("Verified prefix and accepted suffix", { exact: true }),
  ).toBeVisible();
  for (const count of [2, 3]) {
    await page.clock.runFor(15_100);
    await expect.poll(() => fixture.hints.length).toBe(count);
    await expect(
      page.getByText("Verified prefix and accepted suffix", { exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect(fixture.hints).toEqual([{ clientId }, exact, exact]);
  expect(cursors[0]).toBe("1");
  expect(cursors.slice(1)).not.toHaveLength(0);
  expect(cursors.slice(1).every((cursor) => cursor === "2")).toBe(true);
  expect(mutations).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("M1 fixture: definitive access loss hides private content and never renews without explicit exact-run retry", async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await setupConversation(page, undefined, [context], 300_000);
  let denied = false;
  await page.route("**/api/conversations/history", (route) =>
    denied
      ? reply(route, { error: { code: "SESSION_REFUSED" } }, 403)
      : reply(route, history([event(1, "Private accepted answer")])),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) =>
      denied
        ? reply(route, { error: { code: "SESSION_REFUSED" } }, 403)
        : sse(route, []),
  );
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(
    page.getByText("Private accepted answer", { exact: true }),
  ).toBeVisible();
  await composer(page).fill("Private unsent draft");
  await page.clock.runFor(70_000);
  denied = true;
  await page.clock.runFor(2_000);
  await expect(
    page.getByRole("heading", {
      name: "Conversation access unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Private accepted answer", { exact: true }),
  ).toHaveCount(0);
  await expect(composer(page)).toHaveValue("");
  await page.clock.runFor(5_000);
  expect(fixture.hints).toEqual([{ clientId }]);
  let checking: Route | undefined;
  await page.route("**/api/action-followthrough/session", (route) => {
    fixture.hints.push(route.request().postDataJSON());
    checking = route;
  });
  await page
    .getByRole("button", { name: "Check access again", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Checking conversation access…",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Check access again|Reconnect)$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Private accepted answer", { exact: true }),
  ).toHaveCount(0);
  await expect(composer(page)).toHaveValue("");
  await expect.poll(() => checking !== undefined).toBe(true);
  await reply(checking!, {
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: (await page.evaluate(() => Date.now())) + 60_000,
    context: { ...context, actorId: "foreign-native-actor" },
  });
  await expect(
    page.getByRole("button", { name: "Check access again", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Conversation access unavailable",
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.hints).toEqual([{ clientId }, exact]);
  await expect(
    page.getByText("Private accepted answer", { exact: true }),
  ).toHaveCount(0);
  await expect(composer(page)).toHaveValue("");
  expect(fixture.unexpected).toEqual([]);
});
