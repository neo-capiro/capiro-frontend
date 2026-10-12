# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: focus-regression.spec.ts >> unknown folder save keeps settled Tab focus inside its modal
- Location: ../../tmp/capiro-successor-visual-review/focus-regression.spec.ts:3:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 1500ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
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
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
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
      - generic [ref=e14]:
        - alert [ref=e15]:
          - paragraph [ref=e16]: The service returned an unexpected response. Please retry or contact support.
        - paragraph [ref=e17]: The save outcome is unknown. Your draft is retained. Review the current file before deciding whether to save again.
        - button "Review current file" [ref=e18] [cursor=pointer]
      - button "Create folder & move file" [disabled] [ref=e19]
```

# Test source

```ts
  1  | import { test, expect } from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
  2  | import { installFixtures, json, file, clientId } from '/workspace/capiro-p1-successor/apps/web/tests/browser/fixtures';
  3  | test('unknown folder save keeps settled Tab focus inside its modal', async ({ page }, info) => {
  4  |   await page.setViewportSize({ width: 1440, height: 1040 });
  5  |   const unexpected = await installFixtures(page);
  6  |   await page.route('**/engagement/attachments?**', route => json(route, [file]));
  7  |   await page.route(`**/files/${file.id}/folder`, route => json(route, file));
  8  |   await page.goto(`/portfolio/${clientId}/files`);
  9  |   await page.getByRole('checkbox', { name: `Select ${file.fileName}` }).check();
  10 |   await page.getByRole('button', { name: 'New folder', exact: true }).click();
  11 |   const dialog = page.getByRole('dialog', { name: 'New folder', exact: true });
  12 |   await dialog.getByLabel('Folder name').fill('Reviewed destination');
  13 |   await dialog.getByRole('button', { name: 'Create folder & move file' }).click();
  14 |   await expect(dialog.getByText(/save outcome is unknown/)).toBeVisible();
  15 |   await expect(dialog.getByRole('button', { name: 'Create folder & move file' })).toBeDisabled();
  16 |   await page.keyboard.press('Tab');
  17 |   try {
> 18 |     await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)), { timeout: 1500 }).toBe(true);
     |                                                                                                            ^ Error: expect(received).toBe(expected) // Object.is equality
  19 |     await page.keyboard.press('Shift+Tab');
  20 |     await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)), { timeout: 1500 }).toBe(true);
  21 |   } finally {
  22 |     await info.attach('settled-focus', { body: JSON.stringify(await page.evaluate(() => ({
  23 |       tag: document.activeElement?.tagName,
  24 |       text: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 120),
  25 |       documentHasFocus: document.hasFocus(),
  26 |       inDialog: Boolean(document.activeElement?.closest('[role=dialog]')),
  27 |     })), null, 2), contentType: 'application/json' });
  28 |   }
  29 |   expect(unexpected).toEqual([]);
  30 | });
  31 | 
```