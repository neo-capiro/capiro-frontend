import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { clientId, prospectId } from "./fixtures";
import { qaFixtures } from "./portfolio-qa-fixtures";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

for (const surface of ["overview", "prospect"] as const) {
  test(`${surface} visible labels match accessible control names`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const unexpected = await qaFixtures(page);
    await page.goto(
      surface === "overview"
        ? `/portfolio/${clientId}`
        : `/portfolio/prospects/${prospectId}`,
    );
    const control = page.getByRole("button", {
      name:
        surface === "overview" ? /Government & federal profile/i : /^Stage:/,
    });
    await expect(control).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
      const result = await axe.run(document.querySelector("main")!, {
        runOnly: ["label-content-name-mismatch"],
      });
      return result.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => node.html),
      }));
    });
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`${surface}-labels-desktop.png`),
      animations: "disabled",
    });
  });
}
