# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-intake.spec.ts >> CI-03 account roster shows supplied member email and inline addition
- Location: apps/web/tests/browser/remaining-intake.spec.ts:118:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Add team member', { exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic profile checks. All service requests are intercepted.
      - paragraph: "Closures: 0"
  - dialog "Account team" [ref=e2]:
    - banner [ref=e3]:
      - heading "Account team" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: The firm's members assigned to this client. Ranked account owners remain on the team until their ownership is explicitly changed.
    - list "Account team members" [ref=e10]:
      - listitem [ref=e11]:
        - generic [ref=e12]: OO
        - generic [ref=e13]:
          - strong [ref=e14]: Olivia Owner
          - generic [ref=e15]: Account owner · owner@example.test
        - generic [ref=e16]: Owner
      - listitem [ref=e17]:
        - generic [ref=e18]: TT
        - generic [ref=e19]:
          - strong [ref=e20]: Terry Team
          - generic [ref=e21]: Team member · Analyst · team@example.test
        - button "Remove" [ref=e22] [cursor=pointer]
    - generic [ref=e23]:
      - generic [ref=e24]:
        - text: Add team member
        - combobox "Add team member" [ref=e25]:
          - option "Choose a member" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e26]:
        - text: Role
        - textbox "Role" [ref=e27]
      - button "Add member" [disabled] [ref=e28]
    - button "Manage owners" [ref=e29] [cursor=pointer]
    - button "Done" [ref=e31] [cursor=pointer]
```

# Test source

```ts
  29  | 
  30  | test("CI-01 standard reader can inspect saved client details and government fields", async ({
  31  |   page,
  32  | }, info) => {
  33  |   const unexpected = await installFixtures(page);
  34  |   const writes: string[] = [];
  35  |   page.on("request", (request) => {
  36  |     if (request.url().includes("/api/") && request.method() !== "GET")
  37  |       writes.push(request.url());
  38  |   });
  39  |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  40  |     json(route, details),
  41  |   );
  42  |   await page.route("**/api/backend/core/me", (route) =>
  43  |     json(route, {
  44  |       user: {
  45  |         id: "91000000-0000-4000-8000-000000000001",
  46  |         clerkUserId: "user-test",
  47  |         email: "reader@example.test",
  48  |         name: "Synthetic Reader",
  49  |       },
  50  |       tenant: {
  51  |         id: "92000000-0000-4000-8000-000000000001",
  52  |         name: "Synthetic Firm",
  53  |       },
  54  |       role: "standard_user",
  55  |     }),
  56  |   );
  57  |   await page.goto(`/portfolio/${clientId}`);
  58  |   await expect(
  59  |     page.getByRole("heading", { name: "Client details", exact: true }),
  60  |   ).toBeVisible();
  61  |   await expect(
  62  |     page.getByText(details.primaryContactEmail, { exact: true }),
  63  |   ).toBeVisible();
  64  |   await expect(
  65  |     page.getByText("Saved synthetic intake note", { exact: true }),
  66  |   ).toBeVisible();
  67  |   await page
  68  |     .getByRole("button", { name: "Government info", exact: true })
  69  |     .click();
  70  |   const dialog = page.getByRole("dialog", {
  71  |     name: "Government info",
  72  |     exact: true,
  73  |   });
  74  |   for (const value of [
  75  |     "1AB2C",
  76  |     "ABC123DEF456",
  77  |     "123456789",
  78  |     "Synthetic Registrant",
  79  |     "541330",
  80  |     "R425",
  81  |     "DEF",
  82  |     "NDAA Authorization Request",
  83  |   ])
  84  |     await expect(dialog.getByText(value, { exact: true })).toBeVisible();
  85  |   await expect(dialog.getByRole("button", { name: /Edit/ })).toHaveCount(0);
  86  |   await page.screenshot({
  87  |     path: info.outputPath("government-standard-reader.png"),
  88  |   });
  89  |   await page.keyboard.press("Escape");
  90  |   await expect(
  91  |     page.getByRole("button", { name: "Government info", exact: true }),
  92  |   ).toBeFocused();
  93  |   expect(writes).toEqual([]);
  94  |   expect(unexpected).toEqual([]);
  95  | });
  96  | 
  97  | test("CI-02 view search selects the canonical current-client route", async ({
  98  |   page,
  99  | }, info) => {
  100 |   const unexpected = await installFixtures(page);
  101 |   await page.goto(`/portfolio/${clientId}`);
  102 |   await page
  103 |     .getByRole("button", { name: "Switch client view: Overview" })
  104 |     .click();
  105 |   const search = page.getByRole("combobox", { name: "Jump to a view" });
  106 |   await expect(search).toBeFocused();
  107 |   await search.fill("files");
  108 |   await expect(page.getByRole("option")).toHaveCount(1);
  109 |   await page.screenshot({ path: info.outputPath("view-search.png") });
  110 |   await search.press("Enter");
  111 |   await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
  112 |   await page.keyboard.press("g");
  113 |   await page.keyboard.press("o");
  114 |   await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  115 |   expect(unexpected).toEqual([]);
  116 | });
  117 | 
  118 | test("CI-03 account roster shows supplied member email and inline addition", async ({
  119 |   page,
  120 | }, info) => {
  121 |   const { state, unexpected } = await installProfileCurrentState(page);
  122 |   await page.goto("/profile-current-state.html?mode=team");
  123 |   const row = page.getByRole("listitem").filter({ hasText: "Olivia Owner" });
  124 |   await expect(
  125 |     row.getByText(state.team[0]!.email!, { exact: false }),
  126 |   ).toBeVisible();
  127 |   const member = await page
  128 |     .getByLabel("Add team member", { exact: true })
> 129 |     .boundingBox();
      |      ^ Error: locator.boundingBox: Test timeout of 30000ms exceeded.
  130 |   const role = await page.getByLabel("Role", { exact: true }).boundingBox();
  131 |   expect(member).not.toBeNull();
  132 |   expect(role).not.toBeNull();
  133 |   expect(Math.abs(member!.y - role!.y)).toBeLessThan(2);
  134 |   await page.screenshot({ path: info.outputPath("account-team-desktop.png") });
  135 |   expect(state.writes).toEqual([]);
  136 |   expect(unexpected).toEqual([]);
  137 | });
  138 | 
  139 | test("CI-04 choice groups retain their distinct desktop layouts", async ({
  140 |   page,
  141 | }, info) => {
  142 |   const unexpected = await installFixtures(page);
  143 |   await page.goto("/portfolio");
  144 |   await page
  145 |     .getByRole("button", { name: "Add profile", exact: true })
  146 |     .first()
  147 |     .click();
  148 |   await page.getByRole("button", { name: /Manual entry/ }).click();
  149 |   const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  150 |   const company = dialog.getByRole("group", {
  151 |     name: "Small Business Classification",
  152 |   });
  153 |   const outer = await company.boundingBox();
  154 |   const foreign = await company
  155 |     .locator("label")
  156 |     .filter({ hasText: "Foreign-owned" })
  157 |     .boundingBox();
  158 |   expect(foreign!.width).toBeGreaterThan(outer!.width * 0.9);
  159 |   await page.screenshot({ path: info.outputPath("company-choices.png") });
  160 |   await dialog
  161 |     .getByRole("button", { name: "2. Government Registration", exact: true })
  162 |     .click();
  163 |   const certifications = dialog
  164 |     .getByRole("group", { name: "Federal set-aside certifications" })
  165 |     .locator("label");
  166 |   const y = await certifications.evaluateAll((labels) =>
  167 |     labels.map((label) => label.getBoundingClientRect().y),
  168 |   );
  169 |   expect(new Set(y.map(Math.round)).size).toBe(1);
  170 |   await page.screenshot({ path: info.outputPath("registration-choices.png") });
  171 |   await dialog
  172 |     .getByRole("button", { name: "3. Sector & Tracks", exact: true })
  173 |     .click();
  174 |   const tracks = dialog
  175 |     .getByRole("group", { name: "Active submission tracks" })
  176 |     .locator("label");
  177 |   const positions = await tracks.evaluateAll((labels) =>
  178 |     labels.map((label) => label.getBoundingClientRect().y),
  179 |   );
  180 |   expect(positions[0]).toBe(positions[1]);
  181 |   expect(positions[2]).toBeGreaterThan(positions[1]!);
  182 |   await page.screenshot({ path: info.outputPath("track-choices.png") });
  183 |   expect(unexpected).toEqual([]);
  184 | });
  185 | 
```