import { test, expect } from "@playwright/test";
import { draftId, fixture, invitationId, notice } from "./fixtures";
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("Workspace entry admits a pending invitee without draft reads; read state is separate from acceptance", async ({
  page,
}) => {
  const state = await fixture(page);
  state.notices.push({
    ...notice(),
    id: "d3000000-0000-4000-8000-000000000004",
    kind: "newsletter_review",
    message: "Existing newsletter notification",
    actionable: false,
  });
  await page.goto("/harness.html?screen=1");
  await page.getByRole("button", { name: "Invitations", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Accept invitation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: "work/ws08/inbox-pending.png" });
  await expect(
    page.getByText("Existing newsletter notification", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark all read", exact: true })
    .click();
  await expect(page.getByText("0 unread.", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept invitation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(
    page.getByText("No actionable invitations returned."),
  ).toBeVisible();
  expect(
    state.requests.some((request) => request.key === "workspace.draft"),
  ).toBe(false);
  expect(
    state.requests.some((request) =>
      request.key.startsWith("workspace.collaborator.email"),
    ),
  ).toBe(false);
});

test("decline uses the actual recipient invitation and denied/foreign data clears actions", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/harness.html?screen=1");
  await page.getByRole("button", { name: "Invitations", exact: true }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(
    page.getByText("No actionable invitations returned."),
  ).toBeVisible();
  expect(
    state.requests.find(
      (request) => request.key === "workspace.collaborator.decline",
    )?.input,
  ).toEqual({ params: { draftId, id: invitationId } });
  state.notices = [{ ...notice(), recipientId: "another-user" }];
  await page
    .getByRole("button", { name: "Refresh invitations", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "do not match the current account",
  );
  await expect(
    page.getByText("Weekly policy briefing", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Accept invitation", exact: true }),
  ).toHaveCount(0);
});
