import { test, expect } from "@playwright/test";
import axe from "axe-core";
import {
  tabTo,
  expectFocusEvidence,
  observeHomeIsolation,
} from "../accessibility-interaction";
import {
  copyWorkflowFixture,
  copiedTabUrl,
} from "./workspace-brief-copy-fixture";

for (const width of [1440, 390])
  test(`copied rich section keeps keyboard controls, layout and accessibility at ${width}px`, async ({
    page,
  }, info) => {
    const fixture = await copyWorkflowFixture(page);
    const assertIsolation = await observeHomeIsolation(page, info);
    fixture.replaceBody(
      "<p>Synthetic <strong>saved rich section</strong>.</p>",
    );
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.goto(copiedTabUrl);
    const editor = page.getByRole("textbox", {
      name: "Original Core section content",
      exact: true,
    });
    await expect(editor).toHaveAttribute("contenteditable", "true");
    await expect(editor.locator("strong")).toHaveText("saved rich section");
    const name = page.getByLabel("Copied tab name", { exact: true });
    await tabTo(page, name);
    await expectFocusEvidence(name, info);
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Keyboard reviewed copy");
    await editor.fill("Keyboard formatted copy");
    await editor.press("ControlOrMeta+a");
    const bold = page
      .getByRole("group", {
        name: "Original Core section formatting",
        exact: true,
      })
      .getByRole("button", { name: "Bold", exact: true });
    await tabTo(page, bold);
    await expectFocusEvidence(bold, info);
    await page.keyboard.press("Enter");
    await expect(editor.locator("strong")).toHaveText(
      "Keyboard formatted copy",
    );
    expect(fixture.writes).toHaveLength(0);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.addScriptTag({ content: axe.source });
    const audit = await page.evaluate(() =>
      (window as unknown as Window & { axe: typeof axe }).axe.run(document),
    );
    await info.attach("copied-workspace-full-default-axe", {
      body: JSON.stringify(audit, null, 2),
      contentType: "application/json",
    });
    expect(
      audit.violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      ),
    ).toEqual([]);
    await info.attach("copied-workspace-rich-desktop-or-phone", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    const save = page.getByRole("button", {
      name: "Save copied tab",
      exact: true,
    });
    await tabTo(page, save);
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Saved Workspace version/)).toBeVisible();
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0]!.input.body.name).toBe("Keyboard reviewed copy");
    expect(fixture.writes[0]!.input.body.body.blocks[0]!.content).toContain(
      "<strong>Keyboard formatted copy</strong>",
    );
    expect(fixture.coreWrites).toEqual([]);
    assertIsolation();
  });
