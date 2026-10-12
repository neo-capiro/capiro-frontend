# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dialog-disabled-focus.spec.ts >> disabled field keeps pending and unknown dialog focus at 360px
- Location: apps/web/tests/browser/dialog-disabled-focus.spec.ts:22:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - button:
        - img
      - link:
        - /url: /
        - img
      - generic:
        - button
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Files
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - heading [level=1]: Client files
              - generic:
                - button: New folder
                - button: Upload
                - button [disabled]: Create with Meri
            - generic:
              - textbox:
                - /placeholder: Search files
              - combobox
              - combobox
            - generic:
              - complementary:
                - generic:
                  - generic: Folders
                  - button [disabled]: Access
                - button [pressed]: Test Aerospace · 1
                - button:
                  - text: Reports
                  - generic: "1"
                - button:
                  - text: Unfiled
                  - generic: "0"
                - separator
                - generic: Visible file storage
                - paragraph: 0.0 MiB
                - generic: Storage quota is not provided by this service. Only accessible current attachments are counted.
              - generic:
                - generic:
                  - generic: 1 files · 1 selected
                  - button: Move to folder
                - generic:
                  - table:
                    - rowgroup:
                      - row:
                        - columnheader:
                          - checkbox [checked]
                        - columnheader: Name
                        - columnheader: Linked to / location
                        - columnheader: Created
                        - columnheader: Owner
                        - columnheader: Status
                        - columnheader:
                          - generic: Actions
                    - rowgroup:
                      - row:
                        - cell:
                          - checkbox [checked]
                        - cell:
                          - button:
                            - generic: pdf
                            - text: Test report.pdf
                          - generic: manual
                        - cell: Reports
                        - cell: 10/1/2026
                        - cell: Test user
                        - cell:
                          - generic: scan_pending
                        - cell:
                          - button: ⋯
  - dialog "New folder" [ref=e2]:
    - banner [ref=e3]:
      - heading "New folder" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: File organization for Test report.pdf.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Folder name
        - textbox "Folder name" [disabled] [ref=e12]: Reviewed destination
      - paragraph [ref=e13]: Folders are shared labels on files. No physical copy is created. Empty folders are not persisted.
      - button "Create folder & move file" [disabled] [ref=e14]
```

# Test source

```ts
  1  | import { expect, test, type Locator, type Page } from "@playwright/test";
  2  | import { clientId, file, installFixtures, json } from "./fixtures";
  3  | 
  4  | async function expectContainedFocus(page: Page, dialog: Locator) {
  5  |   await expect
  6  |     .poll(() =>
  7  |       dialog.evaluate((node) => node.contains(document.activeElement)),
  8  |     )
> 9  |     .toBe(true);
     |      ^ Error: expect(received).toBe(expected) // Object.is equality
  10 |   for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
  11 |     await page.keyboard.press(key);
  12 |     await expect
  13 |       .poll(() =>
  14 |         dialog.evaluate((node) => node.contains(document.activeElement)),
  15 |       )
  16 |       .toBe(true);
  17 |   }
  18 | }
  19 | 
  20 | for (const width of [360, 1440]) {
  21 |   for (const submit of ["button", "field"] as const) {
  22 |     test(`disabled ${submit} keeps pending and unknown dialog focus at ${width}px`, async ({
  23 |       page,
  24 |     }) => {
  25 |       await page.setViewportSize({ width, height: 1040 });
  26 |       const unexpected = await installFixtures(page);
  27 |       let release = () => {};
  28 |       const held = new Promise<void>((resolve) => (release = resolve));
  29 |       let writes = 0;
  30 |       await page.route("**/engagement/attachments?**", (route) =>
  31 |         json(route, [file]),
  32 |       );
  33 |       await page.route(`**/files/${file.id}/folder`, async (route) => {
  34 |         writes++;
  35 |         await held;
  36 |         return json(route, file);
  37 |       });
  38 |       await page.goto(`/portfolio/${clientId}/files`);
  39 |       await page
  40 |         .getByRole("checkbox", { name: `Select ${file.fileName}` })
  41 |         .check();
  42 |       const trigger = page.getByRole("button", {
  43 |         name: "New folder",
  44 |         exact: true,
  45 |       });
  46 |       await trigger.click();
  47 |       const dialog = page.getByRole("dialog", {
  48 |         name: "New folder",
  49 |         exact: true,
  50 |       });
  51 |       const field = dialog.getByLabel("Folder name");
  52 |       await field.fill("Reviewed destination");
  53 |       const save = dialog.getByRole("button", {
  54 |         name: "Create folder & move file",
  55 |       });
  56 |       if (submit === "button") await save.click();
  57 |       else await field.press("Enter");
  58 |       await expect.poll(() => writes).toBe(1);
  59 |       await expect(save).toBeDisabled();
  60 |       await expectContainedFocus(page, dialog);
  61 |       release();
  62 |       await expect(dialog.getByText(/save outcome is unknown/)).toBeVisible();
  63 |       await expectContainedFocus(page, dialog);
  64 |       await page.keyboard.press("Escape");
  65 |       await expect(dialog).toHaveCount(0);
  66 |       await expect(trigger).toBeFocused();
  67 |       expect(writes).toBe(1);
  68 |       expect(unexpected).toEqual([]);
  69 |     });
  70 |   }
  71 | }
  72 | 
```