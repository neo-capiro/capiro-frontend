# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-capacity.spec.ts >> logo storage cannot continue after capacity-invalidate-actor
- Location: tests/browser/profile-capacity.spec.ts:249:5

# Error details

```
Error: locator.fill: Target page, context or browser has been closed
```

# Test source

```ts
  1   | import { expect, test, type Page, type Locator } from "@playwright/test";
  2   | import { client, installFixtures, json } from "./fixtures";
  3   | const state = {
  4   |   billingEnabled: true,
  5   |   status: "active",
  6   |   slots: 12,
  7   |   usedSlots: 11,
  8   |   locked: false,
  9   |   trialEndsAt: null,
  10  |   onboardingFlowVersion: 1,
  11  | };
  12  | const renderErrors = new WeakMap<Page, string[]>();
  13  | test.beforeEach(async ({ page }) => {
  14  |   const errors: string[] = [];
  15  |   renderErrors.set(page, errors);
  16  |   page.on("console", (message) => {
  17  |     if (
  18  |       message.type() === "error" &&
  19  |       /Cannot update a component|Maximum update depth|Rendered (more|fewer) hooks/.test(
  20  |         message.text(),
  21  |       )
  22  |     )
  23  |       errors.push(message.text());
  24  |   });
  25  | });
  26  | test.afterEach(async ({ page }) => {
  27  |   expect(renderErrors.get(page)).toEqual([]);
  28  | });
  29  | async function chooser(page: Page) {
  30  |   await page.goto("/portfolio");
  31  |   await page
  32  |     .getByRole("button", { name: "Add profile", exact: true })
  33  |     .first()
  34  |     .click();
  35  |   return page.getByRole("dialog", { name: "Add profile", exact: true });
  36  | }
  37  | async function fillProfile(dialog: Locator) {
  38  |   await dialog
  39  |     .getByLabel("Legal name *", { exact: true })
> 40  |     .fill("Capacity Test");
      |      ^ Error: locator.fill: Target page, context or browser has been closed
  41  |   await dialog
  42  |     .getByLabel("Website *", { exact: true })
  43  |     .fill("capacity.example.test");
  44  |   await dialog
  45  |     .getByLabel("Company description *", { exact: true })
  46  |     .fill("Synthetic intercepted capacity test");
  47  |   await dialog
  48  |     .getByRole("button", { name: "3. Sector & Tracks", exact: true })
  49  |     .click();
  50  | }
  51  | test("tenant slot count blocks client creation and leaves prospect and LDA browsing reachable", async ({
  52  |   page,
  53  | }, info) => {
  54  |   const unexpected = await installFixtures(page);
  55  |   await page.route("**/api/backend/core/billing/state", (route) =>
  56  |     json(route, { ...state, usedSlots: 12 }),
  57  |   );
  58  |   const dialog = await chooser(page);
  59  |   await expect(
  60  |     dialog.getByText("12 of 12 client slots in use · 0 available"),
  61  |   ).toBeVisible();
  62  |   await expect(
  63  |     dialog.getByRole("button", { name: /Manual entry/ }),
  64  |   ).toBeDisabled();
  65  |   await expect(
  66  |     dialog.getByRole("button", { name: /Search LDA/ }),
  67  |   ).toBeEnabled();
  68  |   await expect(
  69  |     dialog.getByRole("link", { name: /Add prospect/ }),
  70  |   ).toHaveAttribute("href", "/portfolio/prospects?new=1");
  71  |   await expect(dialog.getByText(/No charge has been made/)).toBeVisible();
  72  |   await dialog.screenshot({
  73  |     path: info.outputPath("profile-capacity-desktop.png"),
  74  |   });
  75  |   await page.setViewportSize({ width: 390, height: 844 });
  76  |   await page.emulateMedia({ colorScheme: "dark" });
  77  |   await expect(page.locator("body")).toHaveCSS(
  78  |     "background-color",
  79  |     "rgb(18, 18, 18)",
  80  |   );
  81  |   await dialog.screenshot({
  82  |     path: info.outputPath("profile-capacity-mobile-dark.png"),
  83  |   });
  84  |   expect(
  85  |     await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  86  |   ).toBe(true);
  87  |   expect(unexpected).toEqual([]);
  88  | });
  89  | test("trial uses ten-profile allowance and does not substitute the one-client visible catalog", async ({
  90  |   page,
  91  | }) => {
  92  |   const unexpected = await installFixtures(page);
  93  |   await page.route("**/api/backend/core/billing/state", (route) =>
  94  |     json(route, { ...state, status: "trialing", slots: 0, usedSlots: 9 }),
  95  |   );
  96  |   const dialog = await chooser(page);
  97  |   await expect(
  98  |     dialog.getByText("9 of 10 client slots in use · 1 available"),
  99  |   ).toBeVisible();
  100 |   await expect(
  101 |     dialog.getByRole("button", { name: /Manual entry/ }),
  102 |   ).toBeEnabled();
  103 |   expect(unexpected).toEqual([]);
  104 | });
  105 | test("failed state read blocks creation; explicit read retry restores available capacity", async ({
  106 |   page,
  107 | }) => {
  108 |   const unexpected = await installFixtures(page);
  109 |   let failed = true;
  110 |   await page.route("**/api/backend/core/billing/state", (route) =>
  111 |     failed
  112 |       ? json(route, { message: "Capacity service unavailable" }, 503)
  113 |       : json(route, state),
  114 |   );
  115 |   const dialog = await chooser(page);
  116 |   await expect(
  117 |     dialog.getByRole("button", { name: /Manual entry/ }),
  118 |   ).toBeDisabled();
  119 |   await expect(dialog.getByRole("alert")).toContainText(
  120 |     "Capacity service unavailable",
  121 |   );
  122 |   failed = false;
  123 |   await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  124 |   await expect(
  125 |     dialog.getByRole("button", { name: /Manual entry/ }),
  126 |   ).toBeEnabled();
  127 |   expect(unexpected).toEqual([]);
  128 | });
  129 | test("fresh create preflight catches a slot consumed while the form was open and preserves input", async ({
  130 |   page,
  131 | }) => {
  132 |   const unexpected = await installFixtures(page);
  133 |   let reads = 0,
  134 |     writes = 0;
  135 |   await page.route("**/api/backend/core/billing/state", (route) =>
  136 |     json(route, { ...state, usedSlots: ++reads >= 3 ? 12 : 11 }),
  137 |   );
  138 |   await page.route("**/api/backend/core/clients", (route) => {
  139 |     if (route.request().method() === "POST") writes++;
  140 |     return json(route, [client]);
```