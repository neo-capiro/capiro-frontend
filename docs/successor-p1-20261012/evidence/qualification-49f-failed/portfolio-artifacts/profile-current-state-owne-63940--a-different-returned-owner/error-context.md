# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-current-state.spec.ts >> owner assignment rejects a different returned owner
- Location: tests/browser/profile-current-state.spec.ts:163:1

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('button', { name: 'Save owners' })
    - locator resolved to <button class="button primary">Save owners</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Test source

```ts
  77  |   const pending = new Promise<void>((resolve) => {
  78  |     release = resolve;
  79  |   });
  80  |   state.write = async (route) => {
  81  |     await pending;
  82  |     await json(route, {
  83  |       ...profileClient,
  84  |       intakeData: { profileNotes: "Old actor draft" },
  85  |     }).catch(() => {});
  86  |   };
  87  |   await page.goto("/profile-current-state.html");
  88  |   await page.getByLabel("Notes", { exact: true }).fill("Old actor draft");
  89  |   await page.getByRole("button", { name: "Save notes" }).click();
  90  |   await expect.poll(() => state.writes.length).toBe(1);
  91  |   await profileEvent(page, "identity", {
  92  |     ...profileIdentity,
  93  |     user: { ...profileIdentity.user, id: "replacement-admin" },
  94  |   });
  95  |   release();
  96  |   await expect(
  97  |     page.getByRole("dialog", { name: "Profile notes" }),
  98  |   ).toBeVisible();
  99  |   await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
  100 |     "Saved profile notes",
  101 |   );
  102 |   await expect(page.getByTestId("profile-closures")).toHaveText("Closures: 0");
  103 |   expect(unexpected).toEqual([]);
  104 | });
  105 | 
  106 | test("failed account-team refresh conceals cached members and disables changes", async ({
  107 |   page,
  108 | }) => {
  109 |   const { state, unexpected } = await installProfileCurrentState(page);
  110 |   await page.goto("/profile-current-state.html?mode=team");
  111 |   await expect(
  112 |     page.getByRole("listitem").filter({ hasText: "Terry Team" }),
  113 |   ).toBeVisible();
  114 |   state.teamStatus = 403;
  115 |   await profileEvent(page, "refresh");
  116 |   await expect(page.getByRole("alert")).toBeVisible();
  117 |   await expect(
  118 |     page.getByRole("listitem").filter({ hasText: "Terry Team" }),
  119 |   ).toHaveCount(0);
  120 |   await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  121 |   await page.getByRole("button", { name: "Manage owners" }).click();
  122 |   await expect(
  123 |     page.getByRole("combobox", { name: "Primary owner", exact: true }),
  124 |   ).toBeDisabled();
  125 |   expect(state.writes).toEqual([]);
  126 |   expect(unexpected).toEqual([]);
  127 | });
  128 | 
  129 | test("failed member options cannot submit a retained selection", async ({
  130 |   page,
  131 | }) => {
  132 |   const { state, unexpected } = await installProfileCurrentState(page);
  133 |   await page.goto("/profile-current-state.html?mode=team");
  134 |   await page.getByLabel("Add team member").selectOption(profileMembers[2]!.id);
  135 |   await page.getByLabel("Role", { exact: true }).fill("Research");
  136 |   state.membersStatus = 403;
  137 |   await profileEvent(page, "refresh");
  138 |   await expect(page.getByRole("alert")).toBeVisible();
  139 |   await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  140 |   await expect(page.getByLabel("Role", { exact: true })).toHaveValue(
  141 |     "Research",
  142 |   );
  143 |   expect(state.writes).toEqual([]);
  144 |   expect(unexpected).toEqual([]);
  145 | });
  146 | 
  147 | test("team add needs the requested native roster effect", async ({ page }) => {
  148 |   const { state, unexpected } = await installProfileCurrentState(page);
  149 |   state.write = (route) => json(route, state.team);
  150 |   await page.goto("/profile-current-state.html?mode=team");
  151 |   await page.getByLabel("Add team member").selectOption(profileMembers[2]!.id);
  152 |   await page.getByLabel("Role", { exact: true }).fill("Research");
  153 |   await page.getByRole("button", { name: "Add member" }).click();
  154 |   await expect(page.getByText(/change result is unknown/i)).toBeVisible();
  155 |   await expect(
  156 |     page.getByText("Team updated.", { exact: true }),
  157 |   ).not.toBeVisible();
  158 |   await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  159 |   expect(state.writes).toHaveLength(1);
  160 |   expect(unexpected).toEqual([]);
  161 | });
  162 | 
  163 | test("owner assignment rejects a different returned owner", async ({
  164 |   page,
  165 | }) => {
  166 |   const { state, unexpected } = await installProfileCurrentState(page);
  167 |   state.write = (route) =>
  168 |     json(route, {
  169 |       ...state.owners,
  170 |       version: state.owners.version + 1,
  171 |     });
  172 |   await page.goto("/profile-current-state.html?mode=team");
  173 |   await page.getByRole("button", { name: "Manage owners" }).click();
  174 |   await page
  175 |     .getByRole("combobox", { name: "Primary owner", exact: true })
  176 |     .selectOption(profileMembers[2]!.id);
> 177 |   await page.getByRole("button", { name: "Save owners" }).click();
      |                                                           ^ Error: locator.click: Test ended.
  178 |   await expect(
  179 |     page.getByText(/owner change result needs review/i),
  180 |   ).toBeVisible();
  181 |   await expect(
  182 |     page.getByText("Team updated.", { exact: true }),
  183 |   ).not.toBeVisible();
  184 |   expect(state.writes).toHaveLength(1);
  185 |   expect(unexpected).toEqual([]);
  186 | });
  187 | 
  188 | test("failed facilities refresh conceals saved locations and closes their detail", async ({
  189 |   page,
  190 | }) => {
  191 |   const { state, unexpected } = await installProfileCurrentState(page);
  192 |   await page.goto("/profile-current-state.html?mode=facilities");
  193 |   await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  194 |   await expect(
  195 |     page.getByRole("dialog", { name: "Synthetic profile lab" }),
  196 |   ).toBeVisible();
  197 |   state.facilitiesStatus = 403;
  198 |   await profileEvent(page, "refresh");
  199 |   await expect(page.getByRole("alert")).toBeVisible();
  200 |   await expect(
  201 |     page.getByRole("dialog", { name: "Synthetic profile lab" }),
  202 |   ).not.toBeVisible();
  203 |   await expect(
  204 |     page.getByRole("button", { name: /Synthetic profile lab/ }),
  205 |   ).toHaveCount(0);
  206 |   await expect(
  207 |     page.getByRole("button", { name: "Add facility", exact: true }),
  208 |   ).toBeDisabled();
  209 |   expect(state.writes).toEqual([]);
  210 |   expect(unexpected).toEqual([]);
  211 | });
  212 | 
  213 | test("a removed facility selection does not reopen when that ID returns", async ({
  214 |   page,
  215 | }) => {
  216 |   const { state, unexpected } = await installProfileCurrentState(page);
  217 |   await page.goto("/profile-current-state.html?mode=facilities");
  218 |   await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  219 |   state.facilities = [];
  220 |   await profileEvent(page, "refresh");
  221 |   await expect(
  222 |     page.getByRole("dialog", { name: "Synthetic profile lab" }),
  223 |   ).not.toBeVisible();
  224 |   state.facilities = [{ ...profileFacility }];
  225 |   await profileEvent(page, "refresh");
  226 |   await expect(
  227 |     page.getByRole("button", { name: /Synthetic profile lab/ }),
  228 |   ).toBeVisible();
  229 |   await expect(
  230 |     page.getByRole("dialog", { name: "Synthetic profile lab" }),
  231 |   ).not.toBeVisible();
  232 |   expect(unexpected).toEqual([]);
  233 | });
  234 | 
  235 | test("unknown facility creation stays fenced after closing and reopening", async ({
  236 |   page,
  237 | }) => {
  238 |   const { state, unexpected } = await installProfileCurrentState(page);
  239 |   state.write = (route) =>
  240 |     json(route, { message: "Synthetic lost result" }, 503);
  241 |   await page.goto("/profile-current-state.html?mode=facilities");
  242 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  243 |   let dialog = page.getByRole("dialog", { name: "Add facility" });
  244 |   await dialog.getByLabel("Facility name").fill("Uncertain new lab");
  245 |   await dialog.getByRole("button", { name: "Add facility" }).click();
  246 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  247 |   await dialog.getByRole("button", { name: "Close", exact: true }).click();
  248 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  249 |   dialog = page.getByRole("dialog", { name: "Add facility" });
  250 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  251 |   await expect(
  252 |     dialog.getByRole("button", { name: "Add facility", exact: true }),
  253 |   ).toBeDisabled();
  254 |   expect(state.writes).toHaveLength(1);
  255 |   expect(unexpected).toEqual([]);
  256 | });
  257 | 
  258 | test("identity invalidation disables facility creation despite a cached role", async ({
  259 |   page,
  260 | }) => {
  261 |   const { state, unexpected } = await installProfileCurrentState(page);
  262 |   await page.goto("/profile-current-state.html?mode=facilities");
  263 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  264 |   const dialog = page.getByRole("dialog", { name: "Add facility" });
  265 |   await dialog.getByLabel("Facility name").fill("Retained facility draft");
  266 |   await profileEvent(page, "invalidate-identity");
  267 |   await expect(
  268 |     dialog.getByRole("button", { name: "Add facility", exact: true }),
  269 |   ).toBeDisabled();
  270 |   expect(state.writes).toEqual([]);
  271 |   expect(unexpected).toEqual([]);
  272 | });
  273 | 
```