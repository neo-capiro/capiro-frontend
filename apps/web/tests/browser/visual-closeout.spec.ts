import { expect, test } from "@playwright/test";
import { installFixtures, clientId, json } from "./fixtures";
import { installProfileCurrentState } from "./profile-current-state-fixtures";
import { profileMembers } from "../profile-current-state-fixtures";
import { installCapabilityPresentation } from "./capability-presentation-fixtures";

// VD01: exercise the dedicated surface without replacing the version/receipt tests.
test("owner cards support deliberate keyboard and pointer ordering, cancel, and nested focus return", async ({
  page,
}, info) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.owners.owners = profileMembers.map((person, index) => ({
    userId: person.id,
    rank: index + 1,
    label: (["Primary", "Secondary", "Tertiary"] as const)[index]!,
    available: true,
    person,
  }));
  await page.goto("/profile-current-state.html?mode=team");
  const trigger = page.getByRole("button", {
    name: "Manage owners",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Owners", exact: true });
  await expect(dialog).toHaveCSS("width", "580px");
  await expect(
    dialog
      .getByRole("list", { name: "Ordered account owners" })
      .getByRole("listitem"),
  ).toHaveCount(4);
  await page.screenshot({ path: info.outputPath("owners-desktop-after.png") });
  const primary = dialog.getByRole("combobox", {
    name: "Primary owner",
    exact: true,
  });
  const secondary = dialog.getByRole("combobox", {
    name: "Secondary owner",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Reorder Secondary owner" }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(primary).toHaveValue(profileMembers[1]!.id);
  await expect(secondary).toHaveValue(profileMembers[0]!.id);
  await expect(
    dialog.getByRole("button", { name: "Reorder Primary owner" }),
  ).toBeFocused();
  expect(state.writes).toEqual([]);
  await dialog
    .getByRole("button", { name: "Reorder Primary owner" })
    .dragTo(dialog.getByRole("listitem").nth(1));
  await expect(primary).toHaveValue(profileMembers[0]!.id);
  await dialog.getByRole("button", { name: "Clear Secondary owner" }).click();
  await expect(secondary).toHaveValue("");
  await expect(
    dialog.getByRole("combobox", { name: "Tertiary owner", exact: true }),
  ).toHaveValue(profileMembers[2]!.id);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "Account team", exact: true }),
  ).toBeVisible();
  await trigger.press("Enter");
  await expect(secondary).toHaveValue(profileMembers[1]!.id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("owners-mobile-dark-after.png"),
  });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("closing only the Owners dialog during a PUT preserves its uncertainty fence", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
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
    .selectOption(profileMembers[2]!.id);
  await page.getByRole("button", { name: "Save owners", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  release();
  await page.getByRole("button", { name: "Manage owners" }).click();
  await expect(
    page.getByText(/owner change result needs review/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save owners", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Read current owners" }).click();
  await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveValue(profileMembers[2]!.id);
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("Portfolio Customize retains unavailable guards and keyboard-accessible filters", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto("/portfolio");
  const header = page
    .locator("header")
    .filter({ has: page.getByRole("heading", { name: /^Portfolio/ }) });
  await expect(
    header.getByLabel("Account owner", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved profile ordering is unavailable", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Drag .* to rearrange/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("index-unavailable-after.png"),
  });
  await header.getByRole("button", { name: "Customize", exact: true }).click();
  // A failed saved-order read keeps the accessible roster visible, so the
  // reorder controls are present but refused: no move, no drag, no save.
  await expect(
    page.getByRole("button", { name: /Drag .* to rearrange/ }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Move .* (earlier|later)$/ }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Saved profile ordering is unavailable", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/Changes stay local until/)).toHaveCount(0);
  await expect(
    page.getByText(
      "Drag any card to rearrange · your layout is saved to your profile",
      { exact: true },
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Done customizing", exact: true })
    .click();
  await expect(
    header.getByRole("button", { name: "Customize", exact: true }),
  ).toBeFocused();
  const disclosure = page.getByText("Filters and view", { exact: true });
  await disclosure.focus();
  await disclosure.press("Enter");
  await expect(page.getByLabel("Sort profiles")).toBeVisible();
  await page.getByLabel("Sort profiles").focus();
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeFocused();
  await expect(page.getByLabel("Sort profiles")).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await disclosure.press("Enter");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("index-mobile-filters-after.png"),
  });
  expect(unexpected).toEqual([]);
});

test("capability create offers current-client suggestions, inline required marker and sharp scrim", async ({
  page,
}, info) => {
  const unexpected = await installCapabilityPresentation(page);
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const trigger = page.getByRole("button", {
    name: "Add capability",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "New capability",
    exact: true,
  });
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  const label = dialog
    .locator('input[name="name"]')
    .locator("..")
    .locator(":scope > span");
  await expect(label).toHaveText("Name *");
  expect((await label.boundingBox())!.height).toBeLessThan(25);
  for (const name of ["Type", "Sector"]) {
    const field = dialog.getByLabel(name, { exact: true });
    await expect(field).toHaveAttribute("list", /.+/);
    await expect(
      field.locator("..").getByText("▾", { exact: true }),
    ).toBeVisible();
    await field.fill(`Unlisted ${name} / arbitrary value`);
    await expect(field).toHaveValue(`Unlisted ${name} / arbitrary value`);
  }
  await expect(dialog.locator("datalist option[value=Defense]")).toHaveCount(1);
  await expect(page.locator("[data-slot=dialog-overlay]")).toHaveCSS(
    "backdrop-filter",
    "none",
  );
  await page.screenshot({
    path: info.outputPath("capability-create-after.png"),
  });
  await page.mouse.click(250, 90);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(unexpected).toEqual([]);
});

test("Bill Tracker retains table/board/filter controls inside its compact results frame", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}/bills`);
  await expect(
    page.getByRole("heading", { name: "Bill Tracker", exact: true }),
  ).toHaveCSS("font-size", "20px");
  const results = page.getByRole("region", {
    name: "Tracked bill results",
    exact: true,
  });
  await expect(
    results.getByRole("heading", { name: "Bill results", exact: true }),
  ).toBeVisible();
  await expect(results.getByRole("table")).toBeVisible();
  await results.getByLabel("Filter loaded bills").fill("synthetic");
  await results
    .getByRole("button", { name: "Board view", exact: true })
    .click();
  await expect(page).toHaveURL(/q=synthetic&view=board/);
  await expect(results.getByLabel("Filter loaded bills")).toHaveValue(
    "synthetic",
  );
  await results
    .getByRole("button", { name: "Table view", exact: true })
    .click();
  await expect(results.getByRole("table")).toBeVisible();
  await page.screenshot({ path: info.outputPath("bills-desktop-after.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("bills-mobile-after.png") });
  expect(unexpected).toEqual([]);
});
