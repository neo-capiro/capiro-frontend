import { test, expect } from "@playwright/test";
import { installAdvocacyHistory } from "./advocacy-history-fixtures";

for (const { name, viewport } of [
  { name: "desktop", viewport: { width: 1440, height: 1040 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
]) {
  test(`dark ${name} timeline keeps loaded Figma icons legible at their exact geometry`, async ({
    page,
  }, info) => {
    const { state, unexpected } = await installAdvocacyHistory(page);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/advocacy-history.html");
    const history = page.getByRole("region", {
      name: "Advocacy history",
      exact: true,
    });
    const events = history.getByRole("list", {
      name: "Loaded advocacy events",
    });
    await expect(events.getByRole("listitem")).toHaveCount(5);
    const icons = events.locator("img");
    await expect
      .poll(() =>
        icons.evaluateAll((nodes) =>
          nodes.every((node) => {
            const image = node as HTMLImageElement;
            return image.complete && image.naturalWidth === 16;
          }),
        ),
      )
      .toBe(true);
    const samples = await icons.evaluateAll((nodes) => {
      const luminance = (red: number, green: number, blue: number) => {
        const linear = [red, green, blue].map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        });
        return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
      };
      return nodes.map((node) => {
        const image = node as HTMLImageElement;
        const marker = image.parentElement!.parentElement!;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Icon contrast context is unavailable.");
        context.fillStyle = getComputedStyle(marker).backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        const background = context.getImageData(0, 0, 1, 1).data;
        const dark = luminance(background[0]!, background[1]!, background[2]!);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.filter = getComputedStyle(image).filter;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let minimumContrast = Infinity;
        let opaquePixels = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3]! < 250) continue;
          opaquePixels++;
          const stroke = luminance(
            pixels[offset]!,
            pixels[offset + 1]!,
            pixels[offset + 2]!,
          );
          minimumContrast = Math.min(
            minimumContrast,
            (Math.max(stroke, dark) + 0.05) / (Math.min(stroke, dark) + 0.05),
          );
        }
        const bounds = image.getBoundingClientRect();
        return {
          natural: [image.naturalWidth, image.naturalHeight],
          rendered: [bounds.width, bounds.height],
          markerWidth: marker.getBoundingClientRect().width,
          opaqueBackground: background[3] === 255,
          backgroundLuminance: dark,
          opaquePixels,
          minimumContrast,
        };
      });
    });
    expect(samples).toHaveLength(5);
    for (const sample of samples) {
      expect(sample.natural).toEqual([16, 16]);
      expect(sample.rendered).toEqual([14, 14]);
      expect(sample.markerWidth).toBe(28);
      expect(sample.opaqueBackground).toBe(true);
      expect(sample.backgroundLuminance).toBeLessThan(0.1);
      expect(sample.opaquePixels).toBeGreaterThan(0);
      expect(sample.minimumContrast).toBeGreaterThanOrEqual(3);
    }
    await expect(history).toHaveCSS("padding", "20px");
    await expect(history).toHaveCSS("border-radius", "12px");
    expect(
      await history.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath(`advocacy-timeline-${name}-dark.png`),
      fullPage: true,
    });
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
