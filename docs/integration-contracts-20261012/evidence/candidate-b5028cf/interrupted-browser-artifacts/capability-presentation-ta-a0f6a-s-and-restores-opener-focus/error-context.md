# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-presentation.spec.ts >> tab and disclosure keyboard navigation excludes inactive Profile controls and restores opener focus
- Location: tests/browser/capability-presentation.spec.ts:195:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('dialog', { name: 'Capability: Counter-UAS interceptors', exact: true }).getByLabel('Name', { exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Capability: Counter-UAS interceptors', exact: true }).getByLabel('Name', { exact: true })
    14 × locator resolved to <input required="" name="name" maxlength="300" value="Counter-UAS interceptors" placeholder="Specific capability name"/>
       - unexpected value "inactive"

```

```yaml
- 'dialog "Capability: Counter-UAS interceptors"':
  - banner:
    - 'heading "Capability: Counter-UAS interceptors" [level=2]'
    - button "Close"
  - paragraph: "Capability: Counter-UAS interceptors"
  - tablist "Capability sections":
    - tab "Profile" [selected]
    - tab "Documents"
  - tabpanel "Profile":
    - group:
      - text: product Defense
      - button "Remove capability": Delete
      - group "Technology Readiness Level":
        - text: Technology Readiness Level TRL 6 · Prototype
        - button "Clear TRL"
        - button "TRL 1": "1"
        - button "TRL 2": "2"
        - button "TRL 3": "3"
        - button "TRL 4": "4"
        - button "TRL 5": "5"
        - button "TRL 6" [pressed]: "6"
        - button "TRL 7": "7"
        - button "TRL 8": "8"
        - button "TRL 9": "9"
      - text: Tags autonomy
      - button "Remove autonomy from Tags": ×
      - text: counter-uas
      - button "Remove counter-uas from Tags": ×
      - textbox "Tags":
        - /placeholder: Pick or add tags
      - text: PE numbers 0604201A
      - button "Remove 0604201A from PE numbers": ×
      - text: 0605603A
      - button "Remove 0605603A from PE numbers": ×
      - textbox "PE numbers":
        - /placeholder: e.g. 0604201A, add and press Enter
      - text: Match keywords counter UAS
      - button "Remove counter UAS from Match keywords": ×
      - text: kinetic intercept
      - button "Remove kinetic intercept from Match keywords": ×
      - textbox "Match keywords":
        - /placeholder: Keywords that match PE text
      - text: Description
      - textbox "Description":
        - /placeholder: Describe this capability…
        - text: Synthetic interceptor profile for visual and keyboard checks.
      - text: Notes
      - textbox "Notes":
        - /placeholder: Internal notes…
        - text: Synthetic internal context.
      - group: Details
    - contentinfo:
      - button "Cancel"
      - button "Save capability"
```

# Test source

```ts
  141 |   await add.press("Enter");
  142 |   const editor = page.getByRole("dialog", {
  143 |     name: "New capability",
  144 |     exact: true,
  145 |   });
  146 |   await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
  147 |   await expect(editor.getByRole("tab")).toHaveCount(0);
  148 |   await expect(editor.getByLabel("PE numbers", { exact: true })).toHaveCount(0);
  149 |   await expect(
  150 |     editor.getByLabel("Match keywords", { exact: true }),
  151 |   ).toHaveCount(0);
  152 |   await expect(
  153 |     editor.getByRole("button", { name: "Upload document", exact: true }),
  154 |   ).toHaveCount(0);
  155 |   await editor.getByLabel("Name", { exact: true }).fill(expected.name);
  156 |   await editor.getByLabel("Type", { exact: true }).fill(expected.type);
  157 |   await editor.getByLabel("Sector", { exact: true }).fill(expected.sector);
  158 |   await editor
  159 |     .getByLabel("Description", { exact: true })
  160 |     .fill(expected.description);
  161 |   await editor.getByLabel("Tags", { exact: true }).fill("new tag");
  162 |   await editor.getByLabel("Tags", { exact: true }).press("Enter");
  163 |   await editor
  164 |     .getByRole("button", { name: "TRL 5", exact: true })
  165 |     .press("Space");
  166 |   const details = editor.getByText("Additional details", { exact: true });
  167 |   await details.focus();
  168 |   await details.press("Enter");
  169 |   await editor
  170 |     .getByRole("combobox", {
  171 |       name: "Manufacturing Readiness Level",
  172 |       exact: true,
  173 |     })
  174 |     .selectOption("9");
  175 |   await editor.getByLabel("Notes", { exact: true }).fill(expected.notes);
  176 |   await details.click();
  177 |   expect(writes).toBe(0);
  178 |   await editor
  179 |     .getByRole("button", { name: "Add capability", exact: true })
  180 |     .click();
  181 |   await expect(editor).toHaveCount(0);
  182 |   await page.getByRole("button", { name: /New synthetic capability/ }).click();
  183 |   const created = page.getByRole("dialog", {
  184 |     name: `Capability: ${expected.name}`,
  185 |     exact: true,
  186 |   });
  187 |   await expect(
  188 |     created.getByRole("tab", { name: "Documents", exact: true }),
  189 |   ).toBeVisible();
  190 |   await expect(created.getByLabel("PE numbers", { exact: true })).toBeVisible();
  191 |   expect(writes).toBe(1);
  192 |   expect(unexpected).toEqual([]);
  193 | });
  194 | 
  195 | test("tab and disclosure keyboard navigation excludes inactive Profile controls and restores opener focus", async ({
  196 |   page,
  197 | }) => {
  198 |   const unexpected = await installCapabilityPresentation(page);
  199 |   await page.goto(`/portfolio/${clientId}/capabilities`);
  200 |   const card = page.getByRole("button", { name: /Counter-UAS interceptors/ });
  201 |   await card.focus();
  202 |   await card.press("Enter");
  203 |   const editor = page.getByRole("dialog", {
  204 |     name: `Capability: ${presentedCapability.name}`,
  205 |     exact: true,
  206 |   });
  207 |   const profile = editor.getByRole("tab", { name: "Profile", exact: true });
  208 |   const documents = editor.getByRole("tab", { name: "Documents", exact: true });
  209 |   await expect(profile).toBeFocused();
  210 |   await profile.press("ArrowRight");
  211 |   await expect(documents).toBeFocused();
  212 |   await expect(documents).toHaveAttribute("aria-selected", "true");
  213 |   await expect(
  214 |     editor.getByRole("tabpanel", { name: "Profile", exact: true }),
  215 |   ).toHaveCount(0);
  216 |   await expect(
  217 |     editor.locator('[role="tabpanel"][data-state="inactive"]'),
  218 |   ).toHaveCount(1);
  219 |   await expect(editor.getByRole("textbox")).toHaveCount(0);
  220 |   for (let step = 0; step < 7; step += 1) {
  221 |     await page.keyboard.press("Tab");
  222 |     expect(
  223 |       await page.evaluate(() =>
  224 |         Boolean(
  225 |           document.activeElement?.closest(
  226 |             '[role="tabpanel"][data-state="inactive"]',
  227 |           ),
  228 |         ),
  229 |       ),
  230 |     ).toBe(false);
  231 |     expect(
  232 |       await editor.evaluate((node) => node.contains(document.activeElement)),
  233 |     ).toBe(true);
  234 |   }
  235 |   await documents.focus();
  236 |   await documents.press("ArrowLeft");
  237 |   const details = editor.getByText("Details", { exact: true });
  238 |   await details.focus();
  239 |   await details.press("Enter");
  240 |   await page.keyboard.press("Tab");
> 241 |   await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
      |                                                            ^ Error: expect(locator).toBeFocused() failed
  242 |   await page.keyboard.press("Escape");
  243 |   await expect(editor).toHaveCount(0);
  244 |   await expect(card).toBeFocused();
  245 |   const add = page.getByRole("button", { name: "Add capability", exact: true });
  246 |   await add.focus();
  247 |   await add.press("Enter");
  248 |   const create = page.getByRole("dialog", {
  249 |     name: "New capability",
  250 |     exact: true,
  251 |   });
  252 |   await expect(create.getByLabel("Name", { exact: true })).toBeFocused();
  253 |   await page.keyboard.press("Escape");
  254 |   await expect(create).toHaveCount(0);
  255 |   await expect(add).toBeFocused();
  256 |   expect(unexpected).toEqual([]);
  257 | });
  258 | 
  259 | test("saving an invalid Name inside collapsed Details reveals and focuses the field without writing", async ({
  260 |   page,
  261 | }) => {
  262 |   const unexpected = await installCapabilityPresentation(page);
  263 |   let writes = 0;
  264 |   await page.route(
  265 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  266 |     (route) => {
  267 |       writes += 1;
  268 |       return json(route, presentedCapability);
  269 |     },
  270 |   );
  271 |   const editor = await openPresentedCapability(page);
  272 |   await openCapabilityDetails(editor);
  273 |   const name = editor.getByLabel("Name", { exact: true });
  274 |   await name.clear();
  275 |   await editor.getByText("Details", { exact: true }).click();
  276 |   await expect(name).toBeHidden();
  277 |   await editor
  278 |     .getByRole("button", { name: "Save capability", exact: true })
  279 |     .click();
  280 |   await expect(name).toBeVisible();
  281 |   await expect(name).toBeFocused();
  282 |   expect(
  283 |     await name.evaluate(
  284 |       (input) => input instanceof HTMLInputElement && !input.validity.valid,
  285 |     ),
  286 |   ).toBe(true);
  287 |   expect(writes).toBe(0);
  288 |   expect(unexpected).toEqual([]);
  289 | });
  290 | 
  291 | test("a save refusal preserves the mounted Profile draft and the explicit retry action", async ({
  292 |   page,
  293 | }) => {
  294 |   const unexpected = await installCapabilityPresentation(page);
  295 |   let writes = 0;
  296 |   await page.route(
  297 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  298 |     (route) => {
  299 |       writes += 1;
  300 |       return json(route, { message: "Synthetic save refused" }, 403);
  301 |     },
  302 |   );
  303 |   const editor = await openPresentedCapability(page);
  304 |   await editor
  305 |     .getByLabel("Notes", { exact: true })
  306 |     .fill("Retain this local draft after refusal");
  307 |   await editor
  308 |     .getByRole("button", { name: "Save capability", exact: true })
  309 |     .click();
  310 |   await expect(editor.getByRole("alert")).toContainText(
  311 |     "You do not have permission",
  312 |   );
  313 |   await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  314 |   await expect(editor.getByRole("alert")).toHaveCount(0);
  315 |   await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  316 |   await expect(editor.getByRole("alert")).toBeVisible();
  317 |   await expect(editor.getByLabel("Notes", { exact: true })).toHaveValue(
  318 |     "Retain this local draft after refusal",
  319 |   );
  320 |   await expect(
  321 |     editor.getByRole("button", { name: "Save capability", exact: true }),
  322 |   ).toBeEnabled();
  323 |   expect(writes).toBe(1);
  324 |   expect(unexpected).toEqual([]);
  325 | });
  326 | 
  327 | test("pending save remains one operation while switching capability tabs", async ({
  328 |   page,
  329 | }) => {
  330 |   const unexpected = await installCapabilityPresentation(page);
  331 |   const held = await holdResponse(
  332 |     page,
  333 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  334 |     "PATCH",
  335 |     presentedCapability,
  336 |   );
  337 |   const editor = await openPresentedCapability(page);
  338 |   await editor
  339 |     .getByRole("button", { name: "Save capability", exact: true })
  340 |     .click();
  341 |   await held.started;
```