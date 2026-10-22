import { expect, test, type Route } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  sendButton,
  setupConversation,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";

test("synthetic desktop typing survives the native connection transition without dispatch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  const fixture = await setupConversation(page);
  const native = await installInitialInput(page);
  let held: Route | undefined;
  await page.route("**/api/action-followthrough/session", (route) => {
    if (held) return route.fallback();
    held = route;
  });
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await expect.poll(() => held !== undefined).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Connecting to Meri.", exact: true }),
  ).toBeVisible();
  await composer(page).fill("Original ");
  await expect(composer(page)).toHaveValue("Original ");
  await expect(composer(page)).toBeFocused();
  await expect(sendButton(page)).toBeDisabled();
  expect(native.calls).toEqual({
    allocate: [],
    admit: [],
    submit: [],
    cancel: 0,
  });

  // The existing fixture returns history/transcript 404 until explicit input.
  // Completing this read-only transition must not replace the focused editor.
  await held!.fallback();
  await expect(sendButton(page)).toBeEnabled();
  await expect(composer(page)).toBeFocused();
  await expect(composer(page)).toHaveValue("Original ");
  // Continue at the existing focus/caret; do not retarget or refocus a new node.
  await page.keyboard.type("initial message");
  await expect(composer(page)).toHaveValue("Original initial message");
  expect(fixture.hints).toEqual([
    { clientId, conversationId: binding.conversationId },
  ]);
  expect(native.calls).toEqual({
    allocate: [],
    admit: [],
    submit: [],
    cancel: 0,
  });

  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(1);
  expect(native.calls.cancel).toBe(0);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  expect(JSON.parse(native.calls.submit[0]!).prompt).toBe(
    "Original initial message",
  );
  await expect(composer(page)).toHaveValue("");
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).press("Enter");
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});
