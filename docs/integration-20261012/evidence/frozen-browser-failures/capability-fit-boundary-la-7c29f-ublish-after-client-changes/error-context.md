# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-fit-boundary.spec.ts >> late fit computation does not publish after client changes
- Location: tests/browser/capability-fit-boundary.spec.ts:11:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "GET core/clients/10000000-0000-4000-8000-000000000002/submission-history",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "Capabilities" [level=1] [ref=e5]
    - generic [ref=e6]:
      - button "Add capability" [ref=e7] [cursor=pointer]
      - button "Registrations & codes" [ref=e8] [cursor=pointer]
  - generic [ref=e9]:
    - generic [ref=e10]:
      - paragraph [ref=e11]: Capability areas
      - generic [ref=e12]: 1 areas · 1 fielded
    - button "▦ Second client capability Synthetic capability Fielded No program line mapped" [ref=e14] [cursor=pointer]:
      - generic [ref=e15]: ▦
      - strong [ref=e16]: Second client capability
      - paragraph [ref=e17]: Synthetic capability
      - generic [ref=e18]:
        - generic [ref=e19]: Fielded
        - generic [ref=e20]: No program line mapped
  - generic [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]:
        - paragraph [ref=e24]: Where capabilities create fit
        - heading "0 fit matches" [level=3] [ref=e25]
      - button "Refresh" [ref=e26] [cursor=pointer]
    - alert [ref=e27]:
      - paragraph [ref=e28]: signal is aborted without reason
      - button "Retry" [ref=e29] [cursor=pointer]
    - generic [ref=e30]: Computed 10/11/2026, 12:00:00 PM
    - paragraph [ref=e31]: No matches available.
  - region "Past performance" [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - paragraph [ref=e35]: Past performance
        - heading "Saved submissions" [level=2] [ref=e36]
        - paragraph [ref=e37]: Saved capability submissions and their recorded outcomes.
      - button "Refresh history" [ref=e38] [cursor=pointer]
    - alert [ref=e40]:
      - paragraph [ref=e41]: No fixture for this contract
      - button "Retry" [ref=e42] [cursor=pointer]
    - paragraph [ref=e43]: Removing a saved submission keeps its capability and documents.
  - paragraph [ref=e44]:
    - text: "Past advocacy:"
    - link "Advocacy history ↗" [ref=e45] [cursor=pointer]:
      - /url: /portfolio/10000000-0000-4000-8000-000000000002/objectives
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { clientId, json } from "./fixtures";
  3   | import {
  4   |   fit,
  5   |   holdResponse,
  6   |   installCapabilityBoundary,
  7   |   transition,
  8   | } from "./capability-boundary-fixtures";
  9   | 
  10  | for (const change of ["actor", "client", "role", "invalidate"])
  11  |   test(`late fit computation does not publish after ${change} changes`, async ({
  12  |     page,
  13  |   }) => {
  14  |     const unexpected = await installCapabilityBoundary(page);
  15  |     const held = await holdResponse(
  16  |       page,
  17  |       `**/core/clients/${clientId}/capability-fit/refresh`,
  18  |       "POST",
  19  |       { ...fit, computedAt: "2026-11-01T12:00:00Z" },
  20  |     );
  21  |     await page.goto("/capability-boundary.html");
  22  |     await page.getByRole("button", { name: "Refresh", exact: true }).click();
  23  |     await held.started;
  24  |     await transition(page, change);
  25  |     held.release();
  26  |     await held.settled;
  27  |     await expect(
  28  |       page.getByLabel("Synthetic pending capability writes"),
  29  |     ).toHaveText("0");
  30  |     await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
  31  |       "2026-10-11",
  32  |     );
  33  |     await expect(
  34  |       page.getByLabel("Synthetic original fit cache"),
  35  |     ).not.toContainText("2026-11-01");
  36  |     expect(held.calls()).toBe(1);
> 37  |     expect(unexpected).toEqual([]);
      |                        ^ Error: expect(received).toEqual(expected) // deep equality
  38  |   });
  39  | 
  40  | test("late fit computation cannot overwrite a newer successful read", async ({
  41  |   page,
  42  | }) => {
  43  |   const unexpected = await installCapabilityBoundary(page);
  44  |   const held = await holdResponse(
  45  |     page,
  46  |     `**/core/clients/${clientId}/capability-fit/refresh`,
  47  |     "POST",
  48  |     { ...fit, computedAt: "2026-11-01T12:00:00Z" },
  49  |   );
  50  |   await page.goto("/capability-boundary.html");
  51  |   await page.getByRole("button", { name: "Refresh", exact: true }).click();
  52  |   await held.started;
  53  |   await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
  54  |     json(route, { ...fit, computedAt: "2026-11-02T12:00:00Z" }),
  55  |   );
  56  |   await transition(page, "refetch-fit");
  57  |   await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
  58  |     "2026-11-02",
  59  |   );
  60  |   held.release();
  61  |   await held.settled;
  62  |   await expect(
  63  |     page.getByLabel("Synthetic pending capability writes"),
  64  |   ).toHaveText("0");
  65  |   await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
  66  |     "2026-11-02",
  67  |   );
  68  |   await expect(page.getByRole("alert")).toContainText(
  69  |     "Capability fit changed while refreshing",
  70  |   );
  71  |   await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  72  |   expect(unexpected).toEqual([]);
  73  | });
  74  | 
  75  | test("compute failure keeps an independently successful fit read available", async ({
  76  |   page,
  77  | }) => {
  78  |   const unexpected = await installCapabilityBoundary(page);
  79  |   await page.route(
  80  |     `**/core/clients/${clientId}/capability-fit/refresh`,
  81  |     (route) =>
  82  |       json(route, { message: "Synthetic computation unavailable" }, 503),
  83  |   );
  84  |   await page.goto("/capability-boundary.html");
  85  |   await page.getByRole("button", { name: "Refresh", exact: true }).click();
  86  |   await expect(page.getByRole("alert")).toContainText(
  87  |     "Synthetic computation unavailable",
  88  |   );
  89  |   await expect(
  90  |     page.getByRole("heading", { name: "1 fit matches" }),
  91  |   ).toBeVisible();
  92  |   await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  93  |   expect(unexpected).toEqual([]);
  94  | });
  95  | 
  96  | test("successful fit computation publishes the validated receipt", async ({
  97  |   page,
  98  | }) => {
  99  |   const unexpected = await installCapabilityBoundary(page);
  100 |   await page.route(
  101 |     `**/core/clients/${clientId}/capability-fit/refresh`,
  102 |     (route) => json(route, { ...fit, computedAt: "2026-11-03T12:00:00Z" }),
  103 |   );
  104 |   await page.goto("/capability-boundary.html");
  105 |   await page.getByRole("button", { name: "Refresh", exact: true }).click();
  106 |   await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
  107 |     "2026-11-03",
  108 |   );
  109 |   await expect(page.getByRole("alert")).toHaveCount(0);
  110 |   await expect(page.getByRole("link", { name: "Open target" })).toHaveAttribute(
  111 |     "href",
  112 |     "http://127.0.0.1:5191/existing/program-elements/0604134A",
  113 |   );
  114 |   expect(unexpected).toEqual([]);
  115 | });
  116 | 
```