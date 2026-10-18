import { expect, test, type Page, type Route } from "@playwright/test";
import {
  clientId,
  composer,
  context,
  reply,
  sendButton,
  setupConversation,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";

const prompt = "Original initial message";
const url = `/meri?clientId=${clientId}`;

/** A synthetic admission is accepted, but the browser's session expires before its ACK arrives. */
async function expireBeforeAcknowledgement(page: Page) {
  let sessions = 0;
  const fixture = await setupConversation(page, (receipt) => ({
    ...receipt,
    expiresAtMs: Date.now() + (++sessions === 1 ? 2500 : 60_000),
  }));
  const native = await installInitialInput(page);
  let held: Route | undefined;
  let accepted: object | undefined;
  await page.route("**/api/conversations/input/admit", (route) => {
    const receipt = native.admissionResponse(route);
    if (native.calls.admit.length === 1) {
      held = route;
      accepted = receipt;
      return;
    }
    return reply(route, receipt);
  });
  await page.goto(url);
  await composer(page).fill(prompt);
  await sendButton(page).click();
  await expect.poll(() => native.calls.admit.length).toBe(1);
  await expect(
    page.getByRole("heading", {
      name: "Conversation session expired",
      exact: true,
    }),
  ).toBeVisible();
  await reply(held!, accepted!).catch(() => undefined);
  expect(native.calls.submit).toHaveLength(0);
  return { fixture, native };
}

async function reconnectAndRetry(page: Page) {
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
}

test("synthetic expiry and reconnect consume the acknowledged first draft without resending it", async ({
  page,
}) => {
  const { fixture, native } = await expireBeforeAcknowledgement(page);
  await expect(composer(page)).toHaveValue(prompt);
  await reconnectAndRetry(page);
  await expect(composer(page)).toHaveValue("");
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).press("Enter");
  expect(native.calls.allocate).toHaveLength(2);
  expect(native.calls.admit).toHaveLength(2);
  expect(native.calls.submit).toHaveLength(1);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  expect(fixture.hints.at(-1)).toEqual({
    clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
  expect(fixture.unexpected).toEqual([]);
});

for (const draft of ["New question while disconnected", prompt]) {
  test(`synthetic reconnect preserves the newer disconnected draft ${JSON.stringify(draft)}`, async ({
    page,
  }) => {
    const { fixture, native } = await expireBeforeAcknowledgement(page);
    // Editing away and back to the sent text still creates a new unsent draft.
    await composer(page).fill("Intermediate draft");
    await composer(page).fill(draft);
    await reconnectAndRetry(page);
    await expect(composer(page)).toHaveValue(draft);
    expect(native.calls.submit).toHaveLength(1);
    expect(
      new Set([
        ...native.calls.allocate,
        ...native.calls.admit,
        ...native.calls.submit,
      ]).size,
    ).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  });
}

test("synthetic refused renewal cannot release a late acknowledgement or dispatch the retained input", async ({
  page,
}) => {
  const { fixture, native } = await expireBeforeAcknowledgement(page);
  await composer(page).fill("Newer private draft");
  await page.route("**/api/action-followthrough/session", (route) =>
    reply(route, {
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      context: { ...context, actorId: "another-native-actor" },
    }),
  );
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Conversation connection unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Newer private draft");
  await expect(sendButton(page)).toBeDisabled();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toHaveCount(0);
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(0);
  expect(fixture.unexpected).toEqual([]);
});
