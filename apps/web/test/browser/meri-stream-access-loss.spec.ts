import { expect, test } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  contextFor,
  event,
  sendButton,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";

/**
 * A run is streaming when its events stream is refused (403: the stream's session receipt went
 * stale across a renewal). The page must not crash: access is rechecked, the renewal issues a
 * fresh receipt, the stream resumes, and the transcript that was on screen stays on screen.
 */
test("a 403 on the events stream mid-run recovers through the access recheck without crashing or losing the transcript", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [contextFor()]);
  const native = await installInitialInput(page, true);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // The first stream attempt delivers the running run; the next attempts are refused until the
  // session was renewed; after that the stream completes the run.
  let streams = 0;
  let refuse = true;
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => {
      streams += 1;
      if (streams === 1)
        return sse(route, [status(1, "queued"), status(2, "running")]);
      if (refuse)
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "FORBIDDEN" } }),
        });
      return sse(route, [
        event(3, "Answer after renewal"),
        status(4, "completed"),
      ]);
    },
  );
  await page.route("**/api/action-followthrough/session", (route) => {
    // Every issuance after the first is a renewal with a fresh receipt; the stream is accepted again.
    if (fixture.hints.length >= 1) refuse = false;
    return route.fallback();
  });

  await page.goto(`/meri?clientId=${clientId}`);
  await composer(page).fill("Streaming question");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(page.getByText(/Streaming question/)).toBeVisible();
  await expect.poll(() => streams, { timeout: 15_000 }).toBeGreaterThan(1);

  // The refused stream costs the session; the automatic access recheck issues a fresh one.
  await expect
    .poll(() => fixture.hints.length, { timeout: 20_000 })
    .toBeGreaterThan(1);
  await expect(
    page.getByText("Answer after renewal", { exact: true }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Streaming question/)).toBeVisible();
  expect(native.calls.submit).toHaveLength(1);
  expect(
    errors.filter((text) =>
      /Minified React error|Maximum update depth|Too many re-renders/.test(
        text,
      ),
    ),
  ).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test("session renewals during a long streaming run never crash the page", async ({
  page,
}) => {
  // A short synthetic cap: the session renews itself every ~6 s while the run keeps streaming.
  const fixture = await setupConversation(
    page,
    undefined,
    [contextFor()],
    12_000,
  );
  const native = await installInitialInput(page, true);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  let sessions = 0;
  await page.route("**/api/action-followthrough/session", (route) => {
    sessions += 1;
    return route.fallback();
  });

  await page.goto(`/meri?clientId=${clientId}`);
  await composer(page).fill("Long streaming question");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(page.getByText(/Long streaming question/)).toBeVisible();
  await expect.poll(() => sessions, { timeout: 30_000 }).toBeGreaterThan(2);
  await expect(page.getByText(/Long streaming question/)).toBeVisible();
  expect(native.calls.submit).toHaveLength(1);
  expect(
    errors.filter((text) =>
      /Minified React error|Maximum update depth|Too many re-renders/.test(
        text,
      ),
    ),
  ).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
