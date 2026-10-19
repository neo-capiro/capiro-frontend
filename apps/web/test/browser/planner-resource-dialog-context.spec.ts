import { expect } from "@playwright/test";
import { initialResourceData } from "../../src/features/modules/planner/resource-data";
import { test } from "./runtime-observed-test";
import { navigate, setup } from "./next-modules-fixtures";

const base = {
  id: "72000000-0000-4000-8000-000000000001",
  projectId: null,
  ownerId: "test-user",
  name: "Synthetic resource",
  version: 1,
  archived: false,
  access: "viewer",
};

test("Open Planner form keeps unsaved answers and file selection through resource history", async ({
  page,
}) => {
  const form = {
    ...base,
    kind: "form",
    data: {
      ...initialResourceData("form", ""),
      fields: [
        {
          id: "73000000-0000-4000-8000-000000000001",
          label: "Briefing request",
          type: "text",
          required: true,
          options: [],
          maxLength: 500,
          taskField: "name",
        },
        {
          id: "73000000-0000-4000-8000-000000000002",
          label: "Supporting file",
          type: "attachment",
          required: false,
          options: [],
          taskField: "attachments",
        },
      ],
    },
  };
  await setup(page, { "planner.resources": [form] });
  await page.goto("/modules/planner?view=forms");
  await page.getByRole("button", { name: "Open form", exact: true }).click();
  const answer = page.getByLabel("Briefing request", { exact: false });
  const attachment = page.getByLabel("Supporting file", { exact: true });
  await answer.fill("Preserve this request draft");
  await attachment.setInputFiles({
    name: "synthetic-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic notes"),
  });
  await navigate(page, "/modules/planner?view=reporting");
  for (let pass = 0; pass < 2; pass++) {
    await expect(answer).toHaveValue("Preserve this request draft");
    expect(
      await attachment.evaluate(
        (input) => (input as HTMLInputElement).files?.[0]?.name,
      ),
    ).toBe("synthetic-notes.txt");
    await page.goBack();
    await expect(page).toHaveURL(/view=forms$/);
    await expect(answer).toHaveValue("Preserve this request draft");
    await page.goForward();
    await expect(page).toHaveURL(/view=reporting$/);
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "+ New dashboard", exact: true }),
  ).toBeVisible();
});

test("Open Planner template copy keeps its project draft through resource history", async ({
  page,
}) => {
  const template = {
    ...base,
    kind: "template",
    data: initialResourceData("template", base.name),
  };
  await setup(page, { "planner.resources": [template] });
  await page.goto("/modules/planner?view=templates");
  await page.getByRole("button", { name: "Use template", exact: true }).click();
  const name = page.getByLabel("Project name", { exact: true });
  await name.fill("Unsaved project copy");
  await navigate(page, "/modules/planner?view=goals");
  for (let pass = 0; pass < 2; pass++) {
    await expect(name).toHaveValue("Unsaved project copy");
    await page.goBack();
    await expect(page).toHaveURL(/view=templates$/);
    await expect(name).toHaveValue("Unsaved project copy");
    await page.goForward();
    await expect(page).toHaveURL(/view=goals$/);
  }
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "+ New goal", exact: true }),
  ).toBeVisible();
});
