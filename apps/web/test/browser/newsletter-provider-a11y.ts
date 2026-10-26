import { expect, type Page, type TestInfo } from "@playwright/test";
import { auditDialog as auditSharedDialog } from "./newsletter-assets-fixture";

// Axe 4.14 compares layers behind an opaque modal when text spans more
// than one text rect. Preserve its result and prove every glyph is unobscured
// on a solid white surface; never suppress violations or other incomplete types.
export async function auditDialog(page: Page, info: TestInfo, name: string) {
  await auditSharedDialog(page, info, name, async (html) => {
    const textElements = page.getByRole("dialog").locator("p, output");
    const matching = await textElements.evaluateAll(
      (nodes, expected) =>
        nodes.flatMap((node, index) =>
          node.outerHTML === expected ? [index] : [],
        ),
      html,
    );
    expect(matching).toHaveLength(1);
    const proof = await textElements.nth(matching[0]!).evaluate((paragraph) => {
      const obscured: string[] = [];
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        for (let index = 0; index < text.textContent!.length; index++) {
          const character = text.textContent![index]!;
          if (!character.trim()) continue;
          const range = document.createRange();
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          const box = range.getBoundingClientRect();
          const covering = document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          );
          if (!paragraph.contains(covering)) obscured.push(character);
        }
      }
      const surfaces = Array.from(paragraph.querySelectorAll("*")).map(
        (node) => {
          const style = getComputedStyle(node);
          return {
            background: style.backgroundColor,
            image: style.backgroundImage,
            opacity: style.opacity,
          };
        },
      );
      for (
        let node: Element | null = paragraph;
        node;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        surfaces.push({
          background: style.backgroundColor,
          image: style.backgroundImage,
          opacity: style.opacity,
        });
        if (style.backgroundColor === "rgb(255, 255, 255)") break;
      }
      const inks = [paragraph, ...paragraph.querySelectorAll("*")].map(
        (node) => {
          const color = getComputedStyle(node).color;
          const channels = color.match(/[\d.]+/g)!.map(Number);
          const linear = channels
            .slice(0, 3)
            .map((value) => value / 255)
            .map((value) =>
              value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4,
            );
          const luminance =
            0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
          return {
            color,
            alpha: channels[3] ?? 1,
            contrast: 1.05 / (luminance + 0.05),
          };
        },
      );
      return {
        html: paragraph.outerHTML,
        obscured,
        surfaces,
        inks,
      };
    });
    await info.attach(`${name}-text-readability`, {
      body: JSON.stringify(proof),
      contentType: "application/json",
    });
    expect(proof.obscured).toEqual([]);
    expect(proof.surfaces.at(-1)?.background).toBe("rgb(255, 255, 255)");
    for (const surface of proof.surfaces) {
      expect(surface.image).toBe("none");
      expect(surface.opacity).toBe("1");
      expect(["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"]).toContain(
        surface.background,
      );
    }
    for (const ink of proof.inks) {
      expect(ink.alpha).toBe(1);
      expect(ink.contrast).toBeGreaterThanOrEqual(4.5);
    }
  });
}
