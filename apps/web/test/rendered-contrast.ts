import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import type { AxeResults } from "axe-core";

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  if (
    !channels ||
    channels.length < 3 ||
    (channels[3] !== undefined && channels[3] !== 1)
  )
    throw new Error(`Expected opaque computed RGB: ${color}`);
  const linear = channels.slice(0, 3).map((value) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

/** Bounds opaque grayscale gradients using actual rendered ancestor/compositing data.
 * Unsupported effects fail for manual review; they never silently receive a pass. */
export async function expectRenderedContrast(
  target: Locator,
  info: TestInfo,
  label: string,
) {
  await expect(target).toBeVisible();
  const evidence = await target.evaluate((element) => {
    const css = getComputedStyle(element);
    const ancestors = [];
    let node: Element | null = element;
    while (node) {
      const style = getComputedStyle(node);
      ancestors.push({
        tag: node.tagName,
        background: style.backgroundColor,
        image: style.backgroundImage,
        opacity: style.opacity,
        filter: style.filter,
        backdropFilter: style.backdropFilter,
        mixBlendMode: style.mixBlendMode,
      });
      node = node.parentElement;
    }
    return {
      text:
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLInputElement
          ? element.value
          : element.textContent,
      foreground: css.color,
      fontSize: css.fontSize,
      fontWeight: css.fontWeight,
      ancestors,
    };
  });
  const blockers: string[] = [];
  for (const ancestor of evidence.ancestors) {
    if (
      ancestor.opacity !== "1" ||
      ancestor.filter !== "none" ||
      ancestor.backdropFilter !== "none" ||
      ancestor.mixBlendMode !== "normal"
    )
      blockers.push(`Unsupported compositing: ${JSON.stringify(ancestor)}`);
  }
  let backgrounds: string[] | undefined;
  for (const ancestor of evidence.ancestors) {
    if (ancestor.image !== "none") {
      const stops = ancestor.image.match(/rgba?\([^)]+\)/g);
      if (
        !ancestor.image.startsWith("linear-gradient(") ||
        !stops ||
        stops.length !== 2
      )
        blockers.push(`Unsupported image: ${ancestor.image}`);
      else {
        backgrounds = stops;
        for (const stop of stops) {
          const channels = stop.match(/[\d.]+/g)!.map(Number);
          if (
            channels[0] !== channels[1] ||
            channels[1] !== channels[2] ||
            (channels[3] !== undefined && channels[3] !== 1)
          )
            blockers.push(`Nonopaque or nongrayscale gradient: ${stop}`);
        }
      }
      break;
    }
    if (
      ancestor.background !== "rgba(0, 0, 0, 0)" &&
      ancestor.background !== "transparent"
    ) {
      backgrounds = [ancestor.background];
      break;
    }
  }
  const foreground = luminance(evidence.foreground);
  const values = backgrounds?.map(luminance) ?? [];
  const contrasts = values.map(
    (background) =>
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05),
  );
  if (
    values.length === 2 &&
    foreground >= Math.min(...values) &&
    foreground <= Math.max(...values)
  )
    contrasts.push(1);
  await info.attach(`rendered-contrast-${label}`, {
    body: JSON.stringify(
      { ...evidence, backgrounds, contrasts, blockers },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(blockers).toEqual([]);
  expect(backgrounds?.length).toBeGreaterThan(0);
  expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
}

/** Preserve axe's incomplete report and separately resolve its rendered bounds. */
export async function expectGradientIncompletes(
  page: Page,
  info: TestInfo,
  incomplete: AxeResults["incomplete"],
) {
  for (const rule of incomplete) {
    expect(rule.id).toBe("color-contrast");
    for (const [index, node] of rule.nodes.entries()) {
      expect(node.target).toHaveLength(1);
      const selector = node.target[0];
      if (typeof selector !== "string")
        throw new Error(
          "Nested contrast target requires separate rendered review",
        );
      await expectRenderedContrast(
        page.locator(selector),
        info,
        `axe-incomplete-${index}`,
      );
    }
  }
}
