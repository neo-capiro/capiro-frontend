# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio.spec.ts >> facility creation uses the selected client's endpoint and refreshes the map list
- Location: tests/browser/portfolio.spec.ts:60:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Add facility' }).getByLabel('Facility name')

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
              - button: Overview
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
        - generic:
          - generic:
            - generic:
              - generic:
                - paragraph: Client profile
                - heading [level=1]: Overview
              - generic:
                - button:
                  - img
                  - text: Notes
                - link:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
                  - text: New objective
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: TA
                    - generic:
                      - generic:
                        - heading [level=1]: Test Aerospace
                        - generic: ACTIVE
                      - generic:
                        - text: Aerospace ·
                        - link:
                          - /url: https://example.test/
                          - text: https://example.test
                  - paragraph: Synthetic organization for isolated UI validation.
                  - generic:
                    - generic: Focus
                    - button:
                      - text: + Add
                      - generic: focus tag
                  - generic:
                    - generic: Owner Unassigned
                    - button:
                      - img
                      - text: Account team · 0
                - region:
                  - generic:
                    - heading [level=2]: Engagement pulse
                    - link:
                      - /url: "#activity-timeline"
                      - text: Open timeline →
                  - generic:
                    - generic:
                      - strong: "0"
                      - paragraph: Recent activity items
                    - generic:
                      - strong: "0"
                      - paragraph: Account team
                    - generic:
                      - strong: —
                      - paragraph: Objective coverage unavailable
                - region:
                  - generic:
                    - heading [level=2]: Client details
                    - button: Government info
                  - generic:
                    - generic:
                      - term: Primary POC at client
                      - definition: Not provided
                    - generic:
                      - term: Main company email
                      - definition: Not provided
                    - generic:
                      - term: Main company phone
                      - definition: Not provided
                    - generic:
                      - term: Engagement start date
                      - definition: Not provided
                    - generic:
                      - term: Small Business Classification
                      - definition: Not provided
                    - generic:
                      - term: Funding priorities
                      - definition: Not provided
                    - generic:
                      - term: Internal notes
                      - definition: Not provided
                - generic:
                  - generic:
                    - heading [level=2]: Objectives
                    - link:
                      - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
                      - img
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?objective=30000000-0000-4000-8000-000000000001
                    - generic:
                      - strong: Test outcome
                      - generic: Draft
                    - paragraph: Test minimum win
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                    - text: View objectives
                    - img
              - generic:
                - region:
                  - generic:
                    - generic:
                      - heading [level=2]: District nexus
                      - paragraph: 0 locations · 0 states · 0 districts
                    - generic:
                      - button
                      - button
                  - generic:
                    - generic:
                      - img
                  - paragraph: No facilities yet. Add a location with the plus action.
                - generic:
                  - generic:
                    - heading [level=2]: Client calendar
                    - link:
                      - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                      - img
                  - paragraph: Meetings, preparation, notes and debriefs for this client.
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                    - text: Open calendar
            - region:
              - generic:
                - heading [level=2]: Activity timeline
                - button: Expand timeline ↗
              - generic:
                - generic:
                  - generic:
                    - generic: Search activity
                    - searchbox
                  - button: All activity
                  - button: All dates
              - paragraph: No activity to show.
              - generic:
                - generic: 0 activities
  - 'dialog "Facilities: Test Aerospace" [ref=e2]':
    - banner [ref=e3]:
      - 'heading "Facilities: Test Aerospace" [level=2] [ref=e4]'
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: "Facilities: Test Aerospace"
    - generic [ref=e10]:
      - paragraph [ref=e11]: Facilities give this client a congressional footprint. Each one’s state and district drive District Nexus, representative matching, and district-based recommendations.
      - list "Saved facilities"
      - paragraph [ref=e12]: No saved facilities yet.
      - generic [ref=e13]:
        - heading "Add facility" [level=3] [ref=e14]
        - group "Facility details" [ref=e15]:
          - generic [ref=e16]: Facility details
          - generic [ref=e17]:
            - text: Facility name
            - textbox "Facility name" [active] [ref=e18]
          - generic [ref=e19]:
            - text: Street address
            - textbox "Street address" [ref=e20]
          - generic [ref=e21]:
            - generic [ref=e22]:
              - text: City
              - textbox "City" [ref=e23]
            - generic [ref=e24]:
              - generic [ref=e25]: State / territory
              - combobox "State / territory" [ref=e26]:
                - option "Not set" [selected]
                - option "AL"
                - option "AK"
                - option "AZ"
                - option "AR"
                - option "CA"
                - option "CO"
                - option "CT"
                - option "DE"
                - option "DC"
                - option "FL"
                - option "GA"
                - option "HI"
                - option "ID"
                - option "IL"
                - option "IN"
                - option "IA"
                - option "KS"
                - option "KY"
                - option "LA"
                - option "ME"
                - option "MD"
                - option "MA"
                - option "MI"
                - option "MN"
                - option "MS"
                - option "MO"
                - option "MT"
                - option "NE"
                - option "NV"
                - option "NH"
                - option "NJ"
                - option "NM"
                - option "NY"
                - option "NC"
                - option "ND"
                - option "OH"
                - option "OK"
                - option "OR"
                - option "PA"
                - option "RI"
                - option "SC"
                - option "SD"
                - option "TN"
                - option "TX"
                - option "UT"
                - option "VT"
                - option "VA"
                - option "WA"
                - option "WV"
                - option "WI"
                - option "WY"
                - option "AS"
                - option "GU"
                - option "MP"
                - option "PR"
                - option "VI"
            - generic [ref=e27]:
              - text: ZIP code
              - textbox "ZIP code" [ref=e28]
          - generic [ref=e29]:
            - generic [ref=e30]:
              - text: Congressional district
              - textbox "Congressional district" [ref=e31]:
                - /placeholder: 12 or 00
            - generic [ref=e32]:
              - text: Employees
              - spinbutton "Employees" [ref=e33]
            - generic [ref=e34]:
              - text: State House district
              - textbox "State House district" [ref=e35]
            - generic [ref=e36]:
              - text: State Senate district
              - textbox "State Senate district" [ref=e37]
          - paragraph [ref=e38]: Use a bare House district number, or 00 for at-large. Leave districts blank to resolve from the address. A later successful geocode can replace manual state districts.
          - generic [ref=e39]:
            - generic [ref=e40]: Notes
            - textbox "Notes" [ref=e41]
        - generic [ref=e42]:
          - button "Cancel" [ref=e43] [cursor=pointer]
          - button "Save facility" [ref=e44] [cursor=pointer]
    - contentinfo [ref=e45]:
      - button "Add facility" [ref=e46] [cursor=pointer]
      - button "Done" [ref=e47] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import {
  3   |   sendingMailbox,
  4   |   installFixtures,
  5   |   json,
  6   |   client,
  7   |   clientId,
  8   |   personId,
  9   |   objective,
  10  |   capability,
  11  | } from "./fixtures";
  12  | test("four-field readiness persists once, transitions, and refreshes the list", async ({
  13  |   page,
  14  | }) => {
  15  |   const unexpected = await installFixtures(page);
  16  |   let writes = 0;
  17  |   let ready = false;
  18  |   let savedObjective = objective;
  19  |   await page.route(`**/clients/${clientId}/objectives**`, async (route) => {
  20  |     if (route.request().method() === "GET")
  21  |       return json(
  22  |         route,
  23  |         ready ? [{ ...savedObjective, status: "ready", version: 2 }] : [],
  24  |       );
  25  |     const body = route.request().postDataJSON();
  26  |     writes++;
  27  |     if (new URL(route.request().url()).pathname.endsWith("transition")) {
  28  |       expect(body).toEqual({ action: "confirm_ready", expectedVersion: 1 });
  29  |       ready = true;
  30  |       return json(route, { ...savedObjective, status: "ready", version: 2 });
  31  |     }
  32  |     expect(body.outcome).toBe("Test outcome");
  33  |     expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  34  |     savedObjective = { ...objective, ...body };
  35  |     return json(route, savedObjective);
  36  |   });
  37  |   await page.goto(`/portfolio/${clientId}/objectives?new=1`);
  38  |   const editor = page.getByRole("region", {
  39  |     name: "New objective",
  40  |     exact: true,
  41  |   });
  42  |   await editor.getByRole("button", { name: "Confirm ready" }).click();
  43  |   await expect(editor.getByRole("alert")).toContainText("Complete outcome");
  44  |   await editor.getByLabel(/^Outcome/).fill("Test outcome");
  45  |   await editor.getByLabel(/^Government problem/).fill("Test problem");
  46  |   await editor.getByRole("radio", { name: "Funding", exact: true }).check();
  47  |   await editor.getByLabel(/^Minimum win/).fill("Test minimum win");
  48  |   await editor.getByRole("button", { name: "Confirm ready" }).click();
  49  |   await page
  50  |     .getByRole("dialog", { name: "Confirm objective ready" })
  51  |     .getByRole("button", { name: "Confirm ready" })
  52  |     .click();
  53  |   await expect(editor).not.toBeVisible();
  54  |   await expect(
  55  |     page.locator("span.chip").filter({ hasText: /^Ready$/ }),
  56  |   ).toBeVisible();
  57  |   expect(writes).toBe(2);
  58  |   expect(unexpected).toEqual([]);
  59  | });
  60  | test("facility creation uses the selected client's endpoint and refreshes the map list", async ({
  61  |   page,
  62  | }) => {
  63  |   const unexpected = await installFixtures(page);
  64  |   let saved = false;
  65  |   const facility = {
  66  |     id: "facility-test",
  67  |     clientId,
  68  |     name: "Test lab",
  69  |     addressLine: null,
  70  |     city: "Austin",
  71  |     state: "TX",
  72  |     zip: null,
  73  |     congressionalDistrict: null,
  74  |     employeeCount: null,
  75  |     notes: null,
  76  |     geocodeStatus: "unresolved",
  77  |   };
  78  |   await page.route(`**/clients/${clientId}/facilities`, async (route) => {
  79  |     if (route.request().method() === "GET")
  80  |       return json(route, saved ? [facility] : []);
  81  |     expect(route.request().postDataJSON()).toMatchObject({
  82  |       name: "Test lab",
  83  |       city: "Austin",
  84  |       state: "TX",
  85  |     });
  86  |     saved = true;
  87  |     return json(route, facility);
  88  |   });
  89  |   await page.goto(`/portfolio/${clientId}`);
  90  |   await page.getByRole("button", { name: "Add facility" }).click();
  91  |   const dialog = page.getByRole("dialog", { name: "Add facility" });
> 92  |   await dialog.getByLabel("Facility name").fill("Test lab");
      |                                            ^ Error: locator.fill: Test timeout of 60000ms exceeded.
  93  |   await dialog.getByLabel("City", { exact: true }).fill("Austin");
  94  |   await dialog.getByLabel("State / territory").fill("tx");
  95  |   await dialog.getByRole("button", { name: "Add facility" }).click();
  96  |   await expect(dialog).not.toBeVisible();
  97  |   await expect(page.getByText("Test lab")).toBeVisible();
  98  |   expect(unexpected).toEqual([]);
  99  | });
  100 | test("mail is reviewed and a provider error remains visible without automatic retry", async ({
  101 |   page,
  102 | }) => {
  103 |   const unexpected = await installFixtures(page);
  104 |   let attempts = 0;
  105 |   await page.route("**/engagement/mail/send", async (route) => {
  106 |     attempts++;
  107 |     expect(route.request().postDataJSON()).toMatchObject({
  108 |       clientId,
  109 |       personIds: [personId],
  110 |       to: [{ email: "taylor@example.test", name: "Taylor Test" }],
  111 |     });
  112 |     await json(route, { message: "Test provider unavailable" }, 503);
  113 |   });
  114 |   await page.goto(`/portfolio/${clientId}/relationships?person=${personId}`);
  115 |   await page.getByRole("button", { name: "Mail", exact: true }).click();
  116 |   const compose = page.getByRole("dialog", { name: "New email" });
  117 |   await compose.getByLabel("Subject", { exact: true }).fill("Test subject");
  118 |   await compose
  119 |     .getByLabel("Message", { exact: true })
  120 |     .fill("Synthetic message <unsafe>");
  121 |   await compose.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  122 |   await compose.getByRole("button", { name: "Review email" }).click();
  123 |   expect(attempts).toBe(0);
  124 |   const review = page.getByRole("dialog", { name: "Send email" });
  125 |   await review.getByRole("button", { name: "Send email" }).click();
  126 |   await expect(review).toContainText("Test provider unavailable");
  127 |   await expect(
  128 |     review.getByRole("button", { name: "Send email" }),
  129 |   ).toBeDisabled();
  130 |   await expect(review.getByText(/Sending may have completed/)).toBeVisible();
  131 |   expect(attempts).toBe(1);
  132 |   expect(unexpected).toEqual([]);
  133 | });
  134 | test("capability edits invalidate the list and retain unrelated registration codes", async ({
  135 |   page,
  136 | }) => {
  137 |   const unexpected = await installFixtures(page);
  138 |   let updated = false;
  139 |   await page.route(`**/clients/${clientId}/capabilities**`, async (route) => {
  140 |     if (route.request().method() === "GET")
  141 |       return json(route, [
  142 |         { ...capability, name: updated ? "Updated sensor" : capability.name },
  143 |       ]);
  144 |     expect(route.request().method()).toBe("PATCH");
  145 |     updated = true;
  146 |     return json(route, { ...capability, ...route.request().postDataJSON() });
  147 |   });
  148 |   await page.goto(
  149 |     `/portfolio/${clientId}/capabilities?capability=${capability.id}`,
  150 |   );
  151 |   const editor = page.getByRole("dialog", {
  152 |     name: `Capability: ${capability.name}`,
  153 |   });
  154 |   await editor.getByText("Details", { exact: true }).click();
  155 |   await editor.getByLabel("Name", { exact: true }).fill("Updated sensor");
  156 |   await editor.getByRole("button", { name: "Save capability" }).click();
  157 |   await expect(page.getByText("Updated sensor", { exact: true })).toBeVisible();
  158 |   await page.getByRole("button", { name: "Registrations & codes" }).click();
  159 |   await page.getByRole("button", { name: "Edit registrations" }).click();
  160 |   await page.route(`**/clients/${clientId}`, async (route) => {
  161 |     if (route.request().method() === "GET") return route.fallback();
  162 |     expect(route.request().postDataJSON().setAsideCertifications).toContain(
  163 |       "LEGACY_CODE",
  164 |     );
  165 |     await json(route, { ...client, ...route.request().postDataJSON() });
  166 |   });
  167 |   await page.getByRole("button", { name: "Save registrations" }).click();
  168 |   await expect(
  169 |     page.getByRole("button", { name: "Edit registrations" }),
  170 |   ).toBeVisible();
  171 |   expect(unexpected).toEqual([]);
  172 | });
  173 | test("navigation, permissions, session expiry and mobile layout use real feature components", async ({
  174 |   page,
  175 | }) => {
  176 |   const unexpected = await installFixtures(page);
  177 |   await page.goto("/portfolio");
  178 |   await page
  179 |     .getByRole("link", { name: "Open Test Aerospace", exact: true })
  180 |     .click();
  181 |   await expect(page).toHaveURL(new RegExp(clientId));
  182 |   await page.getByRole("link", { name: "Work", exact: true }).click();
  183 |   await expect(
  184 |     page.getByRole("heading", { name: "Client work" }),
  185 |   ).toBeVisible();
  186 |   await page.setViewportSize({ width: 390, height: 844 });
  187 |   expect(
  188 |     await page.evaluate(
  189 |       () => document.documentElement.scrollWidth <= innerWidth,
  190 |     ),
  191 |   ).toBe(true);
  192 |   await page.getByRole("button", { name: "Toggle navigation" }).click();
```