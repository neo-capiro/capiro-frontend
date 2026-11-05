import { expect, test } from "@playwright/test";
import { setupOutreachVisual } from "./outreach-visual-fixtures";
import { outreachVisualFrames } from "./outreach-visual-data";

// One page and the existing harness server. QA runs this only in its allocated visual unit.
test("Outreach visual frame route bindings", async ({ page }, info) => {
  test.setTimeout(720_000);
  const observed = await setupOutreachVisual(page);
  const ready: Record<string, string> = {
    campaigns: "Synthetic staff briefing",
    direction: "On behalf of a client",
    "campaign-setup": "Synthetic meeting request",
    recipients: "Synthetic staff contact",
    "context-plan": "What should this campaign accomplish?",
    "context-builder": "Synthetic district briefing",
    "generate-review": "Request for a district briefing",
    send: "Request for a district briefing",
    "existing-draft": "Outreach draft",
    saved: "Draft saved.",
    filters: "Filter outreach",
    "mobile-review": "Request for a district briefing",
  };
  await page.setViewportSize({ width: 1440, height: 1040 });
  for (const frame of outreachVisualFrames) {
    if ("width" in frame)
      await page.setViewportSize({ width: frame.width, height: 844 });
    await page.goto(frame.route);
    if ("action" in frame)
      await page
        .getByRole("button", { name: frame.action, exact: true })
        .click();
    await expect(
      page.getByText(ready[frame.name]!, { exact: true }).first(),
    ).toBeVisible();
    if (frame.name === "saved")
      await page
        .getByText("Draft saved.", { exact: true })
        .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(
        frame.node.replace(":", "-") + "-" + frame.name + ".png",
      ),
      fullPage: false,
    });
  }
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});
