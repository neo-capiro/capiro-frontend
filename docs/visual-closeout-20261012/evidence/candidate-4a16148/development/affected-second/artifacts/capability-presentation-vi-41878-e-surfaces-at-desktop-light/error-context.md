# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-presentation-visual.spec.ts >> Figma capability Profile, Documents and create surfaces at desktop-light
- Location: tests/browser/capability-presentation-visual.spec.ts:42:3

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 12
Received: 126

Expected precision:    0
Expected difference: < 0.5
Received difference:   114
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
              - button: Capabilities
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
              - heading [level=1]: Capabilities
              - generic:
                - button: Add capability
                - button: Registrations & codes
            - generic:
              - generic:
                - paragraph: Capability areas
                - generic: 1 areas · 0 fielded
              - generic:
                - button:
                  - generic: ▦
                  - strong: Counter-UAS interceptors
                  - paragraph: Synthetic interceptor profile for visual and keyboard checks.
                  - generic:
                    - generic: Prototype
                    - generic: 0604201A, 0605603A
            - generic:
              - generic:
                - generic:
                  - paragraph: Where capabilities create fit
                  - heading [level=3]: 1 fit matches
                - button: Refresh
              - generic: Computed 10/11/2026, 12:00:00 PM
              - article:
                - generic:
                  - strong: Synthetic fit program
                  - generic: Fit 90/100
                - paragraph: Explicit synthetic capability reference
                - link:
                  - /url: http://127.0.0.1:5191/existing/program-elements/0604134A
                  - text: Open target ↗
            - region:
              - generic:
                - generic:
                  - paragraph: Past performance
                  - heading [level=2]: Saved submissions
                  - paragraph: Saved capability submissions and their recorded outcomes.
                - button: Refresh history
              - generic:
                - paragraph: 0 saved submissions shown.
                - paragraph: No saved submissions in this history feed.
              - paragraph: Removing a saved submission keeps its capability and documents.
            - paragraph:
              - text: "Past advocacy:"
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                - text: Advocacy history ↗
  - 'dialog "Capability: Counter-UAS interceptors" [ref=e2]':
    - banner [ref=e3]:
      - 'heading "Capability: Counter-UAS interceptors" [level=2] [ref=e4]'
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: "Capability: Counter-UAS interceptors"
    - generic [ref=e10]:
      - tablist "Capability sections" [ref=e11]:
        - tab "Profile" [selected] [ref=e12] [cursor=pointer]
        - tab "Documents" [ref=e13] [cursor=pointer]
      - tabpanel "Profile" [ref=e14]:
        - generic [ref=e15]:
          - group [ref=e16]:
            - generic [ref=e17]:
              - generic [ref=e18]: product
              - generic [ref=e19]: Defense
              - button "Remove capability" [ref=e20] [cursor=pointer]: Delete
            - group "Technology Readiness Level" [ref=e21]:
              - generic [ref=e22]:
                - generic [ref=e23]: Technology Readiness Level
                - generic [ref=e24]:
                  - generic [ref=e25]: TRL 6 · Prototype
                  - button "Clear TRL" [ref=e26] [cursor=pointer]
              - generic [ref=e27]:
                - button "TRL 1" [ref=e28] [cursor=pointer]: "1"
                - button "TRL 2" [ref=e29] [cursor=pointer]: "2"
                - button "TRL 3" [ref=e30] [cursor=pointer]: "3"
                - button "TRL 4" [ref=e31] [cursor=pointer]: "4"
                - button "TRL 5" [ref=e32] [cursor=pointer]: "5"
                - button "TRL 6" [pressed] [ref=e33] [cursor=pointer]: "6"
                - button "TRL 7" [ref=e34] [cursor=pointer]: "7"
                - button "TRL 8" [ref=e35] [cursor=pointer]: "8"
                - button "TRL 9" [ref=e36] [cursor=pointer]: "9"
            - generic [ref=e37]:
              - generic [ref=e38]: Tags
              - generic [ref=e39]:
                - generic [ref=e40]:
                  - generic [ref=e41]: autonomy
                  - button "Remove autonomy from Tags" [ref=e42] [cursor=pointer]: ×
                - generic [ref=e43]:
                  - generic [ref=e44]: counter-uas
                  - button "Remove counter-uas from Tags" [ref=e45] [cursor=pointer]: ×
                - textbox "Tags" [ref=e46]:
                  - /placeholder: Pick or add tags
            - generic [ref=e47]:
              - generic [ref=e48]: PE numbers
              - generic [ref=e49]:
                - generic [ref=e50]:
                  - generic [ref=e51]: 0604201A
                  - button "Remove 0604201A from PE numbers" [ref=e52] [cursor=pointer]: ×
                - generic [ref=e53]:
                  - generic [ref=e54]: 0605603A
                  - button "Remove 0605603A from PE numbers" [ref=e55] [cursor=pointer]: ×
                - textbox "PE numbers" [ref=e56]:
                  - /placeholder: e.g. 0604201A, add and press Enter
            - generic [ref=e57]:
              - generic [ref=e58]: Match keywords
              - generic [ref=e59]:
                - generic [ref=e60]:
                  - generic [ref=e61]: counter UAS
                  - button "Remove counter UAS from Match keywords" [ref=e62] [cursor=pointer]: ×
                - generic [ref=e63]:
                  - generic [ref=e64]: kinetic intercept
                  - button "Remove kinetic intercept from Match keywords" [ref=e65] [cursor=pointer]: ×
                - textbox "Match keywords" [ref=e66]:
                  - /placeholder: Keywords that match PE text
            - generic [ref=e67]:
              - generic [ref=e68]: Description
              - textbox "Description" [ref=e69]:
                - /placeholder: Describe this capability…
                - text: Synthetic interceptor profile for visual and keyboard checks.
            - generic [ref=e70]:
              - generic [ref=e71]: Notes
              - textbox "Notes" [ref=e72]:
                - /placeholder: Internal notes…
                - text: Synthetic internal context.
            - group [ref=e73]:
              - generic "Details" [active] [ref=e74] [cursor=pointer]
              - generic [ref=e75]:
                - generic [ref=e76]:
                  - generic [ref=e77]: Name
                  - textbox "Name" [ref=e78]:
                    - /placeholder: Specific capability name
                    - text: Counter-UAS interceptors
                - generic [ref=e79]:
                  - generic [ref=e80]:
                    - text: Type
                    - textbox "Type" [ref=e82]: product
                  - generic [ref=e83]:
                    - text: Sector
                    - textbox "Sector" [ref=e85]: Defense
                - generic [ref=e86]:
                  - text: Manufacturing Readiness Level
                  - combobox "Manufacturing Readiness Level" [ref=e87]:
                    - option "Not set"
                    - option "1"
                    - option "2"
                    - option "3"
                    - option "4" [selected]
                    - option "5"
                    - option "6"
                    - option "7"
                    - option "8"
                    - option "9"
                    - option "10"
          - contentinfo [ref=e88]:
            - button "Cancel" [ref=e89] [cursor=pointer]
            - button "Save capability" [ref=e90] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Locator } from "@playwright/test";
  2   | import { clientId, capabilityId, json } from "./fixtures";
  3   | import {
  4   |   expectNoCapabilityOverflow,
  5   |   installCapabilityPresentation,
  6   |   openCapabilityDetails,
  7   |   openPresentedCapability,
  8   | } from "./capability-presentation-fixtures";
  9   | 
  10  | async function checkTypeSector(editor: Locator, phone: boolean) {
  11  |   const type = await editor.getByLabel("Type", { exact: true }).boundingBox();
  12  |   const sector = await editor
  13  |     .getByLabel("Sector", { exact: true })
  14  |     .boundingBox();
  15  |   expect(type).not.toBeNull();
  16  |   expect(sector).not.toBeNull();
  17  |   expect(Math.abs(type!.width - sector!.width)).toBeLessThanOrEqual(1);
  18  |   if (phone) {
  19  |     expect(Math.abs(type!.x - sector!.x)).toBeLessThanOrEqual(1);
  20  |     expect(sector!.y).toBeGreaterThan(type!.y + type!.height);
  21  |   } else {
  22  |     expect(Math.abs(type!.y - sector!.y)).toBeLessThanOrEqual(1);
> 23  |     expect(sector!.x - type!.x - type!.width).toBeCloseTo(12, 0);
      |                                               ^ Error: expect(received).toBeCloseTo(expected, precision)
  24  |   }
  25  | }
  26  | 
  27  | for (const screen of [
  28  |   {
  29  |     name: "desktop-light",
  30  |     width: 1440,
  31  |     height: 1040,
  32  |     colorScheme: "light" as const,
  33  |   },
  34  |   {
  35  |     name: "phone-light",
  36  |     width: 390,
  37  |     height: 844,
  38  |     colorScheme: "light" as const,
  39  |   },
  40  |   { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" as const },
  41  | ])
  42  |   test(`Figma capability Profile, Documents and create surfaces at ${screen.name}`, async ({
  43  |     page,
  44  |   }, info) => {
  45  |     // Six full-page captures plus all editor transitions can exceed 30 seconds
  46  |     // on a shared CPU. Keep every assertion with a bounded 90-second case budget.
  47  |     test.slow();
  48  |     const unexpected = await installCapabilityPresentation(page);
  49  |     const errors: string[] = [];
  50  |     page.on("pageerror", (error) => errors.push(error.message));
  51  |     await page.setViewportSize({ width: screen.width, height: screen.height });
  52  |     await page.emulateMedia({ colorScheme: screen.colorScheme });
  53  |     const phone = screen.width <= 680;
  54  |     const editor = await openPresentedCapability(page);
  55  |     const bounds = await editor.boundingBox();
  56  |     expect(bounds!.width).toBe(phone ? screen.width - 32 : 720);
  57  |     expect(bounds!.y).toBe(phone ? 16 : 60);
  58  |     await expect(editor.getByLabel("Name", { exact: true })).toBeHidden();
  59  |     await expect(editor.getByText("product", { exact: true })).toBeVisible();
  60  |     await expect(editor.getByText("Defense", { exact: true })).toBeVisible();
  61  |     const levels = editor.getByRole("button", { name: /^TRL [1-9]$/ });
  62  |     await expect(levels).toHaveCount(9);
  63  |     await expect(
  64  |       editor.getByRole("button", { name: "TRL 6", exact: true }),
  65  |     ).toHaveAttribute("aria-pressed", "true");
  66  |     const first = await levels.first().boundingBox();
  67  |     const last = await levels.last().boundingBox();
  68  |     expect(Math.abs(first!.y - last!.y)).toBeLessThanOrEqual(1);
  69  |     expect(Math.abs(first!.width - last!.width)).toBeLessThanOrEqual(1);
  70  |     if (!phone) {
  71  |       expect(first!.width).toBe(40);
  72  |       expect(first!.height).toBe(30);
  73  |     }
  74  |     const tags = editor.getByLabel("Tags", { exact: true });
  75  |     const chip = editor.getByRole("button", {
  76  |       name: "Remove autonomy from Tags",
  77  |       exact: true,
  78  |     });
  79  |     expect(
  80  |       await tags.evaluate((input) =>
  81  |         input.parentElement?.contains(input.closest("label")),
  82  |       ),
  83  |     ).toBe(false);
  84  |     expect(
  85  |       await chip.evaluate((button) => button.closest("label") === null),
  86  |     ).toBe(true);
  87  |     await expectNoCapabilityOverflow(page, editor);
  88  |     await page.screenshot({
  89  |       path: info.outputPath(`capability-profile-${screen.name}.png`),
  90  |       fullPage: true,
  91  |     });
  92  |     await openCapabilityDetails(editor);
  93  |     await checkTypeSector(editor, phone);
  94  |     await editor
  95  |       .getByRole("button", { name: "Save capability", exact: true })
  96  |       .scrollIntoViewIfNeeded();
  97  |     await expectNoCapabilityOverflow(page, editor);
  98  |     await page.screenshot({
  99  |       path: info.outputPath(`capability-details-${screen.name}.png`),
  100 |       fullPage: true,
  101 |     });
  102 |     await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  103 |     await expect(
  104 |       editor.getByRole("button", {
  105 |         name: "Synthetic datasheet.pdf",
  106 |         exact: true,
  107 |       }),
  108 |     ).toBeVisible();
  109 |     await expectNoCapabilityOverflow(page, editor);
  110 |     await page.screenshot({
  111 |       path: info.outputPath(`capability-documents-${screen.name}.png`),
  112 |       fullPage: true,
  113 |     });
  114 |     await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  115 |     await editor.getByText("Details", { exact: true }).click();
  116 |     await page.route(
  117 |       `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  118 |       (route) =>
  119 |         json(
  120 |           route,
  121 |           { message: "Synthetic capability validation refused" },
  122 |           400,
  123 |         ),
```