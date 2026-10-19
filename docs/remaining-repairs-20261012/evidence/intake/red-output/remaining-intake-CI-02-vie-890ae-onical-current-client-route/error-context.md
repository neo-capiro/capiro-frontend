# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-intake.spec.ts >> CI-02 view search selects the canonical current-client route
- Location: apps/web/tests/browser/remaining-intake.spec.ts:56:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('combobox', { name: 'Jump to a view' })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('combobox', { name: 'Jump to a view' })

```

```yaml
- 'menu "Switch client view: Overview"':
  - menuitem "Overview"
  - menuitem "Objectives"
  - menuitem "Calendar"
  - menuitem "Relationships"
  - menuitem "Work"
  - menuitem "Capabilities"
  - menuitem "Bill Tracker"
  - menuitem "Opportunities"
  - menuitem "Files"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { client, clientId, installFixtures, json } from "./fixtures";
  3   | import { installProfileCurrentState } from "./profile-current-state-fixtures";
  4   | 
  5   | const details = {
  6   |   ...client,
  7   |   primaryContactName: "Synthetic Contact",
  8   |   primaryContactEmail: "contact@example.test",
  9   |   primaryContactPhone: "+1 202 555 0142",
  10  |   cageCode: "1AB2C",
  11  |   uei: "ABC123DEF456",
  12  |   naicsCodes: ["541330"],
  13  |   pscCodes: ["R425"],
  14  |   applicantTypes: ["Small businesses"],
  15  |   submissionTracks: ["NDAA"],
  16  |   issueCodes: ["DEF"],
  17  |   intakeData: {
  18  |     ein: "123456789",
  19  |     samStatus: "Active",
  20  |     samExpirationDate: "2027-06-14",
  21  |     ldaRegistrantName: "Synthetic Registrant",
  22  |     sectors: ["DEFENSE"],
  23  |     fundingPriorities: ["Synthetic funding priority"],
  24  |     engagementStartDate: "2026-09-01",
  25  |     internalNotes: "Saved synthetic intake note",
  26  |     sbClassification: { sb: true },
  27  |   },
  28  | };
  29  | 
  30  | test("CI-01 standard reader can inspect saved client details and government fields", async ({ page }, info) => {
  31  |   const unexpected = await installFixtures(page);
  32  |   const writes: string[] = [];
  33  |   page.on("request", (request) => {
  34  |     if (request.url().includes("/api/") && request.method() !== "GET") writes.push(request.url());
  35  |   });
  36  |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) => json(route, details));
  37  |   await page.route("**/api/backend/core/me", (route) => json(route, {
  38  |     user: { id: "91000000-0000-4000-8000-000000000001", clerkUserId: "user-test", email: "reader@example.test", name: "Synthetic Reader" },
  39  |     tenant: { id: "92000000-0000-4000-8000-000000000001", name: "Synthetic Firm" }, role: "standard_user",
  40  |   }));
  41  |   await page.goto(`/portfolio/${clientId}`);
  42  |   await expect(page.getByRole("heading", { name: "Client details", exact: true })).toBeVisible();
  43  |   await expect(page.getByText(details.primaryContactEmail, { exact: true })).toBeVisible();
  44  |   await expect(page.getByText("Saved synthetic intake note", { exact: true })).toBeVisible();
  45  |   await page.getByRole("button", { name: "Government info", exact: true }).click();
  46  |   const dialog = page.getByRole("dialog", { name: "Government info", exact: true });
  47  |   for (const value of ["1AB2C", "ABC123DEF456", "123456789", "Synthetic Registrant", "541330", "R425", "DEF", "NDAA Authorization Request"]) await expect(dialog.getByText(value, { exact: true })).toBeVisible();
  48  |   await expect(dialog.getByRole("button", { name: /Edit/ })).toHaveCount(0);
  49  |   await page.screenshot({ path: info.outputPath("government-standard-reader.png") });
  50  |   await page.keyboard.press("Escape");
  51  |   await expect(page.getByRole("button", { name: "Government info", exact: true })).toBeFocused();
  52  |   expect(writes).toEqual([]);
  53  |   expect(unexpected).toEqual([]);
  54  | });
  55  | 
  56  | test("CI-02 view search selects the canonical current-client route", async ({ page }, info) => {
  57  |   const unexpected = await installFixtures(page);
  58  |   await page.goto(`/portfolio/${clientId}`);
  59  |   await page.getByRole("button", { name: "Switch client view: Overview" }).click();
  60  |   const search = page.getByRole("combobox", { name: "Jump to a view" });
> 61  |   await expect(search).toBeFocused();
      |                        ^ Error: expect(locator).toBeFocused() failed
  62  |   await search.fill("files");
  63  |   await expect(page.getByRole("option")).toHaveCount(1);
  64  |   await page.screenshot({ path: info.outputPath("view-search.png") });
  65  |   await search.press("Enter");
  66  |   await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
  67  |   await page.keyboard.press("g");
  68  |   await page.keyboard.press("o");
  69  |   await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  70  |   expect(unexpected).toEqual([]);
  71  | });
  72  | 
  73  | test("CI-03 account roster shows supplied member email and inline addition", async ({ page }, info) => {
  74  |   const { state, unexpected } = await installProfileCurrentState(page);
  75  |   await page.goto("/profile-current-state.html?mode=team");
  76  |   const row = page.getByRole("listitem").filter({ hasText: "Olivia Owner" });
  77  |   await expect(row.getByText(state.team[0]!.email!, { exact: false })).toBeVisible();
  78  |   const member = await page.getByLabel("Add team member", { exact: true }).boundingBox();
  79  |   const role = await page.getByLabel("Role", { exact: true }).boundingBox();
  80  |   expect(member).not.toBeNull(); expect(role).not.toBeNull();
  81  |   expect(Math.abs(member!.y - role!.y)).toBeLessThan(2);
  82  |   await page.screenshot({ path: info.outputPath("account-team-desktop.png") });
  83  |   expect(state.writes).toEqual([]); expect(unexpected).toEqual([]);
  84  | });
  85  | 
  86  | test("CI-04 choice groups retain their distinct desktop layouts", async ({ page }, info) => {
  87  |   const unexpected = await installFixtures(page);
  88  |   await page.goto("/portfolio");
  89  |   await page.getByRole("button", { name: "Add profile", exact: true }).first().click();
  90  |   await page.getByRole("button", { name: /Manual entry/ }).click();
  91  |   const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  92  |   const company = dialog.getByRole("group", { name: "Small Business Classification" });
  93  |   const outer = await company.boundingBox();
  94  |   const foreign = await company.locator("label").filter({ hasText: "Foreign-owned" }).boundingBox();
  95  |   expect(foreign!.width).toBeGreaterThan(outer!.width * 0.9);
  96  |   await page.screenshot({ path: info.outputPath("company-choices.png") });
  97  |   await dialog.getByRole("button", { name: "2. Government Registration", exact: true }).click();
  98  |   const certifications = dialog.getByRole("group", { name: "Federal set-aside certifications" }).locator("label");
  99  |   const y = await certifications.evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().y));
  100 |   expect(new Set(y.map(Math.round)).size).toBe(1);
  101 |   await page.screenshot({ path: info.outputPath("registration-choices.png") });
  102 |   await dialog.getByRole("button", { name: "3. Sector & Tracks", exact: true }).click();
  103 |   const tracks = dialog.getByRole("group", { name: "Active submission tracks" }).locator("label");
  104 |   const positions = await tracks.evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().y));
  105 |   expect(positions[0]).toBe(positions[1]); expect(positions[2]).toBeGreaterThan(positions[1]!);
  106 |   await page.screenshot({ path: info.outputPath("track-choices.png") });
  107 |   expect(unexpected).toEqual([]);
  108 | });
  109 | 
```