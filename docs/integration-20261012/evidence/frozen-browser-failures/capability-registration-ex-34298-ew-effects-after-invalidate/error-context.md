# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-registration-execution.spec.ts >> late registration receipt has no old-view effects after invalidate
- Location: tests/browser/capability-registration-execution.spec.ts:48:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - generic:
      - banner:
        - heading [level=1]: Capabilities
        - generic:
          - button: Add capability
          - button: Registrations & codes
      - generic:
        - generic:
          - paragraph: Capability areas
          - generic: 1 areas · 1 fielded
        - generic:
          - button:
            - generic: ▦
            - strong: Test sensor
            - paragraph: Synthetic capability
            - generic:
              - generic: Fielded
              - generic: No program line mapped
      - generic:
        - generic:
          - generic:
            - paragraph: Where capabilities create fit
            - heading [level=3]: 1 fit matches
          - button [disabled]: Refresh
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
          - button [disabled]: Refresh history
        - generic:
          - paragraph: A current authorized session is required to inspect saved submission history.
        - paragraph: Removing a saved submission keeps its capability and documents.
      - paragraph:
        - text: "Past advocacy:"
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
          - text: Advocacy history ↗
  - dialog "Registrations & codes" [ref=e2]:
    - banner [ref=e3]:
      - heading "Registrations & codes" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Registrations & codes
    - generic [ref=e10]:
      - group [ref=e11]:
        - generic [ref=e12]:
          - text: UEI
          - textbox "UEI" [disabled] [ref=e13]: EEEEFFFF9012
        - generic [ref=e14]:
          - text: CAGE
          - textbox "CAGE" [disabled] [ref=e15]: 1ABCD
        - generic [ref=e16]:
          - text: NAICS codes (comma separated)
          - textbox "NAICS codes (comma separated)" [disabled] [ref=e17]: "541330"
        - generic [ref=e18]:
          - text: PSC codes (comma separated)
          - textbox "PSC codes (comma separated)" [disabled] [ref=e19]: R425
        - group "Held certifications" [ref=e20]:
          - generic [ref=e21]: Held certifications
          - generic [ref=e23]: LEGACY_CODE · Existing code retained
          - generic [ref=e24]:
            - checkbox "8A" [checked] [disabled] [ref=e25]
            - text: 8A
          - generic [ref=e26]:
            - checkbox "SDVOSB" [disabled] [ref=e27]
            - text: SDVOSB
          - generic [ref=e28]:
            - checkbox "VOSB" [disabled] [ref=e29]
            - text: VOSB
          - generic [ref=e30]:
            - checkbox "WOSB" [disabled] [ref=e31]
            - text: WOSB
          - generic [ref=e32]:
            - checkbox "EDWOSB" [disabled] [ref=e33]
            - text: EDWOSB
          - generic [ref=e34]:
            - checkbox "HUBZONE" [disabled] [ref=e35]
            - text: HUBZONE
        - generic [ref=e36]: EIN, primary NAICS and registry details are read-only in this form.
      - alert [ref=e37]:
        - paragraph [ref=e38]: signal is aborted without reason
      - generic [ref=e39]: Saving requires current client details and an administrator session.
      - generic [ref=e40]:
        - button "Save registrations" [disabled] [ref=e41]
        - button "Cancel" [ref=e42] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { clientId, json } from "./fixtures";
  3   | import { holdResponse, transition } from "./capability-boundary-fixtures";
  4   | import {
  5   |   installRegistrationBoundary,
  6   |   openRegistrations,
  7   |   registrationClient,
  8   | } from "./capability-registration-fixtures";
  9   | 
  10  | for (const change of [
  11  |   "standard-role",
  12  |   "role",
  13  |   "invalidate",
  14  |   "refetch-identity",
  15  | ])
  16  |   test(`registration write rechecks the native administrator gate after ${change}`, async ({
  17  |     page,
  18  |   }) => {
  19  |     const unexpected = await installRegistrationBoundary(page);
  20  |     let writes = 0;
  21  |     await page.route(`**/core/clients/${clientId}`, (route) => {
  22  |       if (route.request().method() !== "PUT") return route.fallback();
  23  |       writes += 1;
  24  |       return json(route, registrationClient);
  25  |     });
  26  |     const dialog = await openRegistrations(page, true);
  27  |     if (change === "refetch-identity")
  28  |       await page.route("**/core/me", (route) =>
  29  |         json(route, { message: "Synthetic identity denied" }, 403),
  30  |       );
  31  |     await transition(page, change);
  32  |     await expect(
  33  |       dialog.getByRole("button", { name: "Save registrations", exact: true }),
  34  |     ).toBeDisabled();
  35  |     await expect(dialog.getByLabel("UEI", { exact: true })).toBeDisabled();
  36  |     await dialog
  37  |       .locator("form")
  38  |       .evaluate((form: HTMLFormElement) => form.requestSubmit());
  39  |     await expect(
  40  |       page.getByLabel("Synthetic pending capability writes"),
  41  |     ).toHaveText("0");
  42  |     await expect(dialog.getByRole("alert").first()).toBeVisible();
  43  |     expect(writes).toBe(0);
  44  |     expect(unexpected).toEqual([]);
  45  |   });
  46  | 
  47  | for (const change of ["actor", "standard-role", "invalidate", "client"])
  48  |   test(`late registration receipt has no old-view effects after ${change}`, async ({
  49  |     page,
  50  |   }) => {
  51  |     const unexpected = await installRegistrationBoundary(page);
  52  |     let reads = 0;
  53  |     await page.route(`**/core/clients/${clientId}`, (route) => {
  54  |       if (route.request().method() !== "GET") return route.fallback();
  55  |       reads += 1;
  56  |       return json(route, registrationClient);
  57  |     });
  58  |     const held = await holdResponse(
  59  |       page,
  60  |       `**/core/clients/${clientId}`,
  61  |       "PUT",
  62  |       registrationClient,
  63  |     );
  64  |     const dialog = await openRegistrations(page, true);
  65  |     await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  66  |     await dialog
  67  |       .getByRole("button", { name: "Save registrations", exact: true })
  68  |       .click();
  69  |     await held.started;
  70  |     await transition(page, change);
  71  |     if (change === "client") {
  72  |       await expect(
  73  |         dialog.getByText("CCCCDDDD5678", { exact: true }),
  74  |       ).toBeVisible();
  75  |       await expect(dialog.locator("form")).toHaveCount(0);
  76  |     }
  77  |     held.release();
  78  |     await held.settled;
  79  |     await expect(
  80  |       page.getByLabel("Synthetic pending capability writes"),
  81  |     ).toHaveText("0");
  82  |     await expect(
  83  |       page.getByLabel("Synthetic original client cache"),
  84  |     ).toContainText('"isInvalidated":false');
  85  |     if (change !== "client")
  86  |       await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
  87  |         "EEEEFFFF9012",
  88  |       );
> 89  |     expect(reads).toBe(1);
      |                   ^ Error: expect(received).toBe(expected) // Object.is equality
  90  |     expect(held.calls()).toBe(1);
  91  |     expect(unexpected).toEqual([]);
  92  |   });
  93  | 
  94  | test("registration save freezes one draft, preserves legacy codes and refreshes exact current values", async ({
  95  |   page,
  96  | }) => {
  97  |   const unexpected = await installRegistrationBoundary(page);
  98  |   let current = registrationClient;
  99  |   let payload: Record<string, unknown> | undefined;
  100 |   await page.route(`**/core/clients/${clientId}`, (route) =>
  101 |     route.request().method() === "GET"
  102 |       ? json(route, current)
  103 |       : route.fallback(),
  104 |   );
  105 |   page.on("request", (request) => {
  106 |     if (
  107 |       request.method() === "PUT" &&
  108 |       request.url().endsWith(`/core/clients/${clientId}`)
  109 |     )
  110 |       payload = request.postDataJSON();
  111 |   });
  112 |   const held = await holdResponse(page, `**/core/clients/${clientId}`, "PUT", {
  113 |     ...registrationClient,
  114 |     uei: "EEEEFFFF9012",
  115 |   });
  116 |   const dialog = await openRegistrations(page, true);
  117 |   await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  118 |   await dialog
  119 |     .getByLabel("NAICS codes (comma separated)", { exact: true })
  120 |     .fill("541330, 541715, 541330");
  121 |   await dialog
  122 |     .getByRole("button", { name: "Save registrations", exact: true })
  123 |     .click();
  124 |   await held.started;
  125 |   await expect(dialog.getByLabel("UEI", { exact: true })).toBeDisabled();
  126 |   await expect(
  127 |     dialog.getByRole("button", { name: "Save registrations", exact: true }),
  128 |   ).toBeDisabled();
  129 |   await expect(
  130 |     dialog.getByRole("button", { name: "Cancel", exact: true }),
  131 |   ).toBeDisabled();
  132 |   await dialog
  133 |     .locator("form")
  134 |     .evaluate((form: HTMLFormElement) => form.requestSubmit());
  135 |   await page.keyboard.press("Escape");
  136 |   await expect(dialog).toBeVisible();
  137 |   expect(payload).toEqual({
  138 |     uei: "EEEEFFFF9012",
  139 |     cageCode: registrationClient.cageCode,
  140 |     naicsCodes: ["541330", "541715"],
  141 |     pscCodes: registrationClient.pscCodes,
  142 |     setAsideCertifications: registrationClient.setAsideCertifications,
  143 |   });
  144 |   current = { ...registrationClient, ...payload } as typeof registrationClient;
  145 |   held.release();
  146 |   await held.settled;
  147 |   await expect(dialog.locator("form")).toHaveCount(0);
  148 |   await expect(dialog.getByText("EEEEFFFF9012", { exact: true })).toBeVisible();
  149 |   await expect(
  150 |     page.getByLabel("Synthetic original client cache"),
  151 |   ).toContainText("Separate concurrent profile notes");
  152 |   expect(held.calls()).toBe(1);
  153 |   expect(unexpected).toEqual([]);
  154 | });
  155 | 
  156 | for (const status of [403, 503])
  157 |   test(`registration HTTP ${status} write failure preserves the draft and never retries itself`, async ({
  158 |     page,
  159 |   }) => {
  160 |     const unexpected = await installRegistrationBoundary(page);
  161 |     let writes = 0;
  162 |     await page.route(`**/core/clients/${clientId}`, (route) => {
  163 |       if (route.request().method() !== "PUT") return route.fallback();
  164 |       writes += 1;
  165 |       return json(
  166 |         route,
  167 |         { message: "Synthetic registration write failure" },
  168 |         status,
  169 |       );
  170 |     });
  171 |     const dialog = await openRegistrations(page, true);
  172 |     await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  173 |     await dialog
  174 |       .getByRole("button", { name: "Save registrations", exact: true })
  175 |       .click();
  176 |     await expect(dialog.getByRole("alert")).toBeVisible();
  177 |     await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
  178 |       "EEEEFFFF9012",
  179 |     );
  180 |     await expect(
  181 |       dialog.getByRole("button", { name: "Save registrations", exact: true }),
  182 |     ).toBeEnabled();
  183 |     await expect(
  184 |       page.getByLabel("Synthetic original client cache"),
  185 |     ).toContainText('"isInvalidated":false');
  186 |     expect(writes).toBe(1);
  187 |     expect(unexpected).toEqual([]);
  188 |   });
  189 | 
```