# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-presentation.spec.ts >> create retains optional MRL and Notes and exposes saved-only fields after its one native create
- Location: tests/browser/capability-presentation.spec.ts:110:1

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
  46  |     .fill(expected.description);
  47  |   await editor.getByLabel("Notes", { exact: true }).fill(expected.notes);
  48  |   const tags = editor.getByLabel("Tags", { exact: true });
  49  |   await tags.fill("  novel  ");
  50  |   await tags.press("Enter");
  51  |   await tags.fill("novel, comma tag");
  52  |   await tags.press(",");
  53  |   await tags.fill("blur tag");
  54  |   await editor.getByLabel("Description", { exact: true }).click();
  55  |   await editor
  56  |     .getByRole("button", { name: "Remove autonomy from Tags", exact: true })
  57  |     .click();
  58  |   await editor.getByLabel("PE numbers", { exact: true }).fill("0601234A");
  59  |   await editor.getByLabel("PE numbers", { exact: true }).press("Enter");
  60  |   await editor
  61  |     .getByLabel("Match keywords", { exact: true })
  62  |     .fill("advanced sensing");
  63  |   await editor.getByLabel("Match keywords", { exact: true }).press("Enter");
  64  |   await editor.getByRole("button", { name: "Clear TRL", exact: true }).click();
  65  |   await openCapabilityDetails(editor);
  66  |   await editor.getByLabel("Name", { exact: true }).fill(expected.name);
  67  |   await editor.getByLabel("Type", { exact: true }).fill(expected.type);
  68  |   await editor.getByLabel("Sector", { exact: true }).fill(expected.sector);
  69  |   await editor
  70  |     .getByRole("combobox", {
  71  |       name: "Manufacturing Readiness Level",
  72  |       exact: true,
  73  |     })
  74  |     .selectOption("8");
  75  |   await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  76  |   await expect(editor.getByRole("textbox")).toHaveCount(0);
  77  |   await expect(
  78  |     editor.getByRole("button", { name: "Save capability", exact: true }),
  79  |   ).toHaveCount(0);
  80  |   await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  81  |   await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
  82  |     expected.name,
  83  |   );
  84  |   await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
  85  |     expected.description,
  86  |   );
  87  |   await expect(editor.getByLabel("Notes", { exact: true })).toHaveValue(
  88  |     expected.notes,
  89  |   );
  90  |   await expect(
  91  |     editor.getByRole("button", {
  92  |       name: "Remove blur tag from Tags",
  93  |       exact: true,
  94  |     }),
  95  |   ).toBeVisible();
  96  |   await editor.getByText("Details", { exact: true }).click();
  97  |   await expect(editor.getByLabel("Name", { exact: true })).toBeHidden();
  98  |   expect(writes).toBe(0);
  99  |   await editor
  100 |     .getByRole("button", { name: "Save capability", exact: true })
  101 |     .click();
  102 |   await expect(editor).toHaveCount(0);
  103 |   await expect(
  104 |     page.getByRole("button", { name: /Revised interceptor/ }),
  105 |   ).toBeVisible();
  106 |   expect(writes).toBe(1);
  107 |   expect(unexpected).toEqual([]);
  108 | });
  109 | 
  110 | test("create retains optional MRL and Notes and exposes saved-only fields after its one native create", async ({
  111 |   page,
  112 | }) => {
  113 |   const unexpected = await installCapabilityPresentation(page);
  114 |   let saved: typeof presentedCapability | undefined;
  115 |   let writes = 0;
  116 |   const expected = {
  117 |     name: "New synthetic capability",
  118 |     type: "process / custom",
  119 |     sector: "Unlisted sector",
  120 |     description: "Synthetic new capability",
  121 |     tags: ["new tag"],
  122 |     issueCodes: [],
  123 |     trl: 5,
  124 |     mrl: 9,
  125 |     peNumbers: [],
  126 |     keywords: [],
  127 |     notes: "Retained optional notes",
  128 |   };
  129 |   await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
  130 |     if (route.request().method() === "GET")
  131 |       return json(route, saved ? [saved] : []);
  132 |     expect(route.request().method()).toBe("POST");
  133 |     expect(route.request().postDataJSON()).toEqual(expected);
  134 |     writes += 1;
  135 |     saved = { ...presentedCapability, ...expected };
  136 |     return json(route, saved);
  137 |   });
  138 |   await page.goto(`/portfolio/${clientId}/capabilities`);
  139 |   const add = page.getByRole("button", { name: "Add capability", exact: true });
  140 |   await add.focus();
  141 |   await add.press("Enter");
  142 |   const editor = page.getByRole("dialog", {
  143 |     name: "New capability",
  144 |     exact: true,
  145 |   });
> 146 |   await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
      |                                                            ^ Error: expect(locator).toBeFocused() failed
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
```