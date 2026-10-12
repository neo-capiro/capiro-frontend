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

Locator: getByRole('dialog', { name: 'New capability', exact: true }).getByLabel('Name', { exact: true })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'New capability', exact: true }).getByLabel('Name', { exact: true })

```

```yaml
- dialog "New capability":
  - banner:
    - heading "New capability" [level=2]
    - button "Close"
  - paragraph: New capability
  - group:
    - paragraph: Name it and save. PE numbers, match keywords, and documents open next, on the saved record.
    - text: Name
    - textbox "Name":
      - /placeholder: Specific capability name
    - text: Type
    - combobox "Type": product
    - text: Sector
    - combobox "Sector"
    - paragraph: Drives downstream agency and policy matching.
    - text: Tags
    - textbox "Tags":
      - /placeholder: Pick or add tags
    - group "Technology Readiness Level":
      - text: Technology Readiness Level Not set, optional
      - button "TRL 1": "1"
      - button "TRL 2": "2"
      - button "TRL 3": "3"
      - button "TRL 4": "4"
      - button "TRL 5": "5"
      - button "TRL 6": "6"
      - button "TRL 7": "7"
      - button "TRL 8": "8"
      - button "TRL 9": "9"
    - text: Description
    - textbox "Description":
      - /placeholder: Describe this capability…
    - group: Additional details
  - contentinfo:
    - button "Cancel"
    - button "Add capability"
```

# Test source

```ts
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
  237 |   // Radix schedules roving focus after the key event. Finish this navigation
  238 |   // before deliberately moving focus to the disclosure; otherwise that pending
  239 |   // navigation can steal focus from the next, unrelated keyboard action.
  240 |   await expect(profile).toBeFocused();
  241 |   const details = editor.getByText("Details", { exact: true });
  242 |   await details.focus();
  243 |   await details.press("Enter");
  244 |   await page.keyboard.press("Tab");
  245 |   await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
  246 |   await page.keyboard.press("Escape");
  247 |   await expect(editor).toHaveCount(0);
  248 |   await expect(card).toBeFocused();
  249 |   const add = page.getByRole("button", { name: "Add capability", exact: true });
  250 |   await add.focus();
  251 |   await add.press("Enter");
  252 |   const create = page.getByRole("dialog", {
  253 |     name: "New capability",
  254 |     exact: true,
  255 |   });
> 256 |   await expect(create.getByLabel("Name", { exact: true })).toBeFocused();
      |                                                            ^ Error: expect(locator).toBeFocused() failed
  257 |   await page.keyboard.press("Escape");
  258 |   await expect(create).toHaveCount(0);
  259 |   await expect(add).toBeFocused();
  260 |   expect(unexpected).toEqual([]);
  261 | });
  262 | 
  263 | test("saving an invalid Name inside collapsed Details reveals and focuses the field without writing", async ({
  264 |   page,
  265 | }) => {
  266 |   const unexpected = await installCapabilityPresentation(page);
  267 |   let writes = 0;
  268 |   await page.route(
  269 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  270 |     (route) => {
  271 |       writes += 1;
  272 |       return json(route, presentedCapability);
  273 |     },
  274 |   );
  275 |   const editor = await openPresentedCapability(page);
  276 |   await openCapabilityDetails(editor);
  277 |   const name = editor.getByLabel("Name", { exact: true });
  278 |   await name.clear();
  279 |   await editor.getByText("Details", { exact: true }).click();
  280 |   await expect(name).toBeHidden();
  281 |   await editor
  282 |     .getByRole("button", { name: "Save capability", exact: true })
  283 |     .click();
  284 |   await expect(name).toBeVisible();
  285 |   await expect(name).toBeFocused();
  286 |   expect(
  287 |     await name.evaluate(
  288 |       (input) => input instanceof HTMLInputElement && !input.validity.valid,
  289 |     ),
  290 |   ).toBe(true);
  291 |   expect(writes).toBe(0);
  292 |   expect(unexpected).toEqual([]);
  293 | });
  294 | 
  295 | test("a save refusal preserves the mounted Profile draft and the explicit retry action", async ({
  296 |   page,
  297 | }) => {
  298 |   const unexpected = await installCapabilityPresentation(page);
  299 |   let writes = 0;
  300 |   await page.route(
  301 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  302 |     (route) => {
  303 |       writes += 1;
  304 |       return json(route, { message: "Synthetic save refused" }, 403);
  305 |     },
  306 |   );
  307 |   const editor = await openPresentedCapability(page);
  308 |   await editor
  309 |     .getByLabel("Notes", { exact: true })
  310 |     .fill("Retain this local draft after refusal");
  311 |   await editor
  312 |     .getByRole("button", { name: "Save capability", exact: true })
  313 |     .click();
  314 |   await expect(editor.getByRole("alert")).toContainText(
  315 |     "You do not have permission",
  316 |   );
  317 |   await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  318 |   await expect(editor.getByRole("alert")).toHaveCount(0);
  319 |   await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  320 |   await expect(editor.getByRole("alert")).toBeVisible();
  321 |   await expect(editor.getByLabel("Notes", { exact: true })).toHaveValue(
  322 |     "Retain this local draft after refusal",
  323 |   );
  324 |   await expect(
  325 |     editor.getByRole("button", { name: "Save capability", exact: true }),
  326 |   ).toBeEnabled();
  327 |   expect(writes).toBe(1);
  328 |   expect(unexpected).toEqual([]);
  329 | });
  330 | 
  331 | test("pending save remains one operation while switching capability tabs", async ({
  332 |   page,
  333 | }) => {
  334 |   const unexpected = await installCapabilityPresentation(page);
  335 |   const held = await holdResponse(
  336 |     page,
  337 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  338 |     "PATCH",
  339 |     presentedCapability,
  340 |   );
  341 |   const editor = await openPresentedCapability(page);
  342 |   await editor
  343 |     .getByRole("button", { name: "Save capability", exact: true })
  344 |     .click();
  345 |   await held.started;
  346 |   await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  347 |   await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  348 |   await expect(
  349 |     editor.getByLabel("Description", { exact: true }),
  350 |   ).toBeDisabled();
  351 |   await expect(
  352 |     editor.getByRole("button", {
  353 |       name: "Remove autonomy from Tags",
  354 |       exact: true,
  355 |     }),
  356 |   ).toBeDisabled();
```