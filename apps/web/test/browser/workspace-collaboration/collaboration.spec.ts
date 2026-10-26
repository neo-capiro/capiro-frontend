import { test, expect } from "@playwright/test";
import {
  deferred,
  draftId,
  fixture,
  invitationId,
  openPeople,
  owner,
  pendingPerson,
  savedPerson,
} from "./fixtures";
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("owner saves a pending internal invitation using the Clerk identity and no implicit email", async ({
  page,
}) => {
  const state = await fixture(page, false);
  await openPeople(page);
  await page.getByRole("combobox", { name: "Teammate", exact: true }).click();
  await page
    .getByRole("option", { name: "Alex Morgan · alex@example.test" })
    .click();
  await page
    .getByRole("button", { name: "Invite teammate", exact: true })
    .click();
  await expect(
    page.getByText("Invitation saved.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Invitation pending", { exact: false }),
  ).toBeVisible();
  expect(
    state.requests.find(
      (request) => request.key === "workspace.collaborator.invite",
    )?.input,
  ).toMatchObject({
    params: { draftId },
    body: { subjectId: "user_alex", role: "editor" },
  });
  expect(
    state.requests.some((request) =>
      request.key.startsWith("workspace.collaborator.email"),
    ),
  ).toBe(false);
  await page
    .getByRole("dialog")
    .screenshot({ path: "work/ws08/owner-pending.png" });
  await page
    .getByRole("button", { name: "Email notification", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Email not requested" }),
  ).toBeVisible();
  expect(
    state.requests.filter(
      (request) => request.key === "workspace.collaborator.email.request",
    ),
  ).toHaveLength(0);
});

test("role and remove use saved row identity; owner is immutable and non-owner cannot manage", async ({
  page,
}) => {
  const state = await fixture(page);
  await openPeople(page);
  const person = page.getByRole("article", {
    name: "Alex Morgan",
    exact: true,
  });
  await person.getByRole("combobox", { name: "Document role" }).click();
  await page.getByRole("option", { name: "Viewer", exact: true }).click();
  await expect(page.getByText("Role updated.", { exact: true })).toBeVisible();
  expect(
    state.requests.find(
      (request) => request.key === "workspace.collaborator.role",
    )?.input,
  ).toEqual({
    params: { draftId, id: invitationId },
    body: { role: "viewer" },
  });
  await expect(
    page
      .getByRole("article", { name: "Jordan Clayton", exact: true })
      .getByRole("combobox"),
  ).toHaveCount(0);
  await person.getByRole("button", { name: "Remove invitation" }).click();
  await person.getByRole("button", { name: "Confirm removal" }).click();
  await expect(
    page.getByText("Collaborator removed.", { exact: false }),
  ).toBeVisible();
  expect(
    state.requests.filter(
      (request) => request.key === "workspace.collaborator.remove",
    ),
  ).toHaveLength(1);
  state.actor = "user_alex";
  state.people = [owner, { ...pendingPerson, status: "active" }];
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "People with access", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Invite teammate", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remove access", exact: true }),
  ).toHaveCount(0);
});

test("lost invitation acknowledgement reconciles only a real saved member row and never duplicates", async ({
  page,
}) => {
  const state = await fixture(page, false);
  let invites = 0;
  await page.route(
    "**/api/capiro/workspace.collaborator.invite",
    async (route) => {
      invites++;
      state.people = [owner, pendingPerson];
      await route.abort("failed");
    },
  );
  await openPeople(page);
  await page.getByRole("combobox", { name: "Teammate", exact: true }).click();
  await page
    .getByRole("option", { name: "Alex Morgan · alex@example.test" })
    .click();
  await page
    .getByRole("button", { name: "Invite teammate", exact: true })
    .click();
  await expect(
    page.getByText("A saved invitation for this teammate is present.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Invite teammate", exact: true }),
  ).toBeDisabled();
  expect(invites).toBe(1);
  expect(
    state.requests.some((request) =>
      request.key.startsWith("workspace.collaborator.email"),
    ),
  ).toBe(false);
});

test("access revocation removes private people and late session/document writes cannot restore them", async ({
  page,
}) => {
  const state = await fixture(page);
  await openPeople(page);
  state.refused = true;
  await page
    .getByRole("button", { name: "Refresh people", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic access revoked",
  );
  await expect(page.getByText("Alex Morgan", { exact: true })).toHaveCount(0);
  state.refused = false;
  await page
    .getByRole("button", { name: "Refresh people", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
  const gate = deferred();
  await page.route(
    "**/api/capiro/workspace.collaborator.role",
    async (route) => {
      await gate.promise;
      await route
        .fulfill({ json: { ...savedPerson(), role: "viewer" } })
        .catch(() => {});
    },
  );
  await page
    .getByRole("article", { name: "Alex Morgan", exact: true })
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "Viewer", exact: true }).click();
  await page
    .locator("button")
    .filter({ hasText: "Replace document" })
    .evaluate((button: HTMLButtonElement) => button.click());
  gate.resolve();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "People with access", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "current document owner could not be verified",
  );
  await expect(page.getByText("Alex Morgan", { exact: true })).toHaveCount(0);
  await page
    .locator("button")
    .filter({ hasText: "Replace session scope" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
