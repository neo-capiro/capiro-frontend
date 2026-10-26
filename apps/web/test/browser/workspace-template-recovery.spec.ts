import { expect } from "@playwright/test";
import axe from "axe-core";
import { test } from "./runtime-observed-test";
import {
  deferred,
  id,
  menu,
  panel,
  reviewWizard,
  setup,
} from "./template-recovery-fixtures";

test("lost use retains original inputs across remount and replays original version after publication", async ({
  page,
}, info) => {
  const f = await setup(page, true);
  const gate = deferred();
  await f.write("use", async (route, _input, count) => {
    if (count === 1) {
      await gate.promise;
      await route.abort("failed");
    } else await route.fulfill({ json: f.useResult });
  });
  await f.open();
  await page.getByRole("button", { name: "Use template", exact: true }).click();
  await page
    .getByLabel("Campaign title", { exact: true })
    .fill("Frozen original title");
  await page
    .getByRole("button", { name: "Apply template", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect
    .poll(() => f.calls.filter((c) => c.key === "use").length)
    .toBe(1);
  await expect(
    page.getByLabel("Campaign title", { exact: true }),
  ).toBeDisabled();
  gate.resolve();
  await expect(page.getByLabel("Campaign title", { exact: true })).toHaveValue(
    "Frozen original title",
  );
  await page.reload();
  await expect(
    panel(page).getByRole("button", { name: "Recover original command" }),
  ).toBeEnabled();
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(1);
  await panel(page).getByText("Submitted inputs", { exact: true }).click();
  await expect(panel(page)).toContainText("Frozen original title");
  f.template.publishedVersionId = id(4);
  f.template.publishedVersionNumber = 3;
  await panel(page)
    .getByRole("button", { name: "Recover original command" })
    .click();
  await expect(panel(page)).toContainText(
    "From template · Synthetic recovery template · v1",
  );
  const writes = f.calls.filter((c) => c.key === "use");
  expect(writes).toHaveLength(2);
  expect(writes[1]!.input).toEqual(writes[0]!.input);
  expect(f.calls.some((c) => c.key === "provenance")).toBe(true);
  await page.reload();
  await expect(panel(page)).toContainText("Original applied topic");
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(() =>
    (window as unknown as { axe: typeof axe }).axe.run(
      'section[aria-label="Template command recovery"]',
    ),
  );
  await info.attach("recovery-axe", {
    body: JSON.stringify(audit),
    contentType: "application/json",
  });
  expect(
    audit.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await panel(page).screenshot({
    path: info.outputPath("recovery-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await panel(page).screenshot({
    path: info.outputPath("recovery-narrow.png"),
  });
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(2);
  f.state.denyProvenance = true;
  await page.reload();
  await expect(panel(page)).toContainText("Current campaign access denied");
  await expect(
    page.getByText("Frozen original title", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Original applied topic", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Recover original command" }),
  ).toHaveCount(0);
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(2);
});

test("publish retains acknowledged draft pointer through concurrent changes and exact replay", async ({
  page,
}) => {
  const f = await setup(page, true);
  await f.write("publish", async (route, _input, count) => {
    if (count === 1) {
      f.template.currentDraftVersionId = id(4);
      await route.abort("failed");
    } else
      await route.fulfill({
        json: {
          templateId: id(1),
          version: { ...f.version(2), lifecycle: "published" },
          published: true,
          replayed: true,
        },
      });
  });
  await f.open();
  await menu(page, "Publish draft");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "publish").length)
    .toBe(1);
  await page.reload();
  await panel(page)
    .getByRole("button", { name: "Recover original command" })
    .click();
  await expect(panel(page)).toContainText("Template command completed");
  const writes = f.calls.filter((c) => c.key === "publish");
  expect(writes).toHaveLength(2);
  expect(writes[0]!.input).toEqual({
    params: { templateId: id(1) },
    body: { expectedDraftVersionId: id(3) },
  });
  expect(writes[1]!.input).toEqual(writes[0]!.input);
  await panel(page)
    .getByRole("button", { name: "Done · refresh library" })
    .click();
  await expect(
    page.getByRole("button", { name: "+ Create template", exact: true }),
  ).toBeEnabled();
});

test("superseded publish refusal never substitutes the current draft", async ({
  page,
}) => {
  const f = await setup(page);
  await f.write("publish", async (route) => {
    f.template.currentDraftVersionId = id(4);
    await route.fulfill({
      status: 409,
      json: {
        code: "OUTREACH_TEMPLATE_VERSION_IMMUTABLE",
        message: "The saved draft was superseded",
      },
    });
  });
  await f.open();
  await menu(page, "Publish draft");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "The saved draft was superseded",
  );
  await page.reload();
  await panel(page)
    .getByRole("button", { name: "Recover original command" })
    .click();
  await expect(panel(page)).toContainText("The saved draft was superseded");
  const writes = f.calls.filter((c) => c.key === "publish");
  expect(writes).toHaveLength(2);
  expect(writes[1]!.input).toEqual(writes[0]!.input);
  await expect(
    panel(page).getByText("Template command completed", { exact: true }),
  ).toHaveCount(0);
});

test("metadata acknowledgment survives an unknown draft save without repeating either write", async ({
  page,
}) => {
  const f = await setup(page);
  await f.write("metadata", async (route, input) => {
    Object.assign(f.template, input.body);
    await route.fulfill({ json: f.template });
  });
  await f.write("draft", (route) => route.abort("failed"));
  await f.open();
  await menu(page, "Version history");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit template", exact: true })
    .click();
  const dialog = await reviewWizard(page, "Partial metadata saved");
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Settings saved; draft is unconfirmed",
  );
  await expect(
    page.getByRole("dialog").getByLabel("Name", { exact: true }),
  ).toHaveValue("Partial metadata saved");
  await page.reload();
  await expect(panel(page)).toContainText(
    "Settings saved; draft is unconfirmed",
  );
  await panel(page)
    .getByRole("button", { name: "Inspect saved state" })
    .click();
  await expect(panel(page)).toContainText(
    "Current template: Partial metadata saved",
  );
  await expect(
    page.getByRole("button", { name: "+ Create template", exact: true }),
  ).toBeDisabled();
  await menu(page, "Version history", f.template.name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit template", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Name", { exact: true }),
  ).toHaveValue("Partial metadata saved");
  await expect(
    page.getByRole("dialog").getByLabel("Name", { exact: true }),
  ).toBeDisabled();
  expect(f.calls.filter((c) => c.key === "metadata")).toHaveLength(1);
  expect(f.calls.filter((c) => c.key === "draft")).toHaveLength(1);
  expect(f.calls.filter((c) => c.key === "publish")).toHaveLength(0);
});

test("lost scratch create remains fenced after refresh with original input and no second create", async ({
  page,
}) => {
  const f = await setup(page);
  await f.write("create", (route) => route.abort("failed"));
  await f.open();
  await page
    .getByRole("button", { name: "+ Create template", exact: true })
    .click();
  const dialog = await reviewWizard(page, "Unknown new template");
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "create").length)
    .toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "+ Create template", exact: true }),
  ).toBeDisabled();
  await panel(page).getByText("Submitted inputs", { exact: true }).click();
  await expect(panel(page)).toContainText("Unknown new template");
  await panel(page)
    .getByRole("button", { name: "Inspect saved state" })
    .click();
  await expect(panel(page)).toContainText("No exact completed receipt");
  await expect(
    panel(page).getByRole("button", { name: "Recover original command" }),
  ).toHaveCount(0);
  expect(f.calls.filter((c) => c.key === "create")).toHaveLength(1);
});

test("server search resets paging and selection and reaches campaign beyond first100", async ({
  page,
}) => {
  const f = await setup(page);
  await f.open();
  await page.getByRole("button", { name: "More template actions" }).click();
  await page
    .getByRole("menuitem", { name: "Save campaign as template" })
    .click();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByLabel("Source campaign", { exact: true }).click();
  await page.getByRole("option", { name: "Campaign 51", exact: true }).click();
  await page
    .getByLabel("Template name", { exact: true })
    .fill("Server search result");
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Search campaigns", { exact: true })
    .fill("Campaign 103");
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Source campaign", { exact: true }).click();
  await page.getByRole("option", { name: "Campaign 103", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  expect(f.calls.filter((c) => c.key === "search").at(-1)?.input).toEqual({
    query: {
      limit: 50,
      offset: 0,
      includeArchived: false,
      search: "Campaign 103",
    },
  });
  expect((await page.getByRole("dialog").boundingBox())?.width).toBe(580);
});

test("actor replacement disposes a held request without revealing its result to the next actor", async ({
  page,
}) => {
  const f = await setup(page);
  const gate = deferred();
  await f.write("use", async (route) => {
    await gate.promise;
    await route.fulfill({ json: f.useResult }).catch(() => {});
  });
  await f.open();
  await page.getByRole("button", { name: "Use template", exact: true }).click();
  await page
    .getByLabel("Campaign title", { exact: true })
    .fill("Actor one retained title");
  await page
    .getByRole("button", { name: "Apply template", exact: true })
    .click();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "use").length)
    .toBe(1);
  f.state.me.user.id = id(70);
  f.state.me.user.clerkUserId = "synthetic-next-actor";
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "synthetic-next-actor",
          sessionId: "synthetic-next-session",
        },
      }),
    ),
  );
  gate.resolve();
  await expect(
    page.getByRole("button", { name: "+ Create template", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Actor one retained title", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Original applied topic", { exact: true }),
  ).toHaveCount(0);
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(1);
});

test("metadata scope edit rechecks the acknowledged client and refreshes the visible settings", async ({
  page,
}) => {
  const f = await setup(page);
  await f.write("metadata", async (route, input) => {
    Object.assign(f.template, input.body);
    f.state.detailClient = input.body.clientId;
    await route.fulfill({ json: f.template });
  });
  await f.open();
  await menu(page, "Edit settings");
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Client scoped saved template");
  await dialog.getByLabel("Who can use it", { exact: true }).click();
  await page.getByRole("option", { name: "Client", exact: true }).click();
  await dialog.getByLabel("Client", { exact: true }).click();
  await page
    .getByRole("option", { name: "Current Aerospace", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toContainText("Template settings saved");
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Client scoped saved template",
  );
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await panel(page)
    .getByRole("button", { name: "Done · refresh library" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Client scoped saved template",
      exact: true,
    }),
  ).toBeVisible();
  expect(f.calls.filter((c) => c.key === "metadata")).toHaveLength(1);
});
