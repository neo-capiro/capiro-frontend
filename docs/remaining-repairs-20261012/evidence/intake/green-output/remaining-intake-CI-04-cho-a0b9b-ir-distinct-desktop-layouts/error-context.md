# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-intake.spec.ts >> CI-04 choice groups retain their distinct desktop layouts
- Location: apps/web/tests/browser/remaining-intake.spec.ts:139:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Add profile', exact: true }).first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:oxc] Transform failed with 1 error: [PARSE_ERROR] Unexpected token ╭─[ apps/web/src/features/portfolio/client-profile/ClientHeader.tsx:20:4 ] │ 20 │ }, []); │ ┬ │ ╰── ────╯"
  - generic [ref=e5]: /workspace/capiro-remaining-intake/apps/web/src/features/portfolio/client-profile/ClientHeader.tsx
  - generic [ref=e6]: at transformWithOxc (file:///workspace/capiro-followup/node_modules/vite/dist/node/chunks/node.js:7581:19) at TransformPluginContext.transform (file:///workspace/capiro-followup/node_modules/vite/dist/node/chunks/node.js:7653:26) at EnvironmentPluginContainer.transform (file:///workspace/capiro-followup/node_modules/vite/dist/node/chunks/node.js:8545:51) at async loadAndTransform (file:///workspace/capiro-followup/node_modules/vite/dist/node/chunks/node.js:20184:26) at async viteTransformMiddleware (file:///workspace/capiro-followup/node_modules/vite/dist/node/chunks/node.js:20404:20)
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.js
    - text: .
```

# Test source

```ts
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
  129 |     .boundingBox();
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
> 147 |     .click();
      |      ^ Error: locator.click: Test timeout of 30000ms exceeded.
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