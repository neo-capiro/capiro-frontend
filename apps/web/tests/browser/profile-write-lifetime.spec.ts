import { test, expect, type Page } from "@playwright/test";
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

async function settleProfileView(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
test("a matching notes clear uses only the native notes PUT and closes once", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = async (route) => {
    expect(route.request().postDataJSON()).toEqual({ notes: "" });
    state.client = {
      ...state.client,
      intakeData: { ...state.client.intakeData, profileNotes: "" },
    };
    await json(route, state.client);
  };
  await page.goto("/profile-current-state.html");
  await page.getByLabel("Notes", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByRole("dialog", { name: "Profile notes" }),
  ).not.toBeVisible();
  await expect(page.getByTestId("profile-closures")).toHaveText("Closures: 1");
  expect(state.client.intakeData.retained).toBe("Sibling field");
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a refreshed notes source fences a late receipt and retains the local draft for review", async ({
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
      intakeData: { profileNotes: "Local replacement" },
    });
  };
  await page.goto("/profile-current-state.html");
  await page.getByLabel("Notes", { exact: true }).fill("Local replacement");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  state.client = {
    ...state.client,
    intakeData: {
      ...state.client.intakeData,
      profileNotes: "Changed on another read",
    },
  };
  await profileEvent(page, "refresh");
  await expect(
    page.getByText(/Saved notes changed while this draft was open/),
  ).toBeVisible();
  release();
  await expect(page.getByText(/save result is unknown/i)).toBeVisible();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Local replacement",
  );
  await page.getByRole("button", { name: "Review saved notes" }).click();
  await expect(page.getByRole("button", { name: "Save notes" })).toBeEnabled();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Local replacement",
  );
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("owner membership role mismatches stay unknown and preserve the role draft", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) => json(route, state.team);
  await page.goto("/profile-current-state.html?mode=team");
  await page
    .getByLabel("Add team member")
    .selectOption("81000000-0000-4000-8000-000000000001");
  await page.getByLabel("Role", { exact: true }).fill("Legislative lead");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByText(/change result is unknown/i)).toBeVisible();
  await expect(page.getByLabel("Role", { exact: true })).toHaveValue(
    "Legislative lead",
  );
  await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("an owner's successfully updated membership role remains visible on the single owner row", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      userId: "81000000-0000-4000-8000-000000000001",
      role: "Legislative lead",
    });
    state.team = state.team.map((member) =>
      member.isOwner ? { ...member, role: "Legislative lead" } : member,
    );
    await json(route, state.team);
  };
  await page.goto("/profile-current-state.html?mode=team");
  await page
    .getByLabel("Add team member")
    .selectOption("81000000-0000-4000-8000-000000000001");
  await page.getByLabel("Role", { exact: true }).fill(" Legislative lead ");
  await page.getByRole("button", { name: "Add member" }).click();
  const owner = page.getByRole("listitem").filter({ hasText: "Olivia Owner" });
  await expect(owner).toContainText("Account owner · Legislative lead");
  await expect(owner.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.getByText("Team updated.", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a successfully removed member option leaves the retained choice unavailable", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=team");
  await page
    .getByLabel("Add team member")
    .selectOption("81000000-0000-4000-8000-000000000003");
  await page.getByLabel("Role", { exact: true }).fill("Retained role");
  state.members = state.members.filter(
    (member) => member.id !== "81000000-0000-4000-8000-000000000003",
  );
  await profileEvent(page, "refresh");
  await expect(
    page.getByRole("option", { name: "Selected member unavailable" }),
  ).toBeAttached();
  await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  await expect(page.getByLabel("Role", { exact: true })).toHaveValue(
    "Retained role",
  );
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("late team receipts do not report success or invalidate a replacement client view", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const member = profileMembers[2]!;
  state.write = async (route) => {
    await pending;
    await json(route, [
      ...state.team,
      {
        ...member,
        userId: member.id,
        id: "membership-new",
        role: "Analyst",
        isOwner: false,
        addedAt: "2026-10-11T12:00:00Z",
      },
    ]).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByLabel("Add team member").selectOption(member.id);
  await page.getByLabel("Role", { exact: true }).fill("Analyst");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  const initialReads = state.reads.team;
  await profileEvent(page, "client", otherProfileClientId);
  await expect.poll(() => state.reads.team).toBeGreaterThan(initialReads);
  await expect(page.getByLabel("Role", { exact: true })).toHaveValue("");
  const currentReads = state.reads.team;
  release();
  await settleProfileView(page);
  await expect(
    page.getByText("Team updated.", { exact: true }),
  ).not.toBeVisible();
  expect(state.reads.team).toBe(currentReads);
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("closing a pending facility create keeps the unknown fence when its view reopens", async ({
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
      ...profileFacility,
      id: "created-late",
      name: "Late facility",
    }).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  await page.getByLabel("Facility name").fill("Late facility");
  await page
    .getByRole("dialog", { name: "Add facility" })
    .getByRole("button", { name: "Add facility" })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  await profileEvent(page, "unmount");
  await expect(
    page.getByText("Profile view closed.", { exact: true }),
  ).toBeVisible();
  release();
  await profileEvent(page, "open");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add facility" });
  await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Add facility" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a similar current facility cannot be claimed as an unknown creation receipt", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.write = (route) =>
    json(route, { message: "Lost create response" }, 503);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Add facility" });
  await dialog.getByLabel("Facility name").fill("Similar facility");
  await dialog.getByRole("button", { name: "Add facility" }).click();
  await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  state.facilities = [
    ...state.facilities,
    { ...profileFacility, id: "similar-native-id", name: "Similar facility" },
  ];
  await dialog
    .getByRole("button", { name: "Review current facilities" })
    .click();
  await expect(dialog.getByText(/Current saved locations:/)).toContainText(
    "Similar facility",
  );
  await expect(
    dialog.getByRole("button", { name: "Add facility" }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Start a separate facility entry" })
    .click();
  dialog = page.getByRole("dialog", { name: "Add facility" });
  await expect(dialog.getByLabel("Facility name")).toHaveValue("");
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a changed saved facility cannot be overwritten by an older open draft", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  await page
    .getByRole("button", { name: "Edit facility", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Edit facility" });
  await dialog.getByLabel("Notes", { exact: true }).fill("Local unsaved note");
  state.facilities = [{ ...profileFacility, notes: "Another saved note" }];
  await profileEvent(page, "refresh");
  await expect(
    dialog.getByText(/saved facility changed or is unavailable/i),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await expect(dialog.getByLabel("Notes", { exact: true })).toHaveValue(
    "Local unsaved note",
  );
  await dialog
    .getByRole("button", { name: "Review current facilities" })
    .click();
  await dialog
    .getByRole("button", { name: "Use the reviewed facility" })
    .click();
  await expect(dialog.getByLabel("Notes", { exact: true })).toHaveValue(
    "Another saved note",
  );
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("a late facility result cannot escape its original actor's unknown fence", async ({
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
      ...profileFacility,
      id: "old-actor-created",
      name: "Old actor facility",
    }).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  await page.getByRole("button", { name: "Add facility", exact: true }).click();
  await page.getByLabel("Facility name").fill("Old actor facility");
  await page
    .getByRole("dialog", { name: "Add facility" })
    .getByRole("button", { name: "Add facility" })
    .click();
  await expect.poll(() => state.writes.length).toBe(1);
  await profileEvent(page, "identity", {
    ...profileIdentity,
    user: { ...profileIdentity.user, id: "another-admin" },
  });
  await expect(page.getByLabel("Facility name")).toHaveValue("");
  release();
  await profileEvent(page, "identity", profileIdentity);
  await expect(page.getByText(/creation result is unknown/i)).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "Add facility" })
      .getByRole("button", { name: "Add facility" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
