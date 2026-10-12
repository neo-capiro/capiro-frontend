# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contrast.spec.ts >> selected Files view keeps readable text while hovered at 360px
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
    - button "Toggle navigation" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
    - link "Capiro Home" [ref=e7] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e8]
    - button "Switch workspace" [ref=e10] [cursor=pointer]
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - navigation "Breadcrumb" [ref=e22]:
          - link "Back to Portfolio" [ref=e23] [cursor=pointer]:
            - /url: /portfolio
          - link "Portfolio" [ref=e24] [cursor=pointer]:
            - /url: /portfolio
          - generic [ref=e25]: /
          - link "Test Aerospace" [ref=e26] [cursor=pointer]:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e27]: /
          - 'button "Switch client view: Files" [ref=e28] [cursor=pointer]': Files
        - generic [ref=e29]:
          - button "Quick add" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Quick add
          - button "Meri actions" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: Meri actions
          - button "More actions for Test Aerospace" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
      - region "Client identity" [ref=e39]:
        - generic [ref=e40]: TA
        - generic [ref=e41]:
          - strong [ref=e42]: Test Aerospace
          - paragraph [ref=e43]: Aerospace
        - generic [ref=e44]: active client
    - generic [ref=e46]:
      - generic [ref=e47]:
        - heading "Client files" [level=1] [ref=e48]
        - generic [ref=e49]:
          - button "New folder" [disabled] [ref=e50]
          - button "Upload" [ref=e51] [cursor=pointer]
          - button "Create with Meri" [disabled] [ref=e52]
      - generic [ref=e53]:
        - textbox "Search files" [ref=e54]:
          - /placeholder: Search files…
        - group "File source" [ref=e55]:
          - button "All" [pressed] [ref=e56] [cursor=pointer]
          - button "manual" [ref=e57] [cursor=pointer]
        - generic [ref=e58]:
          - text: Sort by
          - combobox "Sort files" [ref=e59]:
            - option "Created · newest" [selected]
            - option "Name"
      - group "File view" [ref=e60]:
        - button "Folders" [active] [pressed] [ref=e61] [cursor=pointer]
        - button "All files" [ref=e62] [cursor=pointer]
      - generic [ref=e63]:
        - complementary [ref=e64]:
          - generic [ref=e65]:
            - generic [ref=e66]: Folders
            - button "Access" [disabled] [ref=e67]
          - button "Test Aerospace · 2" [pressed] [ref=e68] [cursor=pointer]
          - button "Reports 1" [ref=e69] [cursor=pointer]:
            - text: Reports
            - generic [ref=e71]: "1"
          - button "Unfiled 1" [ref=e72] [cursor=pointer]:
            - text: Unfiled
            - generic [ref=e74]: "1"
          - separator [ref=e75]
          - generic [ref=e76]: Visible file storage
          - paragraph [ref=e77]: 0.0 MiB
          - generic [ref=e78]: Storage quota is not provided by this service. Only accessible current attachments are counted.
        - region "All client files" [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e81]:
              - button "Test Aerospace" [ref=e82] [cursor=pointer]
              - generic [ref=e83]: 2 files
            - button "Upload here" [ref=e84] [cursor=pointer]
          - generic "File folders" [ref=e85]:
            - button "Open folder Unfiled" [ref=e86] [cursor=pointer]:
              - generic [ref=e87]: ▤
              - strong [ref=e88]: Unfiled
              - generic [ref=e89]: 1 file
              - generic [ref=e90]:
                - generic [ref=e91]: TXT
                - time [ref=e92]: 10/1/2026
            - button "Open folder Reports" [ref=e93] [cursor=pointer]:
              - generic [ref=e94]: ▤
              - strong [ref=e95]: Reports
              - generic [ref=e96]: 1 file
              - generic [ref=e97]:
                - generic [ref=e98]: PDF
                - time [ref=e99]: 10/1/2026
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