import { test, expect } from "@playwright/test";
import { draftId, fixture, invitationId, openPeople } from "./fixtures";
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("explicit email displays provider acceptance and refresh never sends again", async ({
  page,
}) => {
  const state = await fixture(page);
  await openPeople(page);
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send email notification", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Accepted by email provider" }),
  ).toBeVisible();
  await expect(
    page.getByText("Delivery has not been confirmed.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send email notification", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check status", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Accepted by email provider" }),
  ).toBeVisible();
  expect(
    state.requests.filter(
      (request) => request.key === "workspace.collaborator.email.request",
    ),
  ).toEqual([
    {
      key: "workspace.collaborator.email.request",
      input: { body: { draftId, invitationId } },
    },
  ]);
  await page.getByRole("dialog").screenshot({ path: "work/ws08/accepted.png" });
});

test("lost email acknowledgement reads the same unknown fence across reopen and never retries", async ({
  page,
}) => {
  const state = await fixture(page);
  let sends = 0;
  await page.route(
    "**/api/capiro/workspace.collaborator.email.request",
    async (route) => {
      sends++;
      state.status = "outcome_unknown";
      state.errorCode = "ProviderOutcomeUnknown";
      await route.abort("failed");
    },
  );
  await openPeople(page);
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send email notification", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email outcome unknown" }),
  ).toBeVisible();
  await expect(
    page.getByText("An email may have been sent.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check status", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Email outcome unknown" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "People with access", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email outcome unknown" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send email notification", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancel email request", exact: true }),
  ).toHaveCount(0);
  expect(sends).toBe(1);
});

test("cancellation leaves the invitation; a concurrent submission is never labelled cancelled", async ({
  page,
}) => {
  const state = await fixture(page);
  await openPeople(page);
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel email request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email request cancelled" }),
  ).toBeVisible();
  expect(state.people).toHaveLength(2);
  expect(
    state.requests.some(
      (request) => request.key === "workspace.collaborator.email.request",
    ),
  ).toBe(false);
  state.status = "claimed";
  await page.getByRole("button", { name: "Check status", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Email request recorded" }),
  ).toBeVisible();
  await page.route(
    "**/api/capiro/workspace.collaborator.email.cancel",
    async (route) => {
      state.status = "sending";
      await route.fulfill({
        json: {
          draftId,
          invitationId,
          status: "sending",
          providerMessageId: null,
          errorCode: null,
          updatedAt: "2026-10-26T00:00:00Z",
        },
      });
    },
  );
  await page
    .getByRole("button", { name: "Cancel email request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email is being submitted" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel email request", exact: true }),
  ).toHaveCount(0);
});

test("narrow keyboard flow keeps invitation and unknown status controls reachable", async ({
  page,
}) => {
  const state = await fixture(page);
  state.status = "outcome_unknown";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/harness.html");
  await page
    .getByRole("button", { name: "People with access", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Email outcome unknown" }),
  ).toBeVisible();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Check status", exact: true }).focus();
  await expect(
    page.getByRole("button", { name: "Check status", exact: true }),
  ).toBeFocused();
  await dialog.screenshot({ path: "work/ws08/narrow-unknown.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "People with access", exact: true }),
  ).toBeFocused();
});
