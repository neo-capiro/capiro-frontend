import { expect, type Page, type TestInfo } from "@playwright/test";
import axe from "axe-core";

export async function expectAccessibleHome(page: Page, testInfo: TestInfo) {
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(() =>
    (window as unknown as Window & { axe: typeof axe }).axe.run(document),
  );
  await testInfo.attach("axe-full-default-results", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(
    result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
