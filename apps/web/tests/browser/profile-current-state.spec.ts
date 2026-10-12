import { test, expect } from "@playwright/test";
import { json } from "./fixtures";
import {
  installProfileCurrentState,
  profileEvent,
} from "./profile-current-state-fixtures";
import {
  otherProfileClientId,
  profileClient,
  profileFacility,
  profileIdentity,
  profileMembers,
} from "../profile-current-state-fixtures";

test("profile notes conceal a failed saved-client read and prevent replacement", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html");
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Saved profile notes",
  );
  state.clientStatus = 403;
  await profileEvent(page, "refresh");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Notes", { exact: true })).not.toHaveValue(
    "Saved profile notes",
  );
  await expect(page.getByRole("button", { name: "Save notes" })).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("profile notes reject another client's receipt and require review before retry", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) =>
    json(route, {
      ...profileClient,
      id: otherProfileClientId,
      intakeData: { profileNotes: "My unsaved note" },
    });
  await page.goto("/profile-current-state.html");
  await page.getByLabel("Notes", { exact: true }).fill("My unsaved note");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByRole("dialog", { name: "Profile notes" }),
  ).toBeVisible();
  await expect(page.getByText(/save result is unknown/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save notes" })).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("profile notes retain a refused draft without reporting it saved", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html");
  await page.getByLabel("Notes", { exact: true }).fill("Keep my draft");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Keep my draft",
  );
  await expect(page.getByRole("button", { name: "Save notes" })).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("late notes receipts cannot close a replacement actor's editor", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.write = async (route) => {
    await pending;
    await json(route, {
      ...profileClient,
      intakeData: { profileNotes: "Old actor draft" },
    }).catch(() => {});
  };
  await page.goto("/profile-current-state.html");
  await page.getByLabel("Notes", { exact: true }).fill("Old actor draft");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await profileEvent(page, "identity", {
    ...profileIdentity,
    user: { ...profileIdentity.user, id: "replacement-admin" },
  });
  release();
  await expect(
    page.getByRole("dialog", { name: "Profile notes" }),
  ).toBeVisible();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Saved profile notes",
  );
  await expect(page.getByTestId("profile-closures")).toHaveText("Closures: 0");
  expect(unexpected).toEqual([]);
});

test("failed account-team refresh conceals cached members and disables changes", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=team");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Terry Team" }),
  ).toBeVisible();
  state.teamStatus = 403;
  await profileEvent(page, "refresh");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Terry Team" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("failed member options cannot submit a retained selection", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByLabel("Add team member").selectOption(profileMembers[2]!.id);
  await page.getByLabel("Role", { exact: true }).fill("Research");
  state.membersStatus = 403;
  await profileEvent(page, "refresh");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  await expect(page.getByLabel("Role", { exact: true })).toHaveValue(
    "Research",
  );
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("team add needs the requested native roster effect", async ({ page }) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) => json(route, state.team);
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByLabel("Add team member").selectOption(profileMembers[2]!.id);
  await page.getByLabel("Role", { exact: true }).fill("Research");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText(/change result is unknown/i)).toBeVisible();
  await expect(
    page.getByText("Team updated.", { exact: true }),
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("owner assignment rejects a different returned owner", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) =>
    json(route, {
      ...state.owners,
      version: state.owners.version + 1,
    });
  await page.goto("/profile-current-state.html?mode=team");
  await page
    .getByRole("combobox", { name: "Primary owner", exact: true })
    .selectOption(profileMembers[2]!.id);
  await page.getByRole("button", { name: "Save owner order" }).click();
  await expect(
    page.getByText(/owner change result needs review/i),
  ).toBeVisible();
  await expect(
    page.getByText("Team updated.", { exact: true }),
  ).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("failed facilities refresh conceals saved locations and closes their detail", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).toBeVisible();
  state.facilitiesStatus = 403;
  await profileEvent(page, "refresh");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: /Synthetic profile lab/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add facility", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("a removed facility selection does not reopen when that ID returns", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  state.facilities = [];
  await profileEvent(page, "refresh");
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).not.toBeVisible();
  state.facilities = [{ ...profileFacility }];
  await profileEvent(page, "refresh");
  await expect(
    page.getByRole("button", { name: /Synthetic profile lab/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).not.toBeVisible();
  expect(unexpected).toEqual([]);
});

test("unknown facility creation stays fenced after closing and reopening", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) =>
    json(route, { message: "Synthetic lost result" }, 503);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Add facility" });
  await dialog.getByLabel("Facility name").fill("Uncertain new lab");
  await dialog.getByRole("button", { name: "Add facility" }).click();
  await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Add facility" });
  await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Add facility", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("identity invalidation disables facility creation despite a cached role", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add facility" });
  await dialog.getByLabel("Facility name").fill("Retained facility draft");
  await profileEvent(page, "invalidate-identity");
  await expect(
    dialog.getByRole("button", { name: "Add facility", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
