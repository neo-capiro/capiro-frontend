import { expect, test, type Page, type Route } from "@playwright/test";
import {
  binding,
  composer,
  context,
  contextFor,
  event,
  nextBinding,
  reply,
  runFor,
  sendButton,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";
import {
  acceptNext,
  installCurrentRun,
  installHistory,
  installReservation,
  nextRequestId,
  selectedUrl,
} from "./meri-history-fixtures";

const changedRequestId = "a0000000-0000-4000-8000-00000000000c";
const sentence =
  "Pick a client first: this skill works in a client conversation.";

/** A finished first turn; the next message is admitted by the scripted control fixture. */
async function installFlow(page: Page) {
  const fixture = await setupConversation(
    page,
    undefined,
    [context, contextFor(nextBinding)],
    300_000,
  );
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await installReservation(page, native);
  const admissions: { requestId: string; prompt: string }[] = [];
  const submits: { requestId: string; prompt: string }[] = [];
  let refusals = 0;
  await page.route("**/api/conversations/input/admit", (route: Route) => {
    const body = route.request().postDataJSON();
    if (refusals++ === 0)
      return reply(
        route,
        { error: { code: "SKILL_SCOPE_REFUSED", requiredScope: "client" } },
        400,
      );
    admissions.push(body);
    return route.fallback();
  });
  await page.route("**/api/conversations/submit", (route) => {
    const body = route.request().postDataJSON();
    submits.push(body);
    acceptNext(native, body.requestId, body.prompt);
    return reply(route, {
      run: runFor("completed", nextBinding),
      requestId: body.requestId,
      lastSequence: 2,
      replayed: false,
    });
  });
  await page.route("**/api/conversations/events", (route) =>
    sse(route, [
      event(1, "Second answer", nextBinding),
      status(2, "completed", nextBinding),
    ]),
  );
  return { fixture, admissions, submits, refusals: () => refusals };
}

const stubId = (page: Page, id: string) =>
  page.evaluate((value) => {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => value,
    });
  }, id);

test("a typed skill refusal reads as one plain sentence, gives the message back, and a changed message goes out as a new request", async ({
  page,
}) => {
  const flow = await installFlow(page);
  await page.goto(selectedUrl);
  await expect(
    page.getByRole("article", { name: "Current turn" }),
  ).toHaveAttribute("data-run-state", "completed");
  await stubId(page, nextRequestId);
  await composer(page).fill("Refused next question");
  await sendButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: sentence })).toHaveText(
    sentence,
  );
  await expect(page.locator("body")).not.toContainText("SKILL_SCOPE_REFUSED");
  await expect(page.locator("body")).not.toContainText(
    "Conversation operation unavailable",
  );
  await expect(page.locator("body")).not.toContainText("Delivery is uncertain");
  await expect(page.locator("body")).not.toContainText(
    "A turn may already be in flight",
  );
  await expect(page.locator("body")).not.toContainText(
    "Retry same request",
  );
  // The refused text is the person's again, and Send is open for a changed message.
  await expect(composer(page)).toHaveValue("Refused next question");
  await expect(composer(page)).toBeEnabled();
  expect(flow.refusals()).toBe(1);
  expect(flow.admissions).toEqual([]);
  expect(flow.submits).toEqual([]);

  await stubId(page, changedRequestId);
  await composer(page).fill("Changed next question");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(page.getByText("Second answer", { exact: true })).toBeVisible();
  expect(flow.admissions).toEqual([
    { requestId: changedRequestId, prompt: "Changed next question" },
  ]);
  expect(flow.submits).toEqual(flow.admissions);
  await expect(page.locator("body")).not.toContainText(sentence);
  expect(flow.fixture.hints.at(-1)).toEqual({
    clientId: context.selectedClientId,
    conversationId: binding.conversationId,
    runId: nextBinding.runId,
  });
  expect(flow.fixture.unexpected).toEqual([]);
});
