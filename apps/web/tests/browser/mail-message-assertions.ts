import { expect, type Page } from "@playwright/test";

/** Preserve exact plain-message expectations across textarea and paragraph editors. */
export async function expectMailMessage(page: Page, expected: string) {
  await expect
    .poll(() =>
      page.getByLabel("Message", { exact: true }).evaluate((element) => {
        if (element instanceof HTMLTextAreaElement) return element.value;
        return Array.from(
          element.children,
          (block) => block.textContent ?? "",
        ).join("\n");
      }),
    )
    .toBe(expected);
}
