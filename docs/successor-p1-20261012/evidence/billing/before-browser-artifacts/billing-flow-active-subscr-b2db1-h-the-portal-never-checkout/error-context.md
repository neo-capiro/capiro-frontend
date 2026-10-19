# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: billing-flow.spec.ts >> active subscriber adds profiles through the portal, never checkout
- Location: apps/web/test/browser/billing-flow.spec.ts:44:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('dialog')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link:
        - /url: "#main-content"
        - text: Skip to content
      - banner:
        - link:
          - /url: /
          - img
        - navigation:
          - link:
            - /url: /meri
            - generic:
              - img
          - link:
            - /url: /
            - generic:
              - img
          - link:
            - /url: /modules
            - generic:
              - img
        - navigation:
          - link:
            - /url: /?log=1
            - generic:
              - img
          - link:
            - /url: /calendar
            - generic:
              - img
          - link:
            - /url: /modules/intelligence
            - generic:
              - img
          - button [disabled]:
            - generic:
              - img
          - link:
            - /url: /settings/personal
            - generic:
              - img
      - generic:
        - main:
          - generic:
            - complementary:
              - link:
                - /url: /modules
                - img
                - text: All modules
              - navigation:
                - generic:
                  - paragraph: Account
                  - link:
                    - /url: /settings/personal
                    - text: Personal
                  - link:
                    - /url: /settings/memory
                    - text: Memory
                  - link:
                    - /url: /settings/integrations
                    - text: Integrations
                - generic:
                  - paragraph: Workspace
                  - link:
                    - /url: /settings/team
                    - text: Team
                  - link:
                    - /url: /settings/profiles
                    - text: Profiles
                  - link:
                    - /url: /settings/branding
                    - text: Branding
                  - link:
                    - /url: /settings/contact-info
                    - text: Contact info
                  - link:
                    - /url: /settings/billing
                    - text: Billing
                  - link:
                    - /url: /settings/ai-usage
                    - text: AI usage
                - generic:
                  - paragraph: Intelligence
                  - link:
                    - /url: /settings/intelligence-mappings
                    - text: Intelligence mappings
                - generic:
                  - paragraph: Capiro HQ
                  - link:
                    - /url: /settings/hq-tenants
                    - text: Tenants
                  - link:
                    - /url: /settings/hq-customers
                    - text: Customers
                  - link:
                    - /url: /settings/hq-broadcasts
                    - text: Broadcasts
                  - link:
                    - /url: /settings/hq-analyst
                    - text: Analyst console
                  - link:
                    - /url: /settings/hq-reconciliation
                    - text: PE reconciliation
                  - link:
                    - /url: /settings/hq-matches
                    - text: PE match queue
            - generic:
              - generic:
                - paragraph: Settings
                - heading [level=1]: Billing
                - paragraph: Your plan, payment method and invoices.
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - heading [level=2]: Your plan
                        - paragraph: Your current subscription and profile capacity.
                      - button: Add profiles
                    - generic:
                      - generic: active
                      - generic:
                        - generic:
                          - term: Profiles
                          - definition: 1 of 10 used
                        - generic:
                          - term: Price per profile
                          - definition: $200.00
                        - generic:
                          - term: Current period ends
                          - definition: 11/1/2026
                        - generic:
                          - term: AI allowance
                          - definition: $50.00
                        - generic:
                          - term: AI used
                          - definition: $0.00
                        - generic:
                          - term: AI overage
                          - definition: $0.00
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - heading [level=2]: Payment method
                        - paragraph: View and update your payment method through the billing provider.
                      - button: Update
                    - generic:
                      - paragraph: Your payment details are managed securely in the billing portal.
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - heading [level=2]: Invoices and receipts
                    - generic:
                      - button: View and download invoices
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - heading [level=2]: Cancel plan
                        - paragraph: Only authorized billing administrators can manage the plan.
                      - button: Cancel plan
                    - generic:
                      - paragraph: The billing provider will show your cancellation terms and effective date.
                - paragraph:
                  - text: AI usage is included in your plan.
                  - link:
                    - /url: /settings/ai-usage
                    - text: See where it is being used.
    - paragraph: Explicit local test fixture · synthetic identity and records
  - dialog "Add profiles" [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - heading "Add profiles" [level=2] [ref=e5]
        - paragraph [ref=e6]: Set the total profile capacity. Review pricing in the hosted checkout before payment.
      - button "Close dialog" [active] [ref=e7] [cursor=pointer]: ×
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Total profiles
        - spinbutton "Total profiles" [ref=e12]: "10"
      - generic [ref=e13]:
        - text: Access or promotion code (optional)
        - textbox "Access or promotion code (optional)" [ref=e14]
    - contentinfo [ref=e15]:
      - button "Cancel" [ref=e16] [cursor=pointer]
      - button "Review checkout" [ref=e17] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  3   | import { settingsFixtures } from "./settings-fixtures";
  4   | 
  5   | const portalUrl = "https://billing.stripe.com/p/session/synthetic-test";
  6   | const checkoutUrl = "https://checkout.stripe.com/c/pay/synthetic-test";
  7   | const initialSummary = settingsFixtures["settings.billing.summary"];
  8   | 
  9   | async function billingFixture(
  10  |   page: Page,
  11  |   overrides: Partial<typeof initialSummary> = {},
  12  | ) {
  13  |   await onlyLocalRequests(page);
  14  |   const current = { summary: { ...initialSummary, ...overrides } };
  15  |   const writes: { operation: string; input: unknown }[] = [];
  16  |   await operationFixtures(page, {
  17  |     ...settingsFixtures,
  18  |     "settings.billing.summary": () => current.summary,
  19  |     "settings.billing.state": {
  20  |       ...settingsFixtures["settings.billing.state"],
  21  |       status: current.summary.status,
  22  |       billingEnabled: current.summary.billingEnabled,
  23  |     },
  24  |     "settings.billing.portal": (input) => {
  25  |       writes.push({ operation: "portal", input });
  26  |       return { url: portalUrl };
  27  |     },
  28  |     "settings.billing.checkout": (input) => {
  29  |       writes.push({ operation: "checkout", input });
  30  |       return { url: checkoutUrl };
  31  |     },
  32  |   });
  33  |   // Hosted destinations are synthetic documents, never provider requests.
  34  |   for (const url of [portalUrl, checkoutUrl])
  35  |     await page.route(url, (route) =>
  36  |       route.fulfill({ contentType: "text/html", body: "Synthetic hosted flow" }),
  37  |     );
  38  |   await page.goto("/settings/billing");
  39  |   await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
  40  |   return { current, writes };
  41  | }
  42  | 
  43  | for (const status of ["active", "past_due"]) {
  44  |   test(`${status} subscriber adds profiles through the portal, never checkout`, async ({ page }) => {
  45  |     const { writes } = await billingFixture(page, { status });
  46  |     await page.getByRole("button", { name: "Add profiles", exact: true }).click();
> 47  |     await expect(page.getByRole("dialog")).toHaveCount(0);
      |                                            ^ Error: expect(locator).toHaveCount(expected) failed
  48  |     await expect(page).toHaveURL(portalUrl);
  49  |     expect(writes).toEqual([{ operation: "portal", input: {} }]);
  50  |   });
  51  | }
  52  | 
  53  | for (const status of ["none", "trialing"]) {
  54  |   test(`${status} non-subscriber can review a new subscription`, async ({ page }) => {
  55  |     const { writes } = await billingFixture(page, { status, hasSubscription: false });
  56  |     await page.getByRole("button", { name: "Start subscription", exact: true }).click();
  57  |     const dialog = page.getByRole("dialog", { name: "Start subscription" });
  58  |     await dialog.getByLabel("Total profiles", { exact: true }).fill("15");
  59  |     await dialog.getByLabel("Access or promotion code (optional)").fill("SYNTHETIC");
  60  |     await dialog.getByRole("button", { name: "Review checkout" }).click();
  61  |     await expect(page).toHaveURL(checkoutUrl);
  62  |     expect(writes).toEqual([
  63  |       { operation: "checkout", input: { body: { quantity: 15, promoCode: "SYNTHETIC" } } },
  64  |     ]);
  65  |   });
  66  | }
  67  | 
  68  | for (const status of ["active", "past_due", "canceled", "comped"]) {
  69  |   test(`${status} without a subscription does not infer checkout eligibility`, async ({ page }) => {
  70  |     const { writes } = await billingFixture(page, { status, hasSubscription: false });
  71  |     await expect(page.getByRole("button", { name: "Add profiles", exact: true })).toBeDisabled();
  72  |     await expect(page.getByText("Profile changes are unavailable for this billing state.")).toBeVisible();
  73  |     await expect(page.getByRole("button", { name: "Start subscription" })).toHaveCount(0);
  74  |     expect(writes).toEqual([]);
  75  |   });
  76  | }
  77  | 
  78  | test("disabled billing cannot open either hosted flow", async ({ page }) => {
  79  |   const { writes } = await billingFixture(page, { billingEnabled: false });
  80  |   await expect(page.getByRole("button", { name: "Add profiles", exact: true })).toBeDisabled();
  81  |   await expect(page.getByRole("button", { name: "Update", exact: true })).toBeDisabled();
  82  |   expect(writes).toEqual([]);
  83  | });
  84  | 
  85  | test("checkout rechecks a changed subscription and preserves the draft without a write", async ({ page }) => {
  86  |   const { current, writes } = await billingFixture(page, { status: "none", hasSubscription: false });
  87  |   await page.getByRole("button", { name: "Start subscription", exact: true }).click();
  88  |   const dialog = page.getByRole("dialog", { name: "Start subscription" });
  89  |   await dialog.getByLabel("Total profiles", { exact: true }).fill("17");
  90  |   current.summary = { ...current.summary, status: "active", hasSubscription: true };
  91  |   await dialog.getByRole("button", { name: "Review checkout" }).click();
  92  |   await expect(dialog.getByRole("alert")).toContainText("Refresh billing before continuing");
  93  |   await expect(dialog.getByLabel("Total profiles", { exact: true })).toHaveValue("17");
  94  |   expect(writes).toEqual([]);
  95  | });
  96  | 
  97  | test("failed current summary prevents checkout from a previously opened form", async ({ page }) => {
  98  |   const { writes } = await billingFixture(page, { status: "none", hasSubscription: false });
  99  |   await page.getByRole("button", { name: "Start subscription", exact: true }).click();
  100 |   await page.route("**/api/capiro/settings.billing.summary?*", (route) =>
  101 |     route.fulfill({ status: 503, json: { message: "Synthetic summary unavailable" } }),
  102 |   );
  103 |   const dialog = page.getByRole("dialog", { name: "Start subscription" });
  104 |   await dialog.getByRole("button", { name: "Review checkout" }).click();
  105 |   await expect(dialog.getByRole("alert")).toContainText("Synthetic summary unavailable");
  106 |   expect(writes).toEqual([]);
  107 | });
  108 | 
  109 | test("an existing-subscriber action rechecks that a subscription still exists", async ({ page }) => {
  110 |   const { current, writes } = await billingFixture(page);
  111 |   current.summary = { ...current.summary, status: "none", hasSubscription: false };
  112 |   await page.getByRole("button", { name: "Add profiles", exact: true }).click();
  113 |   await expect(page.getByRole("alert")).toContainText("Refresh billing before continuing");
  114 |   expect(writes).toEqual([]);
  115 | });
  116 | 
  117 | for (const flow of ["portal", "checkout"] as const) {
  118 |   test(`${flow} rejects a receipt for the other hosted flow`, async ({ page }) => {
  119 |     await billingFixture(page, flow === "checkout" ? { status: "none", hasSubscription: false } : {});
  120 |     await page.route(`**/api/capiro/settings.billing.${flow}`, (route) =>
  121 |       route.fulfill({ json: { url: flow === "portal" ? checkoutUrl : portalUrl } }),
  122 |     );
  123 |     if (flow === "checkout") {
  124 |       await page.getByRole("button", { name: "Start subscription", exact: true }).click();
  125 |       await page.getByRole("button", { name: "Review checkout" }).click();
  126 |     } else await page.getByRole("button", { name: "Add profiles", exact: true }).click();
  127 |     await expect(page.getByRole("alert").last()).toContainText("unexpected billing destination");
  128 |     await expect(page).toHaveURL(/\/settings\/billing$/);
  129 |   });
  130 | }
  131 | 
  132 | test("repeated clicks while summary revalidation is pending dispatch one portal request", async ({ page }) => {
  133 |   const { current, writes } = await billingFixture(page);
  134 |   let release!: () => void;
  135 |   const waiting = new Promise<void>((resolve) => { release = resolve; });
  136 |   let reads = 0;
  137 |   await page.route("**/api/capiro/settings.billing.summary?*", async (route) => {
  138 |     reads++;
  139 |     await waiting;
  140 |     await route.fulfill({ json: current.summary });
  141 |   });
  142 |   const button = page.getByRole("button", { name: "Add profiles", exact: true });
  143 |   await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  144 |   await expect(button).toBeDisabled();
  145 |   await expect.poll(() => reads).toBe(1);
  146 |   expect(writes).toEqual([]);
  147 |   release();
```