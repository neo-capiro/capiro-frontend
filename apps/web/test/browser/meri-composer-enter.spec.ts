import { expect, test } from "@playwright/test";
import { installHistory, installReservation } from "./meri-history-fixtures";
import {
  clientId,
  composer,
  context,
  contextFor,
  event,
  history,
  nextBinding,
  reply,
  sendButton,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";

/**
 * Enter pressed while Meri was still loading the transcript used to be swallowed: the draft
 * stayed, nothing said why. The draft still stays, and the composer now names the block until
 * it no longer applies.
 */
test("Enter while Meri is still loading keeps the draft and says why", async ({
  page,
}) => {
  const fixture = await setupConversation(page, undefined, [
    context,
    contextFor(nextBinding),
  ]);
  const { native } = await installHistory(page);
  await installReservation(page, native);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/conversations/history", async (r) => {
    await held;
    return reply(
      r,
      history([event(1, "First answer"), status(2, "completed")], {
        state: "completed",
        prompt: "First question",
      }),
    );
  });
  await page.goto(`/meri?clientId=${clientId}`);
  await composer(page).fill("Typed while the transcript loaded");
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).press("Enter");
  await expect(composer(page)).toHaveValue("Typed while the transcript loaded");
  const refusal = page.locator('[role="status"]', {
    hasText: "Meri is still handling your last command.",
  });
  await expect(refusal).toBeVisible();
  release();
  await expect(sendButton(page)).toBeEnabled();
  await expect(refusal).toHaveCount(0);
  await expect(composer(page)).toHaveValue("Typed while the transcript loaded");
  expect(fixture.unexpected).toEqual([]);
});
