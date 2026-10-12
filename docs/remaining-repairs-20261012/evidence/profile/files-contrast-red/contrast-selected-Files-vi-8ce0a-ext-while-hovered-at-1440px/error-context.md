# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contrast.spec.ts >> selected Files view keeps readable text while hovered at 1440px
- Location: apps/web/tests/browser/files-view-contrast.spec.ts:5:7

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 4.5
Received:    1.1491398126989472
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - separator [ref=e28]
      - paragraph [ref=e29]: Test Aerospace
      - navigation "Client" [ref=e30]:
        - link "Overview" [ref=e31] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e32]: Overview
        - link "Objectives" [ref=e33] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
          - generic [ref=e34]: Objectives
        - link "Calendar" [ref=e35] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
          - generic [ref=e36]: Calendar
        - link "Relationships" [ref=e37] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
          - generic [ref=e38]: Relationships
        - link "Work" [ref=e39] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
          - generic [ref=e40]: Work
        - link "Capabilities" [ref=e41] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
          - generic [ref=e42]: Capabilities
        - link "Bill Tracker" [ref=e43] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
          - generic [ref=e44]: Bill Tracker
        - link "Opportunities" [ref=e45] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
          - generic [ref=e46]: Opportunities
        - link "Files" [ref=e47] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
          - generic [ref=e48]: Files
      - link "Settings" [ref=e50] [cursor=pointer]:
        - /url: /settings
    - main [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]:
          - navigation "Breadcrumb" [ref=e54]:
            - link "Back to Portfolio" [ref=e55] [cursor=pointer]:
              - /url: /portfolio
            - link "Portfolio" [ref=e56] [cursor=pointer]:
              - /url: /portfolio
            - generic [ref=e57]: /
            - link "Test Aerospace" [ref=e58] [cursor=pointer]:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic [ref=e59]: /
            - 'button "Switch client view: Files" [ref=e60] [cursor=pointer]': Files
          - generic [ref=e61]:
            - button "Quick add" [ref=e62] [cursor=pointer]:
              - generic [ref=e63]: Quick add
            - button "Meri actions" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: Meri actions
            - button "More actions for Test Aerospace" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
        - region "Client identity" [ref=e71]:
          - generic [ref=e72]: TA
          - generic [ref=e73]:
            - strong [ref=e74]: Test Aerospace
            - paragraph [ref=e75]: Aerospace
          - generic [ref=e76]: active client
      - generic [ref=e78]:
        - generic [ref=e79]:
          - heading "Client files" [level=1] [ref=e80]
          - generic [ref=e81]:
            - button "New folder" [disabled] [ref=e82]
            - button "Upload" [ref=e83] [cursor=pointer]
            - button "Create with Meri" [disabled] [ref=e84]
        - generic [ref=e85]:
          - textbox "Search files" [ref=e86]:
            - /placeholder: Search files…
          - group "File source" [ref=e87]:
            - button "All" [pressed] [ref=e88] [cursor=pointer]
            - button "manual" [ref=e89] [cursor=pointer]
          - generic [ref=e90]:
            - text: Sort by
            - combobox "Sort files" [ref=e91]:
              - option "Created · newest" [selected]
              - option "Name"
        - group "File view" [ref=e92]:
          - button "Folders" [active] [pressed] [ref=e93] [cursor=pointer]
          - button "All files" [ref=e94] [cursor=pointer]
        - generic [ref=e95]:
          - complementary [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: Folders
              - button "Access" [disabled] [ref=e99]
            - button "Test Aerospace · 2" [pressed] [ref=e100] [cursor=pointer]
            - button "Reports 1" [ref=e101] [cursor=pointer]:
              - text: Reports
              - generic [ref=e103]: "1"
            - button "Unfiled 1" [ref=e104] [cursor=pointer]:
              - text: Unfiled
              - generic [ref=e106]: "1"
            - separator [ref=e107]
            - generic [ref=e108]: Visible file storage
            - paragraph [ref=e109]: 0.0 MiB
            - generic [ref=e110]: Storage quota is not provided by this service. Only accessible current attachments are counted.
          - region "All client files" [ref=e111]:
            - generic [ref=e112]:
              - generic [ref=e113]:
                - button "Test Aerospace" [ref=e114] [cursor=pointer]
                - generic [ref=e115]: 2 files
              - button "Upload here" [ref=e116] [cursor=pointer]
            - generic "File folders" [ref=e117]:
              - button "Open folder Unfiled" [ref=e118] [cursor=pointer]:
                - generic [ref=e119]: ▤
                - strong [ref=e120]: Unfiled
                - generic [ref=e121]: 1 file
                - generic [ref=e122]:
                  - generic [ref=e123]: TXT
                  - time [ref=e124]: 10/1/2026
              - button "Open folder Reports" [ref=e125] [cursor=pointer]:
                - generic [ref=e126]: ▤
                - strong [ref=e127]: Reports
                - generic [ref=e128]: 1 file
                - generic [ref=e129]:
                  - generic [ref=e130]: PDF
                  - time [ref=e131]: 10/1/2026
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { clientId, installFixtures } from "./fixtures";
  3  | 
  4  | for (const width of [1440, 360])
  5  |   test(`selected Files view keeps readable text while hovered at ${width}px`, async ({
  6  |     page,
  7  |   }) => {
  8  |     await page.setViewportSize({ width, height: 1040 });
  9  |     const unexpected = await installFixtures(page);
  10 |     await page.goto(`/portfolio/${clientId}/files`);
  11 |     const folders = page
  12 |       .getByRole("group", { name: "File view", exact: true })
  13 |       .getByRole("button", { name: "Folders", exact: true });
  14 |     await folders.click();
  15 |     await folders.hover();
  16 |     await expect(folders).toHaveAttribute("aria-pressed", "true");
  17 |     const contrast = await folders.evaluate((element) => {
  18 |       const style = getComputedStyle(element);
  19 |       const luminance = (color: string) => {
  20 |         const channels = color
  21 |           .match(/[\d.]+/g)!
  22 |           .slice(0, 3)
  23 |           .map(Number)
  24 |           .map((value) => {
  25 |             const channel = value / 255;
  26 |             return channel <= 0.04045
  27 |               ? channel / 12.92
  28 |               : ((channel + 0.055) / 1.055) ** 2.4;
  29 |           });
  30 |         return (
  31 |           channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
  32 |         );
  33 |       };
  34 |       const text = luminance(style.color);
  35 |       const background = luminance(style.backgroundColor);
  36 |       return (
  37 |         (Math.max(text, background) + 0.05) /
  38 |         (Math.min(text, background) + 0.05)
  39 |       );
  40 |     });
> 41 |     expect(contrast).toBeGreaterThanOrEqual(4.5);
     |                      ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  42 |     expect(unexpected).toEqual([]);
  43 |   });
  44 | 
```