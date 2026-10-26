import { expect } from "@playwright/test";
import axe from "axe-core";
import { test } from "./runtime-observed-test";
import { clientId } from "./next-modules-fixtures";
import {
  deferred,
  id,
  menu,
  panel,
  reviewWizard,
  setup,
} from "./template-recovery-fixtures";

test("pending private-template use hides original inputs after submitted client access is revoked", async ({
  page,
}) => {
  const f = await setup(page);
  let denied = false;
  const reads: Array<{
    params: { templateId: string };
    query?: { clientId?: string };
  }> = [];
  await page.route("**/api/capiro/workspace.template?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input") ?? "{}",
    );
    reads.push(input);
    if (denied && input.query?.clientId === clientId)
      return route.fulfill({
        status: 403,
        json: { message: "Selected campaign client access denied" },
      });
    return route.fallback();
  });
  await f.write("use", (route, _input, count) =>
    count === 1 ? route.abort("failed") : route.fulfill({ json: f.useResult }),
  );
  await f.open();
  expect(f.template.clientId).toBeNull();
  await page.getByRole("button", { name: "Use template", exact: true }).click();
  await page.getByLabel("Client", { exact: true }).click();
  await page
    .getByRole("option", { name: "Current Aerospace", exact: true })
    .click();
  await page
    .getByLabel("Campaign title", { exact: true })
    .fill("Retained client B campaign");
  await page
    .getByRole("button", { name: "Apply template", exact: true })
    .click();
  await expect
    .poll(() => f.calls.filter((c) => c.key === "use").length)
    .toBe(1);
  const beforeRemount = reads.length;
  denied = true;
  await page.reload();
  await expect(panel(page)).toContainText(
    "Selected campaign client access denied",
  );
  expect(reads.slice(beforeRemount)).toContainEqual({
    params: { templateId: id(1) },
    query: { clientId },
  });
  await expect(
    page.getByText("Retained client B campaign", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Recover original command" }),
  ).toHaveCount(0);
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(1);
  denied = false;
  await panel(page)
    .getByRole("button", { name: "Recheck recovery access" })
    .click();
  await panel(page).getByText("Submitted inputs", { exact: true }).click();
  await expect(panel(page)).toContainText("Retained client B campaign");
  await panel(page)
    .getByRole("button", { name: "Recover original command" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(panel(page)).toContainText("Template command completed");
  const writes = f.calls.filter((c) => c.key === "use");
  expect(writes).toHaveLength(2);
  expect(writes[1]!.input).toEqual(writes[0]!.input);
  expect(writes[0]!.input).toMatchObject({
    body: { clientId, title: "Retained client B campaign" },
  });
});

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
  const receiptDialog = page.getByRole("dialog", {
    name: "Synthetic recovery template · v1",
    exact: true,
  });
  await expect(receiptDialog).toBeVisible();
  const writes = f.calls.filter((c) => c.key === "use");
  expect(writes).toHaveLength(2);
  expect(writes[1]!.input).toEqual(writes[0]!.input);
  expect(f.calls.some((c) => c.key === "provenance")).toBe(true);
  await page.reload();
  await expect(receiptDialog).toContainText("Original applied topic");
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(() =>
    (window as unknown as { axe: typeof axe }).axe.run('[role="dialog"]'),
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
  await receiptDialog.screenshot({
    path: info.outputPath("recovery-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await receiptDialog.screenshot({
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

test("canonical receipt uses the Modules dialog and preserves all four categories at desktop and narrow widths", async ({
  page,
}, info) => {
  const f = await setup(page);
  Object.assign(f.provenance.receiptJsonb, {
    inherited: [
      { field: "topic", label: "Topic", detail: "Original applied topic" },
      { field: "tone", label: "Tone", detail: "Concise and clear" },
      { field: "length", label: "Length", detail: "Short" },
    ],
    refreshed: [
      {
        field: "recipients",
        label: "Recipients",
        detail: "Current synthetic directory",
      },
    ],
    unresolved: [
      { field: "purpose", label: "Campaign purpose", detail: "Choose in Plan" },
    ],
    unavailable: [
      {
        field: "source",
        label: "Optional source",
        detail: "No saved source available",
      },
    ],
  });
  await f.write("use", (route) => route.fulfill({ json: f.useResult }));
  await f.open();
  await page.getByRole("button", { name: "Use template", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply template", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Synthetic recovery template · v1",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect((await dialog.boundingBox())?.width).toBe(640);
  const receipt = dialog.getByRole("region", {
    name: "Campaign template provenance",
  });
  await expect(receipt.locator("[data-category]")).toHaveCount(4);
  await expect(receipt).toContainText("No saved source available");
  const geometry = await receipt.evaluate((element) => {
    const category = element.querySelector('[data-category="inherited"]')!;
    const row = category.querySelector("dl > div")!;
    return {
      inset: getComputedStyle(element).paddingLeft,
      label: getComputedStyle(category.querySelector("h3")!).fontSize,
      rowFont: getComputedStyle(row).fontSize,
      radius: getComputedStyle(row).borderRadius,
      colors: [...element.querySelectorAll("[data-category]")].map(
        (section) =>
          getComputedStyle(section.querySelector("dl > div")!).backgroundColor,
      ),
    };
  });
  expect(geometry).toMatchObject({
    inset: "28px",
    label: "11px",
    rowFont: "13px",
    radius: "8px",
  });
  expect(geometry.colors[0]).toBe(geometry.colors[1]);
  expect(geometry.colors[0]).toBe(geometry.colors[3]);
  expect(geometry.colors[2]).not.toBe(geometry.colors[0]);
  const continueLink = dialog.getByRole("link", {
    name: "Continue to campaign",
    exact: true,
  });
  await expect(continueLink).toHaveAttribute(
    "href",
    `/modules/engagement?session=${id(5)}`,
  );
  expect(
    await continueLink.evaluate(
      (element) => getComputedStyle(element).textDecorationLine,
    ),
  ).toBe("none");
  await page.addScriptTag({ content: axe.source });
  const audit = await page.evaluate(() =>
    (window as unknown as { axe: typeof axe }).axe.run('[role="dialog"]'),
  );
  await info.attach("receipt-axe", {
    body: JSON.stringify(audit),
    contentType: "application/json",
  });
  expect(
    audit.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await dialog.screenshot({ path: info.outputPath("receipt-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await expect(continueLink).toBeVisible();
  await dialog.screenshot({ path: info.outputPath("receipt-narrow.png") });
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  const beforeReopen = f.calls.filter((c) => c.key === "provenance").length;
  await panel(page)
    .getByRole("button", { name: "View campaign receipt" })
    .click();
  await expect(dialog).toBeVisible();
  expect(f.calls.filter((c) => c.key === "provenance").length).toBeGreaterThan(
    beforeReopen,
  );
  expect(f.calls.filter((c) => c.key === "use")).toHaveLength(1);
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
