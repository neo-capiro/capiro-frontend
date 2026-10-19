# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio-active-count-contrast.spec.ts >> Portfolio 390px light active profile counts retain readable contrast
- Location: tests/browser/portfolio-active-count-contrast.spec.ts:17:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 4.5
Received:    2.484436491271581
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
        - /url: /portfolio?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]:
          - paragraph [ref=e23]: Your client portfolio
          - heading "Portfolio 1" [level=1] [ref=e24]
        - generic [ref=e25]:
          - combobox "Account owner" [ref=e27]:
            - option "All owners" [selected]
            - option "Unassigned"
          - generic [ref=e28]:
            - img [ref=e29]
            - textbox "Search profiles" [ref=e32]:
              - /placeholder: Search profiles…
          - button "Customize" [ref=e33] [cursor=pointer]
          - button "Add profile" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
            - text: Add profile
      - region "Portfolio pulse" [ref=e36]:
        - generic [ref=e37]:
          - paragraph [ref=e38]: Portfolio pulse
          - generic [ref=e39]:
            - strong [ref=e40]: —
            - generic [ref=e41]:
              - text: of work linked
              - text: to an objective
        - generic [ref=e42]:
          - strong [ref=e43]: "1"
          - generic [ref=e44]: Clients
        - generic [ref=e45]:
          - strong [ref=e46]: —
          - generic [ref=e47]: Need attention
        - generic [ref=e48]:
          - strong [ref=e49]: —
          - generic [ref=e50]: Objectives
        - generic [ref=e51]:
          - strong [ref=e52]: —
          - generic [ref=e53]: Off track
        - generic [ref=e54]:
          - strong [ref=e55]: —
          - generic [ref=e56]: Strategies
      - generic [ref=e57]:
        - region "Portfolio profiles" [ref=e58]:
          - navigation "Profile type" [ref=e59]:
            - button "All 1" [active] [pressed] [ref=e60] [cursor=pointer]:
              - text: All
              - generic [ref=e61]: "1"
            - button "Clients 1" [ref=e62] [cursor=pointer]:
              - text: Clients
              - generic [ref=e63]: "1"
            - link "Prospects" [ref=e64] [cursor=pointer]:
              - /url: /portfolio/prospects
            - link "Pipeline" [ref=e65] [cursor=pointer]:
              - /url: /portfolio/prospects?pipeline=1
            - generic [ref=e66]:
              - button "New objective" [ref=e67] [cursor=pointer]
              - group [ref=e68]:
                - generic "Filters and view" [ref=e69] [cursor=pointer]
                - option "All statuses" [selected]
                - option "ACTIVE"
                - option "All sectors" [selected]
                - option "Aerospace"
                - option "Saved order" [selected]
                - option "Recently added"
                - option "Name A–Z"
          - status [ref=e70]: 1 profile
          - button "Refresh profiles" [ref=e71] [cursor=pointer]
          - region "Organization profile order" [ref=e72]:
            - status [ref=e73]:
              - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
              - button "Retry saved order" [ref=e74] [cursor=pointer]
            - article [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e79]: TA
                - generic [ref=e80]:
                  - heading "Open Test Aerospace" [level=2] [ref=e81]:
                    - link "Open Test Aerospace" [ref=e82] [cursor=pointer]:
                      - /url: /portfolio/10000000-0000-4000-8000-000000000001
                      - text: Test Aerospace
                  - generic [ref=e83]: Aerospace
              - generic [ref=e84]:
                - 'note "Profile status: ACTIVE" [ref=e85]': ACTIVE
                - 'img "Account owner: unavailable" [ref=e86]': —
            - status [ref=e87]
          - button "+ Add profile" [ref=e88] [cursor=pointer]
        - complementary "Needs attention" [ref=e89]:
          - generic [ref=e90]:
            - heading "Needs attention" [level=3] [ref=e91]
            - note "0 shown alerts" [ref=e92]: 0 shown
            - generic "Ordered by the source service" [ref=e93]: ↑↓ Most urgent
          - paragraph [ref=e94]: Updates automatically. Open an item in its client profile.
          - status [ref=e95]: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
          - generic [ref=e96]:
            - paragraph [ref=e97]: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
            - generic [ref=e98]:
              - generic [ref=e99]:
                - text: Snapshot
                - time [ref=e100]: Oct 11, 6:00 AM UTC
              - button "Refresh alerts" [ref=e101] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { installFixtures } from "./fixtures";
  3  | 
  4  | function luminance(rgb: string) {
  5  |   const channels = rgb.match(/[\d.]+/g)?.map(Number);
  6  |   if (!channels || channels.length !== 3)
  7  |     throw new Error(`Expected an opaque computed RGB color: ${rgb}`);
  8  |   const linear = channels.map((value) => {
  9  |     const srgb = value / 255;
  10 |     return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  11 |   });
  12 |   return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
  13 | }
  14 | 
  15 | for (const width of [1440, 390]) {
  16 |   for (const colorScheme of ["light", "dark"] as const) {
  17 |     test(`Portfolio ${width}px ${colorScheme} active profile counts retain readable contrast`, async ({
  18 |       page,
  19 |     }, testInfo) => {
  20 |       const unexpected = await installFixtures(page);
  21 |       await page.setViewportSize({
  22 |         width,
  23 |         height: width === 1440 ? 1040 : 844,
  24 |       });
  25 |       await page.emulateMedia({ colorScheme });
  26 |       await page.goto("/portfolio");
  27 |       const navigation = page.getByRole("navigation", { name: "Profile type" });
  28 |       for (const name of [/^All /, /^Clients /]) {
  29 |         const tab = navigation.getByRole("button", { name });
  30 |         await tab.click();
  31 |         await expect(tab).toHaveAttribute("aria-pressed", "true");
  32 |         const count = tab.locator("small");
  33 |         await expect(count).toHaveText("1");
  34 |         for (const state of ["hover", "rest"]) {
  35 |           if (state === "rest") await page.mouse.move(0, 0);
  36 |           const colors = await count.evaluate((element) => {
  37 |             const style = getComputedStyle(element);
  38 |             const parent = getComputedStyle(element.parentElement!);
  39 |             return {
  40 |               foreground: style.color,
  41 |               background: parent.backgroundImage,
  42 |               solidBackground: parent.backgroundColor,
  43 |               countOpacity: style.opacity,
  44 |               buttonOpacity: parent.opacity,
  45 |             };
  46 |           });
  47 |           expect(colors.countOpacity).toBe("1");
  48 |           expect(colors.buttonOpacity).toBe("1");
  49 |           const stops =
  50 |             state === "hover"
  51 |               ? [colors.solidBackground]
  52 |               : colors.background.match(/rgb\([^)]+\)/g);
  53 |           expect(stops).toHaveLength(state === "hover" ? 1 : 2);
  54 |           const foreground = luminance(colors.foreground);
  55 |           const contrasts = stops!.map((stop) => {
  56 |             const background = luminance(stop);
  57 |             return (
  58 |               (Math.max(foreground, background) + 0.05) /
  59 |               (Math.min(foreground, background) + 0.05)
  60 |             );
  61 |           });
  62 |           await testInfo.attach("active-count-contrast", {
  63 |             body: JSON.stringify({
  64 |               width,
  65 |               colorScheme,
  66 |               state,
  67 |               colors,
  68 |               contrasts,
  69 |             }),
  70 |             contentType: "application/json",
  71 |           });
> 72 |           expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
     |                                          ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  73 |         }
  74 |       }
  75 |       expect(unexpected).toEqual([]);
  76 |     });
  77 |   }
  78 | }
  79 | 
```