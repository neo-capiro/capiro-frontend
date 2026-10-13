# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: newsletter-rich-history.spec.ts >> typing after Undo retains editor focus and the complete new branch
- Location: apps/web/test/browser/newsletter-rich-history.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('textbox', { name: 'Block rich text' })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('textbox', { name: 'Block rich text' })
    14 × locator resolved to <div tabindex="0" role="textbox" translate="no" aria-multiline="true" contenteditable="true" aria-label="Block rich text" class="tiptap ProseMirror _richText_yhqge_92">…</div>
       - unexpected value "inactive"

```

```yaml
- textbox "Block rich text":
  - paragraph: This week in policy
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  3  | import { moduleRouteFixtures } from "./module-route-fixtures";
  4  | 
  5  | test("typing after Undo retains editor focus and the complete new branch", async ({ page }) => {
  6  |   await onlyLocalRequests(page);
  7  |   await operationFixtures(page, moduleRouteFixtures);
  8  |   await page.goto("/modules/workspace?view=rich-newsletter");
  9  |   await page.getByRole("button", { name: /^Heading · This week in policy/ }).click();
  10 |   const editor = page.getByRole("textbox", { name: "Block rich text" });
  11 |   await editor.fill("First local edit");
  12 |   await page.getByRole("button", { name: "Undo", exact: true }).click();
  13 |   await editor.click();
  14 |   await editor.press("Control+End");
  15 |   await editor.pressSequentially(" branch");
> 16 |   await expect(editor).toBeFocused();
     |                        ^ Error: expect(locator).toBeFocused() failed
  17 |   await expect(editor).toHaveText("This week in policy branch");
  18 |   await expect(page.getByRole("button", { name: "Redo", exact: true })).toBeDisabled();
  19 | });
  20 | 
```