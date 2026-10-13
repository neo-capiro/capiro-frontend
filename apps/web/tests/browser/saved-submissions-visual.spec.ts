import { expect, test } from "@playwright/test";
import { installRemoval } from "./overview-removal-fixtures";
import { settleSubmissions } from "./saved-submissions-fixtures";

for (const viewport of [
  {
    name: "desktop",
    width: 1440,
    height: 1040,
    section: 1024,
    cardHeight: 277,
  },
  { name: "phone", width: 390, height: 844, section: 358, cardHeight: 385 },
] as const) {
  test(`the ${viewport.name} Saved submissions section fits its authored Figma layout`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const { state, unexpected } = await installRemoval(page);
    state.history[0] = {
      ...state.history[0]!,
      title: "Defense appropriations request",
      meta: "Defense capability submission",
      notes: "",
    };
    await page.setViewportSize(viewport);
    await page.goto("/saved-submissions.html");
    const section = page.getByRole("region", { name: "Past performance" });
    await expect(
      section.getByRole("heading", { name: "Saved submissions", exact: true }),
    ).toBeVisible();
    await expect(section).toContainText("Defense appropriations request");
    await settleSubmissions(page);
    const box = await section.boundingBox();
    expect(box?.width).toBe(viewport.section);
    expect(Math.abs(box!.height - viewport.cardHeight)).toBeLessThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    const controls = section.getByRole("button");
    const refresh = section.getByRole("button", { name: "Refresh history" });
    const remove = section.getByRole("button", { name: /^Remove submission:/ });
    const controlStyles = await Promise.all(
      [refresh, remove].map((control) =>
        control.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            borderWidth: style.borderTopWidth,
            borderColor: style.borderTopColor,
            background: style.backgroundColor,
            shadow: style.boxShadow,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
          };
        }),
      ),
    );
    expect(controlStyles[0]).toMatchObject({
      borderWidth: "1px",
      borderColor: "rgb(231, 229, 228)",
      background: "rgb(255, 255, 255)",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "16.8px",
    });
    expect(controlStyles[0]!.shadow).not.toBe("none");
    expect(controlStyles[1]).toMatchObject({
      borderWidth: "0px",
      background: "rgba(0, 0, 0, 0)",
      shadow: "none",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "16.8px",
    });
    for (const control of await controls.all()) {
      const bounds = await control.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(36);
      expect(bounds!.x).toBeGreaterThanOrEqual(box!.x);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
        box!.x + box!.width,
      );
    }
    await section.screenshot({
      path: testInfo.outputPath(`saved-submissions-${viewport.name}.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`saved-submissions-${viewport.name}-page.png`),
      fullPage: true,
    });
    await testInfo.attach("saved-submissions-geometry", {
      body: JSON.stringify({ viewport, box, controlStyles }, null, 2),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
