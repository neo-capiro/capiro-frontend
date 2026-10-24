import { expect, test, type Page, type Route } from "@playwright/test";
import {
  binding,
  clientId,
  connect,
  event,
  history,
  reply,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";

const delayed =
  "Updates are delayed. Reconnecting from the last received update…";
const waiting = "Waiting for Meri updates.";

/** Real React reconciliation and timers; only the service responses are synthetic. */
async function recovering(page: Page) {
  await page.clock.install();
  const fixture = await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(route, history([status(1, "running")])),
  );
  const attempts: Route[] = [];
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => {
      attempts.push(route);
    },
  );
  await connect(page);
  await expect.poll(() => attempts.length).toBe(1);
  // Let the existing client/query setup settle before freezing browser timers.
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 1_000),
  );
  await reply(
    attempts[0]!,
    { error: { code: "CONVERSATION_UNAVAILABLE" } },
    502,
  );
  await expect(page.getByText(waiting, { exact: true })).toBeVisible();
  await page.clock.runFor(1_000);
  await expect.poll(() => attempts.length).toBe(2);
  return { ...fixture, attempts };
}

test("real React gives each recovery a fresh grace period and removes feedback at terminal completion", async ({
  page,
}) => {
  const fixture = await recovering(page);
  await page.clock.runFor(2_000);
  await expect(page.getByText(delayed, { exact: true })).toBeVisible();
  await sse(fixture.attempts[1]!, [event(2, "Preserved answer")]);
  await expect.poll(() => fixture.attempts.length).toBe(3);
  await expect(page.getByText(waiting, { exact: true })).toBeVisible();
  await expect(page.getByText(delayed, { exact: true })).toHaveCount(0);

  await reply(
    fixture.attempts[2]!,
    { error: { code: "CONVERSATION_UNAVAILABLE" } },
    502,
  );
  await page.clock.runFor(1_000);
  await expect.poll(() => fixture.attempts.length).toBe(4);
  await page.clock.runFor(1_999);
  await expect(page.getByText(delayed, { exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByText(delayed, { exact: true })).toBeVisible();

  await sse(fixture.attempts[3]!, [status(3, "completed")]);
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.clock.runFor(5_000);
  await expect(page.getByText(delayed, { exact: true })).toHaveCount(0);
  await expect(page.getByText(waiting, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Preserved answer", { exact: true })).toHaveCount(
    1,
  );
  expect(
    fixture.attempts.map(
      (route) => route.request().headers()["x-meri-resume-sequence"],
    ),
  ).toEqual(["1", "1", "2", "2"]);
  expect(fixture.unexpected).toEqual([]);
});

test("real React retires pending recovery feedback when the conversation unmounts", async ({
  page,
}) => {
  const fixture = await recovering(page);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/modules");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByText(waiting, { exact: true })).toHaveCount(0);
  await page.clock.runFor(5_000);
  await expect(page.getByText(delayed, { exact: true })).toHaveCount(0);
  await sse(fixture.attempts[1]!, [event(2, "Retired response")]).catch(
    () => undefined,
  );
  await page.clock.resume();
  await page.evaluate((id) => {
    window.history.pushState({}, "", `/meri?clientId=${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, clientId);
  await expect.poll(() => fixture.attempts.length).toBe(3);
  await expect(page.getByText(waiting, { exact: true })).toBeVisible();
  await expect(page.getByText(delayed, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Retired response", { exact: true })).toHaveCount(
    0,
  );
  expect(fixture.unexpected).toEqual([]);
});
