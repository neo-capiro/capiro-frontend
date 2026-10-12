# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: profile-write-lifetime.spec.ts >> closing a pending facility create keeps the unknown fence when its view reopens
- Location: tests/browser/profile-write-lifetime.spec.ts:206:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Add facility' }).getByText(/creation result is unknown/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Add facility' }).getByText(/creation result is unknown/i)

```

```yaml
- dialog "Add facility":
  - banner:
    - heading "Add facility" [level=2]
    - button "Close"
  - paragraph: Location for Synthetic profile client. Complete the address to request automatic geocoding.
  - group "Facility details":
    - text: Facility details Facility name
    - textbox "Facility name"
    - text: Street address
    - textbox "Street address"
    - text: City
    - textbox "City"
    - text: State / territory
    - textbox "State / territory":
      - /placeholder: CA
    - text: ZIP code
    - textbox "ZIP code"
    - text: Employees
    - spinbutton "Employees"
    - text: Congressional district
    - textbox "Congressional district":
      - /placeholder: 12 or 00
    - text: State House district
    - textbox "State House district"
    - text: State Senate district
    - textbox "State Senate district"
    - paragraph: Use a bare House district number, or 00 for at-large. Leave districts blank to resolve from the address. A later successful geocode can replace manual state districts.
    - text: Notes
    - textbox "Notes"
  - button "Cancel"
  - button "Add facility"
```

# Test source

```ts
  135 |   expect(state.writes).toHaveLength(1);
  136 |   expect(unexpected).toEqual([]);
  137 | });
  138 | 
  139 | test("a successfully removed member option leaves the retained choice unavailable", async ({
  140 |   page,
  141 | }) => {
  142 |   const { state, unexpected } = await installProfileCurrentState(page);
  143 |   await page.goto("/profile-current-state.html?mode=team");
  144 |   await page
  145 |     .getByLabel("Add team member")
  146 |     .selectOption("81000000-0000-4000-8000-000000000003");
  147 |   await page.getByLabel("Role", { exact: true }).fill("Retained role");
  148 |   state.members = state.members.filter(
  149 |     (member) => member.id !== "81000000-0000-4000-8000-000000000003",
  150 |   );
  151 |   await profileEvent(page, "refresh");
  152 |   await expect(
  153 |     page.getByRole("option", { name: "Selected member unavailable" }),
  154 |   ).toBeAttached();
  155 |   await expect(page.getByRole("button", { name: "Add member" })).toBeDisabled();
  156 |   await expect(page.getByLabel("Role", { exact: true })).toHaveValue(
  157 |     "Retained role",
  158 |   );
  159 |   expect(state.writes).toEqual([]);
  160 |   expect(unexpected).toEqual([]);
  161 | });
  162 | 
  163 | test("late team receipts do not report success or invalidate a replacement client view", async ({
  164 |   page,
  165 | }) => {
  166 |   const { state, unexpected } = await installProfileCurrentState(page);
  167 |   let release!: () => void;
  168 |   const pending = new Promise<void>((resolve) => {
  169 |     release = resolve;
  170 |   });
  171 |   const member = profileMembers[2]!;
  172 |   state.write = async (route) => {
  173 |     await pending;
  174 |     await json(route, [
  175 |       ...state.team,
  176 |       {
  177 |         ...member,
  178 |         userId: member.id,
  179 |         id: "membership-new",
  180 |         role: "Analyst",
  181 |         isOwner: false,
  182 |         addedAt: "2026-10-11T12:00:00Z",
  183 |       },
  184 |     ]).catch(() => {});
  185 |   };
  186 |   await page.goto("/profile-current-state.html?mode=team");
  187 |   await page.getByLabel("Add team member").selectOption(member.id);
  188 |   await page.getByLabel("Role", { exact: true }).fill("Analyst");
  189 |   await page.getByRole("button", { name: "Add member" }).click();
  190 |   await expect.poll(() => state.writes.length).toBe(1);
  191 |   const initialReads = state.reads.team;
  192 |   await profileEvent(page, "client", otherProfileClientId);
  193 |   await expect.poll(() => state.reads.team).toBeGreaterThan(initialReads);
  194 |   await expect(page.getByLabel("Role", { exact: true })).toHaveValue("");
  195 |   const currentReads = state.reads.team;
  196 |   release();
  197 |   await settleProfileView(page);
  198 |   await expect(
  199 |     page.getByText("Team updated.", { exact: true }),
  200 |   ).not.toBeVisible();
  201 |   expect(state.reads.team).toBe(currentReads);
  202 |   expect(state.writes).toHaveLength(1);
  203 |   expect(unexpected).toEqual([]);
  204 | });
  205 | 
  206 | test("closing a pending facility create keeps the unknown fence when its view reopens", async ({
  207 |   page,
  208 | }) => {
  209 |   const { state, unexpected } = await installProfileCurrentState(page);
  210 |   let release!: () => void;
  211 |   const pending = new Promise<void>((resolve) => {
  212 |     release = resolve;
  213 |   });
  214 |   state.write = async (route) => {
  215 |     await pending;
  216 |     await json(route, {
  217 |       ...profileFacility,
  218 |       id: "created-late",
  219 |       name: "Late facility",
  220 |     }).catch(() => {});
  221 |   };
  222 |   await page.goto("/profile-current-state.html?mode=facilities");
  223 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  224 |   await page.getByLabel("Facility name").fill("Late facility");
  225 |   await page
  226 |     .getByRole("dialog", { name: "Add facility" })
  227 |     .getByRole("button", { name: "Add facility" })
  228 |     .click();
  229 |   await expect.poll(() => state.writes.length).toBe(1);
  230 |   await profileEvent(page, "unmount");
  231 |   release();
  232 |   await profileEvent(page, "open");
  233 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  234 |   const dialog = page.getByRole("dialog", { name: "Add facility" });
> 235 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  236 |   await expect(
  237 |     dialog.getByRole("button", { name: "Add facility" }),
  238 |   ).toBeDisabled();
  239 |   expect(state.writes).toHaveLength(1);
  240 |   expect(unexpected).toEqual([]);
  241 | });
  242 | 
  243 | test("a similar current facility cannot be claimed as an unknown creation receipt", async ({
  244 |   page,
  245 | }) => {
  246 |   const { state, unexpected } = await installProfileCurrentState(page);
  247 |   state.write = (route) =>
  248 |     json(route, { message: "Lost create response" }, 503);
  249 |   await page.goto("/profile-current-state.html?mode=facilities");
  250 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  251 |   let dialog = page.getByRole("dialog", { name: "Add facility" });
  252 |   await dialog.getByLabel("Facility name").fill("Similar facility");
  253 |   await dialog.getByRole("button", { name: "Add facility" }).click();
  254 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  255 |   state.facilities = [
  256 |     ...state.facilities,
  257 |     { ...profileFacility, id: "similar-native-id", name: "Similar facility" },
  258 |   ];
  259 |   await dialog
  260 |     .getByRole("button", { name: "Review current facilities" })
  261 |     .click();
  262 |   await expect(dialog.getByText(/Current saved locations:/)).toContainText(
  263 |     "Similar facility",
  264 |   );
  265 |   await expect(
  266 |     dialog.getByRole("button", { name: "Add facility" }),
  267 |   ).toBeDisabled();
  268 |   await dialog
  269 |     .getByRole("button", { name: "Start a separate facility entry" })
  270 |     .click();
  271 |   dialog = page.getByRole("dialog", { name: "Add facility" });
  272 |   await expect(dialog.getByLabel("Facility name")).toHaveValue("");
  273 |   expect(state.writes).toHaveLength(1);
  274 |   expect(unexpected).toEqual([]);
  275 | });
  276 | 
  277 | test("a changed saved facility cannot be overwritten by an older open draft", async ({
  278 |   page,
  279 | }) => {
  280 |   const { state, unexpected } = await installProfileCurrentState(page);
  281 |   await page.goto("/profile-current-state.html?mode=facilities");
  282 |   await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  283 |   await page
  284 |     .getByRole("button", { name: "Edit facility", exact: true })
  285 |     .click();
  286 |   const dialog = page.getByRole("dialog", { name: "Edit facility" });
  287 |   await dialog.getByLabel("Notes", { exact: true }).fill("Local unsaved note");
  288 |   state.facilities = [{ ...profileFacility, notes: "Another saved note" }];
  289 |   await profileEvent(page, "refresh");
  290 |   await expect(
  291 |     dialog.getByText(/saved facility changed or is unavailable/i),
  292 |   ).toBeVisible();
  293 |   await expect(
  294 |     dialog.getByRole("button", { name: "Save changes" }),
  295 |   ).toBeDisabled();
  296 |   await expect(dialog.getByLabel("Notes", { exact: true })).toHaveValue(
  297 |     "Local unsaved note",
  298 |   );
  299 |   await dialog
  300 |     .getByRole("button", { name: "Review current facilities" })
  301 |     .click();
  302 |   await dialog
  303 |     .getByRole("button", { name: "Use the reviewed facility" })
  304 |     .click();
  305 |   await expect(dialog.getByLabel("Notes", { exact: true })).toHaveValue(
  306 |     "Another saved note",
  307 |   );
  308 |   expect(state.writes).toEqual([]);
  309 |   expect(unexpected).toEqual([]);
  310 | });
  311 | 
  312 | test("a late facility result cannot escape its original actor's unknown fence", async ({
  313 |   page,
  314 | }) => {
  315 |   const { state, unexpected } = await installProfileCurrentState(page);
  316 |   let release!: () => void;
  317 |   const pending = new Promise<void>((resolve) => {
  318 |     release = resolve;
  319 |   });
  320 |   state.write = async (route) => {
  321 |     await pending;
  322 |     await json(route, {
  323 |       ...profileFacility,
  324 |       id: "old-actor-created",
  325 |       name: "Old actor facility",
  326 |     }).catch(() => {});
  327 |   };
  328 |   await page.goto("/profile-current-state.html?mode=facilities");
  329 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  330 |   await page.getByLabel("Facility name").fill("Old actor facility");
  331 |   await page
  332 |     .getByRole("dialog", { name: "Add facility" })
  333 |     .getByRole("button", { name: "Add facility" })
  334 |     .click();
  335 |   await expect.poll(() => state.writes.length).toBe(1);
```