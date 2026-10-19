# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio-active-count-contrast.spec.ts >> Portfolio 1440px light active profile counts retain readable contrast
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
        - /url: /portfolio?log=1
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
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]:
            - paragraph [ref=e34]: Your client portfolio
            - heading "Portfolio 1" [level=1] [ref=e35]
          - generic [ref=e36]:
            - combobox "Account owner" [ref=e38]:
              - option "All owners" [selected]
              - option "Unassigned"
            - generic [ref=e39]:
              - img [ref=e40]
              - textbox "Search profiles" [ref=e43]:
                - /placeholder: Search profiles…
            - button "Customize" [ref=e44] [cursor=pointer]
            - button "Add profile" [ref=e45] [cursor=pointer]:
              - img [ref=e46]
              - text: Add profile
        - region "Portfolio pulse" [ref=e47]:
          - generic [ref=e48]:
            - paragraph [ref=e49]: Portfolio pulse
            - generic [ref=e50]:
              - strong [ref=e51]: —
              - generic [ref=e52]:
                - text: of work linked
                - text: to an objective
          - generic [ref=e53]:
            - strong [ref=e54]: "1"
            - generic [ref=e55]: Clients
          - generic [ref=e56]:
            - strong [ref=e57]: —
            - generic [ref=e58]: Need attention
          - generic [ref=e59]:
            - strong [ref=e60]: —
            - generic [ref=e61]: Objectives
          - generic [ref=e62]:
            - strong [ref=e63]: —
            - generic [ref=e64]: Off track
          - generic [ref=e65]:
            - strong [ref=e66]: —
            - generic [ref=e67]: Strategies
        - generic [ref=e68]:
          - region "Portfolio profiles" [ref=e69]:
            - navigation "Profile type" [ref=e70]:
              - button "All 1" [active] [pressed] [ref=e71] [cursor=pointer]:
                - text: All
                - generic [ref=e72]: "1"
              - button "Clients 1" [ref=e73] [cursor=pointer]:
                - text: Clients
                - generic [ref=e74]: "1"
              - link "Prospects" [ref=e75] [cursor=pointer]:
                - /url: /portfolio/prospects
              - link "Pipeline" [ref=e76] [cursor=pointer]:
                - /url: /portfolio/prospects?pipeline=1
              - generic [ref=e77]:
                - button "New objective" [ref=e78] [cursor=pointer]
                - group [ref=e79]:
                  - generic "Filters and view" [ref=e80] [cursor=pointer]
                  - option "All statuses" [selected]
                  - option "ACTIVE"
                  - option "All sectors" [selected]
                  - option "Aerospace"
                  - option "Saved order" [selected]
                  - option "Recently added"
                  - option "Name A–Z"
            - status [ref=e81]: 1 profile
            - button "Refresh profiles" [ref=e82] [cursor=pointer]
            - region "Organization profile order" [ref=e83]:
              - status [ref=e84]:
                - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
                - button "Retry saved order" [ref=e85] [cursor=pointer]
              - article [ref=e88]:
                - generic [ref=e89]:
                  - generic [ref=e90]: TA
                  - generic [ref=e91]:
                    - heading "Open Test Aerospace" [level=2] [ref=e92]:
                      - link "Open Test Aerospace" [ref=e93] [cursor=pointer]:
                        - /url: /portfolio/10000000-0000-4000-8000-000000000001
                        - text: Test Aerospace
                    - generic [ref=e94]: Aerospace
                - generic [ref=e95]:
                  - 'note "Profile status: ACTIVE" [ref=e96]': ACTIVE
                  - 'img "Account owner: unavailable" [ref=e97]': —
              - status [ref=e98]
            - button "+ Add profile" [ref=e99] [cursor=pointer]
          - complementary "Needs attention" [ref=e100]:
            - generic [ref=e101]:
              - heading "Needs attention" [level=3] [ref=e102]
              - note "0 shown alerts" [ref=e103]: 0 shown
              - generic "Ordered by the source service" [ref=e104]: ↑↓ Most urgent
            - paragraph [ref=e105]: Updates automatically. Open an item in its client profile.
            - status [ref=e106]: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
            - generic [ref=e107]:
              - paragraph [ref=e108]: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
              - generic [ref=e109]:
                - generic [ref=e110]:
                  - text: Snapshot
                  - time [ref=e111]: Oct 11, 6:00 AM UTC
                - button "Refresh alerts" [ref=e112] [cursor=pointer]
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