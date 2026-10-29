import { test, expect } from "@playwright/test";
import { otherId } from "../../tests/prospect-resources-fixtures";
import {
  richWorkspaceFixture,
  richBody,
  richDetail,
  richSource,
} from "./prospect-rich-workspace-fixture";

test("plain text explicitly gains rich formatting, link, lists, table, insert, undo/redo and local preview", async ({
  page,
}) => {
  const fixture = await richWorkspaceFixture(page, "Plain draft");
  await page.goto(richDetail);
  await expect(page.getByLabel("Body content")).toHaveValue("Plain draft");
  await page.getByRole("button", { name: "Format text", exact: true }).click();
  const body = await richBody(page);
  const toolbar = page.getByRole("group", { name: "Body formatting" });
  await body.fill("Deliberate rich text");
  await body.press("ControlOrMeta+a");
  for (const name of ["Bold", "Italic", "Underline"])
    await toolbar.getByRole("button", { name, exact: true }).click();
  await expect(body.locator("strong em u")).toHaveText("Deliberate rich text");
  await toolbar.getByRole("button", { name: "Link", exact: true }).click();
  await page
    .getByLabel("Website or email link")
    .fill("https://example.com/source");
  await page.getByRole("button", { name: "Apply link", exact: true }).click();
  await expect(body.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  await toolbar.getByText("Lists", { exact: true }).click();
  await toolbar
    .getByRole("button", { name: "Numbered list", exact: true })
    .click();
  await expect(body.locator("ol li")).toHaveCount(1);
  await toolbar
    .getByRole("button", { name: "Numbered list", exact: true })
    .click();
  await body.press("ControlOrMeta+End");
  await toolbar.getByText("Table", { exact: true }).click();
  await toolbar
    .getByRole("button", { name: "Insert table", exact: true })
    .click();
  await expect(body.locator("tr")).toHaveCount(3);
  await toolbar.getByRole("button", { name: "Add row", exact: true }).click();
  await expect(body.locator("tr")).toHaveCount(4);
  await toolbar.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body.locator("tr")).toHaveCount(3);
  await toolbar.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(body.locator("tr")).toHaveCount(4);
  await toolbar.getByText("+ Insert", { exact: true }).click();
  await toolbar.getByRole("button", { name: "Divider", exact: true }).click();
  await toolbar.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Deliberate rich text");
  await expect(page.getByRole("dialog").locator("table")).toHaveCount(1);
  expect(fixture.writes).toHaveLength(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
  expect(fixture.current().config.sectionContent.Body).toContain("<table>");
  expect(fixture.current().config.sectionContent.Body).toContain("<strong>");
  await page.reload();
  await expect((await richBody(page)).locator("table")).toHaveCount(1);
  expect(fixture.errors).toEqual([]);
});

test("opening and saving existing supported HTML preserves its exact native string", async ({
  page,
}) => {
  const fixture = await richWorkspaceFixture(page);
  await page.goto(richDetail);
  await expect((await richBody(page)).locator("strong")).toHaveText(
    "formatted",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  expect(fixture.current().config.sectionContent.Body).toBe(richSource);
  expect(fixture.writes.map((write) => write.operation)).toEqual(["save"]);
  expect(fixture.errors).toEqual([]);
});

test("unsupported stored markup needs review and no executable content reaches editor or preview", async ({
  page,
}) => {
  const original =
    '<p style="font-size: 24px">Retained original</p><img src="https://example.com/leak" onerror="window.bad=true"><script>window.bad=true</script>';
  const fixture = await richWorkspaceFixture(page, original);
  await page.goto(richDetail);
  const body = page.getByRole("textbox", { name: "Body content", exact: true });
  await expect(body).toHaveAttribute("contenteditable", "false");
  await expect(page.getByText(/saved source is unchanged/)).toBeVisible();
  await expect(body.locator("img,script")).toHaveCount(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  expect(fixture.current().config.sectionContent.Body).toBe(original);
  await page
    .getByRole("button", { name: "Edit supported content", exact: true })
    .click();
  await expect(body).toHaveAttribute("contenteditable", "true");
  await body.fill("Reviewed replacement");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(2);
  expect(fixture.current().config.sectionContent.Body).toBe(
    "<p>Reviewed replacement</p>",
  );
  expect(await page.evaluate(() => "bad" in window)).toBe(false);
  expect(fixture.errors).toEqual([]);
});

for (const phase of ["save"] as const)
  for (const lost of [false, true]) {
    test(`rich fields freeze through ${phase}; ${lost ? "lost receipt retains exact HTML" : "success preserves formatting"}`, async ({
      page,
    }) => {
      const fixture = await richWorkspaceFixture(page, richSource, phase, lost);
      await page.goto(richDetail);
      const body = await richBody(page);
      await body.fill("Retained rich intent");
      await body.press("ControlOrMeta+a");
      await body.press("ControlOrMeta+b");
      await expect(body.locator("strong")).toHaveText("Retained rich intent");
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await expect.poll(fixture.entered).toBe(true);
      await expect(page.getByLabel("Body content")).toHaveAttribute(
        "contenteditable",
        "false",
      );
      await expect(
        page.getByRole("button", { name: "Bold", exact: true }),
      ).toBeDisabled();
      fixture.release();
      if (lost) {
        await expect(
          page.getByText(/previous save is not confirmed/),
        ).toBeVisible();
        await page.reload();
        await expect((await richBody(page)).locator("strong")).toHaveText(
          "Retained rich intent",
        );
        await expect(
          page.getByRole("button", { name: "Save draft", exact: true }),
        ).toBeDisabled();
        const count = fixture.writes.length;
        await page
          .getByRole("button", { name: "Recover original save", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Save draft", exact: true }),
        ).toBeEnabled();
        expect(fixture.writes).toHaveLength(count + 1);
        await page
          .getByRole("button", { name: "Save draft", exact: true })
          .click();
        await expect.poll(() => fixture.writes.length).toBe(count + 2);
      }
      await expect(
        page.getByRole("button", { name: "Save draft", exact: true }),
      ).toBeEnabled();
      expect(fixture.current().config.sectionContent.Body).toBe(
        "<p><strong>Retained rich intent</strong></p>",
      );
      expect(fixture.errors).toEqual([]);
    });
  }

test("client replacement while a rich PATCH is held removes former content and prevents snapshot", async ({
  page,
}) => {
  const fixture = await richWorkspaceFixture(page, richSource, "save");
  await page.goto(richDetail);
  await richBody(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(fixture.entered).toBe(true);
  await page.route(`**/api/backend/core/clients/${otherId}`, (route) =>
    route.fulfill({
      status: 403,
      json: { error: "Replacement client denied" },
    }),
  );
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, `${richDetail}&clientId=${otherId}`);
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
  fixture.release();
  await expect.poll(fixture.routeSettled).toBe(true);
  await expect.poll(fixture.requestCompleted).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByLabel("Body content")).toHaveCount(0);
  expect(fixture.writes.map((write) => write.operation)).toEqual(["save"]);
});

test("rich editing is keyboard reachable and contained at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await richWorkspaceFixture(page);
  await page.goto(richDetail);
  const body = await richBody(page);
  await body.fill("Keyboard formatted text");
  await body.press("ControlOrMeta+a");
  await body.press("ControlOrMeta+b");
  await expect(body.locator("strong")).toContainText("Keyboard formatted text");
  await page.getByRole("button", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
