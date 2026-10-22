import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import {
  clientId,
  composer,
  reply,
  sendButton,
  setupConversation,
  stopButton,
} from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";

const url = `/meri?clientId=${clientId}`;

test("synthetic desktop accepted first prompt clears the composer and Enter cannot resend it", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page);
  await page.goto(url);
  await composer(page).fill("Original initial message");
  await composer(page).press("Enter");
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You: Original initial message", { exact: true }),
  ).toHaveCount(1);
  await expect(composer(page)).toHaveValue("");
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).press("Enter");
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop held admission rejects repeated keyboard dispatch while preserving editable draft and linked help", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page);
  let held: Route | undefined, receipt: object | undefined;
  await page.route("**/api/conversations/input/admit", (route) => {
    held = route;
    receipt = native.admissionResponse(route);
  });
  await page.goto(url);
  await composer(page).fill("Original initial message");
  await expect(sendButton(page)).toBeEnabled();
  await composer(page).press("Enter");
  await expect.poll(() => native.calls.admit.length).toBe(1);
  await expect(
    page
      .getByRole("article", { name: "Current turn", exact: true })
      .getByText("You: Original initial message", { exact: true }),
  ).toBeVisible();
  await expect(sendButton(page)).toBeDisabled();
  await composer(page).fill("Edited draft while pending");
  await composer(page).press("Enter");
  await composer(page).press("Enter");
  await expect(composer(page)).toHaveValue("Edited draft while pending");
  await expect(composer(page)).toHaveAccessibleDescription(
    /still handling your last command/,
  );
  const description = await composer(page).getAttribute("aria-describedby");
  expect(description).toBeTruthy();
  await expect(sendButton(page)).toHaveAttribute(
    "aria-describedby",
    description!,
  );
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toEqual([]);
  await reply(held!, receipt!);
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  await expect(composer(page)).toHaveValue("Edited draft while pending");
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop lost allocation ACK retries exact retained identity through created-false recovery", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page);
  let lost = true;
  await page.route("**/api/conversations/input/allocate", (route) => {
    const receipt = native.allocationResponse(route);
    if (lost) {
      lost = false;
      return route.abort("failed");
    }
    expect(receipt.created).toBe(false);
    return reply(route, receipt);
  });
  await page.goto(url);
  await composer(page).fill("Retained allocation input");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .waitFor();
  expect(native.calls.admit).toEqual([]);
  expect(native.calls.submit).toEqual([]);
  await expect(composer(page)).toHaveValue("Retained allocation input");
  await composer(page).fill("A different draft");
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  expect(native.calls.allocate).toHaveLength(2);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  expect(JSON.parse(native.calls.submit[0]!).prompt).toBe(
    "Retained allocation input",
  );
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop interrupted initial submit survives ordinary navigation and reissues only the original target/input", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page);
  let lost = true;
  await page.route("**/api/conversations/submit", (route) => {
    const receipt = native.submitResponse(route);
    if (lost) {
      lost = false;
      return route.abort("failed");
    }
    return reply(route, receipt);
  });
  await page.goto(url);
  await composer(page).fill("Original before navigation");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Portfolio", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Meri", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You: Original before navigation", { exact: true }),
  ).toHaveCount(1);
  await expect.poll(() => native.calls.allocate.length).toBe(2);
  await expect.poll(() => native.calls.submit.length).toBe(2);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  expect(
    new Set(
      f.hints
        .filter((hint) => "runId" in hint)
        .map((hint) => JSON.stringify(hint)),
    ).size,
  ).toBeLessThanOrEqual(1);
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop session expiry fences a held admission and publishes no late transcript or submit", async ({
  page,
}) => {
  const f = await setupConversation(page, undefined, undefined, 2500),
    native = await installInitialInput(page);
  let held: Route | undefined, receipt: object | undefined;
  await page.route("**/api/conversations/input/admit", (route) => {
    held = route;
    receipt = native.admissionResponse(route);
  });
  await page.goto(url);
  await composer(page).fill("Input before expiry");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect.poll(() => native.calls.admit.length).toBe(1);
  await expect(
    page.getByRole("heading", {
      name: "Conversation session expired",
      exact: true,
    }),
  ).toBeVisible();
  await reply(held!, receipt!).catch(() => undefined);
  expect(native.calls.submit).toEqual([]);
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toHaveCount(0);
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop Enter during an active run preserves draft and composition without a second command", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page, true);
  await page.goto(url);
  await composer(page).fill("Start synthetic run");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(stopButton(page)).toBeEnabled();
  await composer(page).fill("Draft kept during run");
  await composer(page).press("Enter");
  await expect(composer(page)).toHaveValue("Draft kept during run");
  const prevented = await composer(page).evaluate((element) => {
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await expect(stopButton(page)).toHaveAccessibleDescription(
    /A run is in progress/,
  );
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(1);
  expect(native.calls.cancel).toBe(0);
  expect(f.unexpected).toEqual([]);
});

test("synthetic desktop hard reload recovers positively stored initial input without minting another allocation identity", async ({
  page,
}) => {
  const f = await setupConversation(page),
    native = await installInitialInput(page);
  let lost = true;
  await page.route("**/api/conversations/input/admit", (route) => {
    const receipt = native.admissionResponse(route);
    if (lost) {
      lost = false;
      return route.abort("failed");
    }
    return reply(route, receipt);
  });
  await page.goto(url);
  await composer(page).fill("Canonical input after reload");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await page
    .getByRole("button", { name: "Retry same request", exact: true })
    .waitFor();
  await page.reload();
  const continueRequest = page.getByRole("button", {
    name: "Continue accepted request",
    exact: true,
  });
  await expect(continueRequest).toBeEnabled();
  // The reload only re-admits history. Continuing still needs the person's click.
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(1);
  expect(native.calls.submit).toHaveLength(0);
  await continueRequest.click();
  await expect(
    page.getByText("Initial synthetic answer", { exact: true }),
  ).toBeVisible();
  expect(native.calls.allocate).toHaveLength(1);
  expect(native.calls.admit).toHaveLength(2);
  expect(native.calls.submit).toHaveLength(1);
  expect(
    new Set([
      ...native.calls.allocate,
      ...native.calls.admit,
      ...native.calls.submit,
    ]).size,
  ).toBe(1);
  await expect(
    page.getByText("You: Canonical input after reload", { exact: true }),
  ).toHaveCount(1);
  expect(f.unexpected).toEqual([]);
});
