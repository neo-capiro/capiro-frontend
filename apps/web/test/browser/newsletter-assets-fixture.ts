import { expect, type Page, type Route, type TestInfo } from "@playwright/test";
import { createRequire } from "node:module";
import {
  documentFixture,
  enterEditor,
  adoptDocument,
  button,
} from "./newsletter-document-fixtures";

export const assetId = "10000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const secondId = "20000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const asset = (id = assetId, name = "Synthetic policy image") => ({
  id,
  name,
  mimeType: "image/png" as const,
  url: `https://assets.example.test/workspace-api/newsletters/assets/file/${id === assetId ? "a".repeat(64) : "b".repeat(64)}`,
});
export const assetDetails = (id = assetId) => ({
  ...asset(id),
  createdAt: "2026-10-26T09:00:00.000Z",
  sizeBytes: 2345,
  revisionNumber: 2,
  currentRevision: true,
});
export const originalUrl = "https://manual.example.test/original.png";
type Operation = "list" | "detail" | "upload";
export async function assetFixture(page: Page) {
  const document = await documentFixture(page);
  const logo = document.control.current.design.sections[0]!.blocks[0]!;
  logo.imageUrl = originalUrl;
  logo.alt = "Preserved manual alt";
  document.control.current.design.sections[0]!.blocks.push({
    ...structuredClone(logo),
    kind: "image",
    id: "synthetic-second-block",
    text: "",
  });
  const requests: {
    operation: Operation;
    method: string;
    input: Record<string, unknown>;
  }[] = [];
  const queued = new Map<Operation, ((route: Route) => Promise<void>)[]>();
  await page.route(
    "**/api/capiro/workspace.richNewsletter.assetFolders.list?*",
    (route) => route.fulfill({ json: { items: [] } }),
  );
  await page.route(
    "**/api/capiro/workspace.richNewsletter.assets.*",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const operation = url.pathname.split(".").pop() as Operation;
      const input =
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : {
              multipart: request
                .headers()
                ["content-type"]?.startsWith("multipart/form-data;"),
            };
      requests.push({ operation, method: request.method(), input });
      const override = queued.get(operation)?.shift();
      if (override) return override(route);
      if (operation === "upload") return route.fulfill({ json: asset() });
      if (operation === "detail")
        return route.fulfill({ json: assetDetails(input.params.id) });
      return route.fulfill({
        json: {
          page: input.query.page,
          pageSize: input.query.pageSize,
          total: 51,
          items:
            input.query.page === 1
              ? [asset()]
              : [asset(secondId, "Synthetic page two image")],
        },
      });
    },
  );
  return {
    document,
    requests,
    calls: (operation: Operation) =>
      requests.filter((request) => request.operation === operation),
    queue: (operation: Operation, response: (route: Route) => Promise<void>) =>
      queued.set(operation, [...(queued.get(operation) ?? []), response]),
  };
}
export async function openImagePicker(page: Page, kind = "Logo") {
  await enterEditor(page);
  await adoptDocument(page);
  await page
    .getByRole("navigation", { name: "Newsletter structure" })
    .getByRole("button", { name: new RegExp(`^${kind}( ·|$)`) })
    .click();
  await button(page, "Replace from image library").click();
  await expect(
    page.getByRole("heading", { name: "Your image library", exact: true }),
  ).toBeVisible();
}
export async function chooseDetails(
  page: Page,
  name = "Synthetic policy image",
) {
  await button(page, `Select ${name}`).click();
  await button(page, "View Details").click();
}

export async function auditDialog(page: Page, info: TestInfo, name: string) {
  await page.getByRole("dialog").evaluate(async (dialog) => {
    await Promise.all(
      dialog
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const require = createRequire(import.meta.url);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (scope: Element) => Promise<{
            violations: unknown[];
            incomplete: {
              id: string;
              nodes: {
                html: string;
                any: { data: { messageKey?: string } | null }[];
              }[];
            }[];
          }>;
        };
      }
    ).axe;
    return axe.run(document.querySelector('[role="dialog"]')!);
  });
  await info.attach(name, {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  expect(result.violations).toEqual([]);
  // Preserve axe's manual-review results for the unchanged shared primitives:
  // the labelled × icon and a white-on-dark gradient primary button. Assert the
  // precise reasons and rendered styles; any other incomplete result fails.
  for (const finding of result.incomplete) {
    if (finding.id === "label-content-name-mismatch") {
      expect(finding.nodes.map((node) => node.html)).toEqual([
        expect.stringContaining('aria-label="Close dialog"'),
      ]);
    } else {
      expect(finding.id).toBe("color-contrast");
      for (const node of finding.nodes) {
        const reasons = node.any.map((check) => check.data?.messageKey);
        if (reasons[0] === "elmPartiallyObscuring") {
          expect(reasons).toEqual(["elmPartiallyObscuring"]);
          expect(node.html).toContain('data-slot="dialog-description"');
          const readability = await descriptionReadability(page);
          await info.attach(`${name}-description-readability`, {
            body: JSON.stringify(readability),
            contentType: "application/json",
          });
          expect(readability.obscured).toEqual([]);
          expect(readability.background).toBe("rgb(255, 255, 255)");
          expect(readability.contrast).toBeGreaterThanOrEqual(4.5);
        } else {
          expect(reasons).toEqual(["bgGradient"]);
          const primary = page.locator(
            '[role="dialog"] button.bg-primary:not(:disabled)',
          );
          await expect(primary).toHaveCount(1);
          await expect(primary).toHaveCSS("color", "rgb(255, 255, 255)");
          await expect(primary).toHaveCSS(
            "background-image",
            "linear-gradient(175deg, rgb(36, 36, 36), rgb(10, 10, 10))",
          );
          // The lightest gradient stop has 15.52:1 contrast against white.
        }
      }
    }
  }
  await expect(
    page.getByRole("button", { name: "Close dialog", exact: true }),
  ).toHaveText("×");
}

/** Resolve the narrow-description manual-review result against actual glyph hit testing. */
async function descriptionReadability(page: Page) {
  return page
    .locator('[role="dialog"] [data-slot="dialog-description"]')
    .evaluate((description) => {
      const text = description.firstChild!;
      const obscured: { character: string; covering: string | null }[] = [];
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
        if (!description.contains(covering))
          obscured.push({
            character,
            covering: covering?.outerHTML.slice(0, 180) ?? null,
          });
      }
      const color = getComputedStyle(description).color;
      const channels = color
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => value / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      const luminance =
        0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
      return {
        color,
        background: getComputedStyle(description.closest("header")!)
          .backgroundColor,
        contrast: 1.05 / (luminance + 0.05),
        obscured,
      };
    });
}
