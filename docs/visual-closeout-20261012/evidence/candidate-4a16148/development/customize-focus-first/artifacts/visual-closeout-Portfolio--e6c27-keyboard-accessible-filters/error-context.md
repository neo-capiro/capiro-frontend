# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-closeout.spec.ts >> Portfolio Customize retains unavailable guards and keyboard-accessible filters
- Location: tests/browser/visual-closeout.spec.ts:116:1

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByLabel('Sort profiles')
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Sort profiles')
    14 × locator resolved to <select aria-label="Sort profiles">…</select>
       - unexpected value "visible"

```

```yaml
- combobox "Sort profiles":
  - option "Saved order" [selected]
  - option "Recently added"
  - option "Name A–Z"
```

# Test source

```ts
  60  |   await expect(
  61  |     page.getByRole("dialog", { name: "Account team", exact: true }),
  62  |   ).toBeVisible();
  63  |   await trigger.press("Enter");
  64  |   await expect(secondary).toHaveValue(profileMembers[1]!.id);
  65  |   await page.setViewportSize({ width: 390, height: 844 });
  66  |   await page.emulateMedia({ colorScheme: "dark" });
  67  |   expect(
  68  |     await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  69  |   ).toBe(true);
  70  |   await page.screenshot({
  71  |     path: info.outputPath("owners-mobile-dark-after.png"),
  72  |   });
  73  |   await page.keyboard.press("Escape");
  74  |   await expect(trigger).toBeFocused();
  75  |   expect(state.writes).toEqual([]);
  76  |   expect(unexpected).toEqual([]);
  77  | });
  78  | 
  79  | test("closing only the Owners dialog during a PUT preserves its uncertainty fence", async ({
  80  |   page,
  81  | }) => {
  82  |   const { state, unexpected } = await installProfileCurrentState(page);
  83  |   let release!: () => void;
  84  |   const held = new Promise<void>((resolve) => {
  85  |     release = resolve;
  86  |   });
  87  |   state.write = async (route) => {
  88  |     await held;
  89  |     await json(route, state.owners).catch(() => undefined);
  90  |   };
  91  |   await page.goto("/profile-current-state.html?mode=team");
  92  |   await page.getByRole("button", { name: "Manage owners" }).click();
  93  |   await page
  94  |     .getByRole("combobox", { name: "Primary owner", exact: true })
  95  |     .selectOption(profileMembers[2]!.id);
  96  |   await page.getByRole("button", { name: "Save owners", exact: true }).click();
  97  |   await expect.poll(() => state.writes.length).toBe(1);
  98  |   await page.getByRole("button", { name: "Cancel", exact: true }).click();
  99  |   release();
  100 |   await page.getByRole("button", { name: "Manage owners" }).click();
  101 |   await expect(
  102 |     page.getByText(/owner change result needs review/i),
  103 |   ).toBeVisible();
  104 |   await expect(
  105 |     page.getByRole("button", { name: "Save owners", exact: true }),
  106 |   ).toBeDisabled();
  107 |   await page.getByRole("button", { name: "Read current owners" }).click();
  108 |   await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  109 |   await expect(
  110 |     page.getByRole("combobox", { name: "Primary owner", exact: true }),
  111 |   ).toHaveValue(profileMembers[2]!.id);
  112 |   expect(state.writes).toHaveLength(1);
  113 |   expect(unexpected).toEqual([]);
  114 | });
  115 | 
  116 | test("Portfolio Customize retains unavailable guards and keyboard-accessible filters", async ({
  117 |   page,
  118 | }, info) => {
  119 |   const unexpected = await installFixtures(page);
  120 |   await page.goto("/portfolio");
  121 |   const header = page
  122 |     .locator("header")
  123 |     .filter({ has: page.getByRole("heading", { name: /^Portfolio/ }) });
  124 |   await expect(
  125 |     header.getByLabel("Account owner", { exact: true }),
  126 |   ).toBeVisible();
  127 |   await expect(
  128 |     page.getByText("Saved profile ordering is unavailable", { exact: false }),
  129 |   ).toBeVisible();
  130 |   await expect(
  131 |     page.getByRole("button", { name: /Drag .* to rearrange/ }),
  132 |   ).toHaveCount(0);
  133 |   await page.screenshot({
  134 |     path: info.outputPath("index-unavailable-after.png"),
  135 |   });
  136 |   await header.getByRole("button", { name: "Customize", exact: true }).click();
  137 |   await expect(
  138 |     page.getByRole("button", { name: /Drag .* to rearrange/ }),
  139 |   ).toBeDisabled();
  140 |   await expect(page.getByText(/Changes stay local until/)).toHaveCount(0);
  141 |   await expect(
  142 |     page.getByText(
  143 |       "Drag any card to rearrange · your layout is saved to your profile",
  144 |       { exact: true },
  145 |     ),
  146 |   ).toHaveCount(0);
  147 |   await page
  148 |     .getByRole("button", { name: "Done customizing", exact: true })
  149 |     .click();
  150 |   await expect(
  151 |     header.getByRole("button", { name: "Customize", exact: true }),
  152 |   ).toBeFocused();
  153 |   const disclosure = page.getByText("Filters and view", { exact: true });
  154 |   await disclosure.focus();
  155 |   await disclosure.press("Enter");
  156 |   await expect(page.getByLabel("Sort profiles")).toBeVisible();
  157 |   await page.getByLabel("Sort profiles").focus();
  158 |   await page.keyboard.press("Escape");
  159 |   await expect(disclosure).toBeFocused();
> 160 |   await expect(page.getByLabel("Sort profiles")).not.toBeVisible();
      |                                                      ^ Error: expect(locator).not.toBeVisible() failed
  161 |   await page.setViewportSize({ width: 390, height: 844 });
  162 |   await disclosure.press("Enter");
  163 |   expect(
  164 |     await page.evaluate(
  165 |       () => document.documentElement.scrollWidth <= innerWidth,
  166 |     ),
  167 |   ).toBe(true);
  168 |   await page.screenshot({
  169 |     path: info.outputPath("index-mobile-filters-after.png"),
  170 |   });
  171 |   expect(unexpected).toEqual([]);
  172 | });
  173 | 
  174 | test("capability create offers current-client suggestions, inline required marker and sharp scrim", async ({
  175 |   page,
  176 | }, info) => {
  177 |   const unexpected = await installCapabilityPresentation(page);
  178 |   await page.goto(`/portfolio/${clientId}/capabilities`);
  179 |   const trigger = page.getByRole("button", {
  180 |     name: "Add capability",
  181 |     exact: true,
  182 |   });
  183 |   await trigger.click();
  184 |   const dialog = page.getByRole("dialog", {
  185 |     name: "New capability",
  186 |     exact: true,
  187 |   });
  188 |   await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  189 |   const label = dialog
  190 |     .locator('input[name="name"]')
  191 |     .locator("..")
  192 |     .locator(":scope > span");
  193 |   await expect(label).toHaveText("Name *");
  194 |   expect((await label.boundingBox())!.height).toBeLessThan(25);
  195 |   for (const name of ["Type", "Sector"]) {
  196 |     const field = dialog.getByLabel(name, { exact: true });
  197 |     await expect(field).toHaveAttribute("list", /.+/);
  198 |     await expect(
  199 |       field.locator("..").getByText("▾", { exact: true }),
  200 |     ).toBeVisible();
  201 |     await field.fill(`Unlisted ${name} / arbitrary value`);
  202 |     await expect(field).toHaveValue(`Unlisted ${name} / arbitrary value`);
  203 |   }
  204 |   await expect(dialog.locator("datalist option[value=Defense]")).toHaveCount(1);
  205 |   await expect(page.locator("[data-slot=dialog-overlay]")).toHaveCSS(
  206 |     "backdrop-filter",
  207 |     "none",
  208 |   );
  209 |   await page.screenshot({
  210 |     path: info.outputPath("capability-create-after.png"),
  211 |   });
  212 |   await page.mouse.click(250, 90);
  213 |   await expect(dialog).toHaveCount(0);
  214 |   await expect(trigger).toBeFocused();
  215 |   expect(unexpected).toEqual([]);
  216 | });
  217 | 
  218 | test("Bill Tracker retains table/board/filter controls inside its compact results frame", async ({
  219 |   page,
  220 | }, info) => {
  221 |   const unexpected = await installFixtures(page);
  222 |   await page.goto(`/portfolio/${clientId}/bills`);
  223 |   await expect(
  224 |     page.getByRole("heading", { name: "Bill Tracker", exact: true }),
  225 |   ).toHaveCSS("font-size", "20px");
  226 |   const results = page.getByRole("region", {
  227 |     name: "Tracked bill results",
  228 |     exact: true,
  229 |   });
  230 |   await expect(
  231 |     results.getByRole("heading", { name: "Tracked bills", exact: true }),
  232 |   ).toBeVisible();
  233 |   await expect(results.getByRole("table")).toBeVisible();
  234 |   await results.getByLabel("Filter loaded bills").fill("synthetic");
  235 |   await results
  236 |     .getByRole("button", { name: "Board view", exact: true })
  237 |     .click();
  238 |   await expect(page).toHaveURL(/q=synthetic&view=board/);
  239 |   await expect(results.getByLabel("Filter loaded bills")).toHaveValue(
  240 |     "synthetic",
  241 |   );
  242 |   await results
  243 |     .getByRole("button", { name: "Table view", exact: true })
  244 |     .click();
  245 |   await expect(results.getByRole("table")).toBeVisible();
  246 |   await page.screenshot({ path: info.outputPath("bills-desktop-after.png") });
  247 |   await page.setViewportSize({ width: 390, height: 844 });
  248 |   expect(
  249 |     await page.evaluate(
  250 |       () => document.documentElement.scrollWidth <= innerWidth,
  251 |     ),
  252 |   ).toBe(true);
  253 |   await page.screenshot({ path: info.outputPath("bills-mobile-after.png") });
  254 |   expect(unexpected).toEqual([]);
  255 | });
  256 | 
```