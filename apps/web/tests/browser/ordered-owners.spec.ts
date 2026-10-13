import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  installProfileCurrentState,
  profileEvent,
} from "./profile-current-state-fixtures";
import {
  profileIdentity,
  profileMembers,
  profileOwners,
} from "../profile-current-state-fixtures";
import type { OrderedOwners } from "../../src/features/portfolio/client-profile/ordered-owners";
const ownerLabels = ["Primary", "Secondary", "Tertiary", "Quaternary"] as const;

const fourth = {
  id: "81000000-0000-4000-8000-000000000006",
  email: "fourth@example.test",
  firstName: "Quinn",
  lastName: "Fourth",
};
const members = [...profileMembers, fourth];
function receipt(ids: string[], version: number): OrderedOwners {
  return {
    ...profileOwners,
    version,
    owners: ids.map((userId, index) => ({
      userId,
      rank: index + 1,
      label: ownerLabels[index]!,
      available: true,
      person: members.find((member) => member.id === userId)!,
    })),
  };
}
test("four ranked owners require a deliberate save and preserve exact order", async ({
  page,
}, info) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.members = members;
  state.write = (route) => {
    const input = route.request().postDataJSON();
    state.owners = receipt(input.userIds, input.expectedVersion + 1);
    return json(route, state.owners);
  };
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  for (let index = 0; index < 4; index++)
    await page
      .getByRole("combobox", {
        name: `${ownerLabels[index]} owner`,
        exact: true,
      })
      .selectOption(members[index]!.id);
  expect(state.writes).toEqual([]);
  await page.getByRole("button", { name: "Save owners" }).click();
  await expect(
    page.getByText("Owner order saved. Account team is refreshing."),
  ).toBeVisible();
  expect(state.writes).toEqual([
    {
      path: `clients/${profileOwners.clientId}/account-owners`,
      method: "PUT",
      body: { expectedVersion: 3, userIds: members.map((member) => member.id) },
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  const fieldset = page.getByRole("list", { name: "Ordered account owners" });
  await fieldset.scrollIntoViewIfNeeded();
  expect(
    await fieldset.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("combobox", { name: "Quaternary owner", exact: true })
    .focus();
  await expect(
    page.getByRole("combobox", { name: "Quaternary owner", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: info.outputPath("ordered-owners-mobile.png") });
  expect(unexpected).toEqual([]);
});
test("clearing Primary preserves later positions and blocks an implicit promotion", async ({
  page,
}) => {
  const { state } = await installProfileCurrentState(page);
  state.owners = receipt([members[0]!.id, members[1]!.id], 7);
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  await page
    .getByRole("combobox", { name: "Primary owner", exact: true })
    .selectOption("");
  await page.getByRole("button", { name: "Save owners" }).click();
  await expect(
    page.getByText(/clearing a position does not promote/i),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Secondary owner", exact: true }),
  ).toHaveValue(members[1]!.id);
  await page.getByRole("button", { name: "Read current owners" }).click();
  await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Secondary owner", exact: true }),
  ).toHaveValue(members[1]!.id);
  expect(state.writes).toEqual([]);
});
test("unavailable historical owners keep their rank and ranked members have no roster Remove", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.owners = receipt([members[0]!.id, members[1]!.id], 7);
  state.owners.owners[0] = {
    ...state.owners.owners[0]!,
    available: false,
    person: null,
  };
  state.members = state.members.filter(
    (member) => member.id !== members[0]!.id,
  );
  state.team = state.team.map((member, index) => ({
    ...member,
    ownerRank: index + 1,
    ownerAvailable: index !== 0,
  }));
  await page.goto("/profile-current-state.html?mode=team");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Terry Team" })
      .getByRole("button", { name: "Remove" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Manage owners" }).click();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue(members[0]!.id);
  await expect(
    page.getByRole("option", { name: `Unavailable owner · ${members[0]!.id}` }),
  ).toBeAttached();
  await expect(
    page.getByRole("combobox", { name: "Secondary owner", exact: true }),
  ).toHaveValue(members[1]!.id);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("409 requires read-back and a fresh deliberate versioned save, never automatic retry", async ({
  page,
}) => {
  const { state } = await installProfileCurrentState(page);
  state.write = (route) =>
    json(route, { message: "owner_version_changed" }, 409);
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  await page
    .getByRole("combobox", { name: "Primary owner", exact: true })
    .selectOption(members[2]!.id);
  await page.getByRole("button", { name: "Save owners" }).click();
  await expect(
    page.getByText(/owner change result needs review/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save owners" }),
  ).toBeDisabled();
  state.owners = receipt([members[1]!.id], 9);
  await page.getByRole("button", { name: "Read current owners" }).click();
  await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue(members[2]!.id);
  expect(state.writes).toHaveLength(1);
  state.write = (route) => json(route, receipt([members[2]!.id], 10));
  await page.getByRole("button", { name: "Save owners" }).click();
  await expect(page.getByText(/owner order saved/i)).toBeVisible();
  expect(state.writes.map((write) => write.body)).toEqual([
    { expectedVersion: 3, userIds: [members[2]!.id] },
    { expectedVersion: 9, userIds: [members[2]!.id] },
  ]);
});
test("an interrupted PUT remains fenced after reopening and matching read-back sends nothing", async ({
  page,
}) => {
  const { state } = await installProfileCurrentState(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.write = async (route) => {
    await held;
    await json(route, state.owners).catch(() => undefined);
  };
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  await page
    .getByRole("combobox", { name: "Primary owner", exact: true })
    .selectOption(members[2]!.id);
  await page.getByRole("button", { name: "Save owners" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await profileEvent(page, "unmount");
  await expect(
    page.getByText("Profile view closed.", { exact: true }),
  ).toBeVisible();
  state.owners = receipt([members[2]!.id], 4);
  release();
  await profileEvent(page, "open");
  await page.getByRole("button", { name: "Manage owners" }).click();
  await expect(
    page.getByText(/owner change result needs review/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save owners" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Read current owners" }).click();
  await expect(
    page.getByText(/current owners match the submitted order/i),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
});
test("background read cannot silently rebase a draft, and replacing the actor clears that editor", async ({
  page,
}) => {
  const { state } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  await page
    .getByRole("combobox", { name: "Primary owner", exact: true })
    .selectOption(members[2]!.id);
  state.owners = receipt([members[1]!.id], 5);
  await profileEvent(page, "refresh");
  await expect(page.getByText(/saved owner source changed/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save owners" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue(members[2]!.id);
  await profileEvent(page, "identity", {
    ...profileIdentity,
    role: "standard_user",
  });
  await expect(
    page.getByRole("dialog", { name: "Owners", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Manage owners" }).click();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue(members[1]!.id);
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toBeDisabled();
  expect(state.writes).toEqual([]);
});
