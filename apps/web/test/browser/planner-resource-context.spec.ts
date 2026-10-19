import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { navigate, setup } from "./next-modules-fixtures";

const dashboard = {
  id: "70000000-0000-4000-8000-000000000001",
  projectId: null,
  ownerId: "test-user",
  name: "Synthetic reporting dashboard",
  version: 1,
  archived: false,
  access: "admin",
  kind: "dashboard",
  data: { description: "", privacy: "private", members: [], widgets: [] },
};
const goal = {
  ...dashboard,
  id: "70000000-0000-4000-8000-000000000002",
  name: "Synthetic goal",
  kind: "goal",
  data: {
    description: "",
    privacy: "private",
    members: [],
    projectIds: [],
    ownerId: null,
    dueOn: null,
    status: "on_track",
    progress: "manual",
    current: 0,
    target: 100,
    unit: "%",
    startValue: 0,
    direction: "increase",
  },
};

test("Planner resource tabs contain the opened dashboard and editor kind across repeated switches", async ({
  page,
}) => {
  await setup(page, { "planner.resources": [dashboard, goal] });
  await page.goto("/modules/planner?view=reporting");
  await page
    .getByRole("button", { name: "Open dashboard", exact: true })
    .click();
  for (let pass = 0; pass < 2; pass++) {
    await page.getByRole("tab", { name: "Goals", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Edit dashboard", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: goal.name, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Goal details", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Edit goal", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      goal.name,
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("tab", { name: "Reporting", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Edit dashboard", exact: true }),
    ).toBeVisible();
  }
});

for (const existing of [true, false]) {
  test(`Planner preserves ${existing ? "existing" : "new"} dashboard draft and captured write target through history`, async ({
    page,
  }) => {
    const writes: unknown[] = [];
    await setup(page, { "planner.resources": [dashboard, goal] });
    await page.route("**/api/capiro/planner.resource.*", async (route) => {
      writes.push({
        operation: new URL(route.request().url()).pathname.split("/").pop(),
        input: route.request().postDataJSON(),
      });
      await route.fulfill({
        status: 422,
        json: { message: "Synthetic save refused" },
      });
    });
    await page.goto("/modules/planner?view=reporting");
    if (existing) {
      await page
        .getByRole("button", { name: "Open dashboard", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit dashboard", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "+ New dashboard", exact: true })
        .click();
    }
    const dialog = page.getByRole("dialog", {
      name: `${existing ? "Edit" : "New"} dashboard`,
      exact: true,
    });
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Unsaved dashboard name");
    await dialog
      .getByLabel("Description", { exact: true })
      .fill("Keep these dashboard notes");
    await navigate(page, "/modules/planner?view=goals");
    for (let pass = 0; pass < 2; pass++) {
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
        "Unsaved dashboard name",
      );
      await expect(
        dialog.getByLabel("Description", { exact: true }),
      ).toHaveValue("Keep these dashboard notes");
      await page.goBack();
      await expect(page).toHaveURL(/view=reporting$/);
      await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
        "Unsaved dashboard name",
      );
      await page.goForward();
      await expect(page).toHaveURL(/view=goals$/);
    }
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Synthetic save refused",
    );
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
      "Unsaved dashboard name",
    );
    expect(writes).toEqual([
      {
        operation: existing
          ? "planner.resource.update"
          : "planner.resource.create",
        input: existing
          ? {
              params: { id: dashboard.id },
              body: {
                version: 1,
                name: "Unsaved dashboard name",
                data: {
                  ...dashboard.data,
                  description: "Keep these dashboard notes",
                },
              },
            }
          : {
              body: {
                kind: "dashboard",
                name: "Unsaved dashboard name",
                projectId: null,
                data: {
                  ...dashboard.data,
                  description: "Keep these dashboard notes",
                },
              },
            },
      },
    ]);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: goal.name, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "+ New goal", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "New goal", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
  });
}
