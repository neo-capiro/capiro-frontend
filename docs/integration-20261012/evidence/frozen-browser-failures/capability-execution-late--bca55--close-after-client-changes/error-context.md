# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-execution.spec.ts >> late capability remove cannot refresh or close after client changes
- Location: tests/browser/capability-execution.spec.ts:51:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "GET core/clients/10000000-0000-4000-8000-000000000002/submission-history",
+ ]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - banner:
        - heading [level=1]: Capabilities
        - generic:
          - button: Add capability
          - button: Registrations & codes
      - generic:
        - generic:
          - paragraph: Capability areas
          - generic: 1 areas · 1 fielded
        - generic:
          - button:
            - generic: ▦
            - strong: Second client capability
            - paragraph: Synthetic capability
            - generic:
              - generic: Fielded
              - generic: No program line mapped
      - generic:
        - generic:
          - generic:
            - paragraph: Where capabilities create fit
            - heading [level=3]: 0 fit matches
          - button: Refresh
        - generic: Computed 10/11/2026, 12:00:00 PM
        - paragraph: No matches available.
      - region:
        - generic:
          - generic:
            - paragraph: Past performance
            - heading [level=2]: Saved submissions
            - paragraph: Saved capability submissions and their recorded outcomes.
          - button: Refresh history
        - generic:
          - alert:
            - paragraph: No fixture for this contract
            - button: Retry
        - paragraph: Removing a saved submission keeps its capability and documents.
      - paragraph:
        - text: "Past advocacy:"
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000002/objectives
          - text: Advocacy history ↗
  - 'dialog "Capability: Second client capability" [ref=e2]':
    - banner [ref=e3]:
      - 'heading "Capability: Second client capability" [level=2] [ref=e4]'
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: "Capability: Second client capability"
    - generic [ref=e10]:
      - tablist "Capability sections" [ref=e11]:
        - tab "Profile" [active] [selected] [ref=e12] [cursor=pointer]
        - tab "Documents" [ref=e13] [cursor=pointer]
      - tabpanel "Profile" [ref=e14]:
        - generic [ref=e15]:
          - group [ref=e16]:
            - generic [ref=e17]:
              - generic [ref=e18]: product
              - generic [ref=e19]: Aerospace
              - button "Remove capability" [ref=e20] [cursor=pointer]: Delete
            - group "Technology Readiness Level" [ref=e21]:
              - generic [ref=e22]:
                - generic [ref=e23]: Technology Readiness Level
                - generic [ref=e24]:
                  - generic [ref=e25]: TRL 7 · Fielded
                  - button "Clear TRL" [ref=e26] [cursor=pointer]
              - generic [ref=e27]:
                - button "TRL 1" [ref=e28] [cursor=pointer]: "1"
                - button "TRL 2" [ref=e29] [cursor=pointer]: "2"
                - button "TRL 3" [ref=e30] [cursor=pointer]: "3"
                - button "TRL 4" [ref=e31] [cursor=pointer]: "4"
                - button "TRL 5" [ref=e32] [cursor=pointer]: "5"
                - button "TRL 6" [ref=e33] [cursor=pointer]: "6"
                - button "TRL 7" [pressed] [ref=e34] [cursor=pointer]: "7"
                - button "TRL 8" [ref=e35] [cursor=pointer]: "8"
                - button "TRL 9" [ref=e36] [cursor=pointer]: "9"
            - generic [ref=e37]:
              - generic [ref=e38]: Tags
              - textbox "Tags" [ref=e40]:
                - /placeholder: Pick or add tags
            - generic [ref=e41]:
              - generic [ref=e42]: PE numbers
              - textbox "PE numbers" [ref=e44]:
                - /placeholder: e.g. 0604201A, add and press Enter
            - generic [ref=e45]:
              - generic [ref=e46]: Match keywords
              - textbox "Match keywords" [ref=e48]:
                - /placeholder: Keywords that match PE text
            - generic [ref=e49]:
              - generic [ref=e50]: Description
              - textbox "Description" [ref=e51]:
                - /placeholder: Describe this capability…
                - text: Synthetic capability
            - generic [ref=e52]:
              - generic [ref=e53]: Notes
              - textbox "Notes" [ref=e54]:
                - /placeholder: Internal notes…
            - group [ref=e55]:
              - generic "Details" [ref=e56] [cursor=pointer]
              - option "Not set" [selected]
              - option "1"
              - option "2"
              - option "3"
              - option "4"
              - option "5"
              - option "6"
              - option "7"
              - option "8"
              - option "9"
              - option "10"
          - contentinfo [ref=e57]:
            - button "Cancel" [ref=e58] [cursor=pointer]
            - button "Save capability" [ref=e59] [cursor=pointer]
```

# Test source

```ts
  9   | for (const change of ["role", "invalidate", "refetch-identity"])
  10  |   test(`capability writes are disabled after identity ${change}`, async ({
  11  |     page,
  12  |   }) => {
  13  |     const unexpected = await installCapabilityBoundary(page);
  14  |     await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  15  |     const editor = page.getByRole("dialog", {
  16  |       name: "Capability: Test sensor",
  17  |     });
  18  |     const save = editor.getByRole("button", {
  19  |       name: "Save capability",
  20  |       exact: true,
  21  |     });
  22  |     await expect(save).toBeEnabled();
  23  |     if (change === "refetch-identity")
  24  |       await page.route("**/core/me", (route) =>
  25  |         json(route, { message: "Synthetic identity denied" }, 403),
  26  |       );
  27  |     await transition(page, change);
  28  |     await expect(save).toBeDisabled();
  29  |     await expect(
  30  |       editor.getByRole("button", { name: "Remove capability", exact: true }),
  31  |     ).toBeDisabled();
  32  |     await expect(editor.getByLabel("Name", { exact: true })).toBeDisabled();
  33  |     // A synthetic native submit bypasses button disabled state. The writer must
  34  |     // still check the real cache before any request is dispatched.
  35  |     await editor
  36  |       .locator("form")
  37  |       .evaluate((form: HTMLFormElement) => form.requestSubmit());
  38  |     await expect(
  39  |       page.getByLabel("Synthetic pending capability writes"),
  40  |     ).toHaveText("0");
  41  |     await expect(editor.getByRole("alert")).toBeVisible();
  42  |     await editor.getByRole("button", { name: "Close", exact: true }).click();
  43  |     await expect(
  44  |       page.getByRole("button", { name: "Refresh", exact: true }),
  45  |     ).toBeDisabled();
  46  |     expect(unexpected).toEqual([]);
  47  |   });
  48  | 
  49  | for (const action of ["save", "remove"] as const)
  50  |   for (const change of ["actor", "client", "unmount"])
  51  |     test(`late capability ${action} cannot refresh or close after ${change} changes`, async ({
  52  |       page,
  53  |     }) => {
  54  |       const unexpected = await installCapabilityBoundary(page);
  55  |       let reads = 0;
  56  |       await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
  57  |         reads += 1;
  58  |         return json(route, [capability]);
  59  |       });
  60  |       const held = await holdResponse(
  61  |         page,
  62  |         `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  63  |         action === "save" ? "PATCH" : "DELETE",
  64  |         action === "save" ? capability : { deleted: true },
  65  |       );
  66  |       await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  67  |       const editor = page.getByRole("dialog", {
  68  |         name: "Capability: Test sensor",
  69  |       });
  70  |       await editor.getByText("Details", { exact: true }).click();
  71  |       await editor
  72  |         .getByLabel("Name", { exact: true })
  73  |         .fill("Original actor draft");
  74  |       if (action === "save")
  75  |         await editor
  76  |           .getByRole("button", { name: "Save capability", exact: true })
  77  |           .click();
  78  |       else {
  79  |         await editor
  80  |           .getByRole("button", { name: "Remove capability", exact: true })
  81  |           .click();
  82  |         await page
  83  |           .getByRole("dialog", { name: "Remove capability", exact: true })
  84  |           .getByRole("button", { name: "Confirm remove" })
  85  |           .click();
  86  |       }
  87  |       await held.started;
  88  |       await transition(page, change);
  89  |       if (change === "unmount")
  90  |         await expect(page.getByText("Capability view unmounted")).toBeVisible();
  91  |       if (change === "client")
  92  |         await expect(
  93  |           page
  94  |             .getByRole("dialog", {
  95  |               name: "Capability: Second client capability",
  96  |             })
  97  |             .getByLabel("Name", { exact: true }),
  98  |         ).toHaveValue("Second client capability");
  99  |       held.release();
  100 |       await held.settled;
  101 |       await expect(
  102 |         page.getByLabel("Synthetic pending capability writes"),
  103 |       ).toHaveText("0");
  104 |       expect(new URL(page.url()).searchParams.get("capability")).toBe(
  105 |         capabilityId,
  106 |       );
  107 |       expect(reads).toBe(1);
  108 |       expect(held.calls()).toBe(1);
> 109 |       expect(unexpected).toEqual([]);
      |                          ^ Error: expect(received).toEqual(expected) // deep equality
  110 |     });
  111 | 
  112 | test("capability save keeps a single immutable draft in flight then refreshes and closes", async ({
  113 |   page,
  114 | }) => {
  115 |   const unexpected = await installCapabilityBoundary(page);
  116 |   let saved = false;
  117 |   await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
  118 |     json(route, [
  119 |       {
  120 |         ...capability,
  121 |         name: saved ? "Saved synthetic capability" : capability.name,
  122 |       },
  123 |     ]),
  124 |   );
  125 |   const held = await holdResponse(
  126 |     page,
  127 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  128 |     "PATCH",
  129 |     { ...capability, name: "Saved synthetic capability" },
  130 |   );
  131 |   await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  132 |   const editor = page.getByRole("dialog", { name: "Capability: Test sensor" });
  133 |   await editor.getByText("Details", { exact: true }).click();
  134 |   await editor
  135 |     .getByLabel("Name", { exact: true })
  136 |     .fill("Saved synthetic capability");
  137 |   await editor
  138 |     .getByRole("button", { name: "Save capability", exact: true })
  139 |     .click();
  140 |   await held.started;
  141 |   await expect(editor.getByLabel("Name", { exact: true })).toBeDisabled();
  142 |   await expect(
  143 |     editor.getByRole("button", { name: "Remove capability", exact: true }),
  144 |   ).toBeDisabled();
  145 |   await expect(
  146 |     editor.getByRole("button", { name: "Saving…", exact: true }),
  147 |   ).toBeDisabled();
  148 |   saved = true;
  149 |   held.release();
  150 |   await held.settled;
  151 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  152 |   await expect(
  153 |     page.getByRole("button", { name: /Saved synthetic capability/ }),
  154 |   ).toBeVisible();
  155 |   expect(new URL(page.url()).searchParams.has("capability")).toBe(false);
  156 |   expect(held.calls()).toBe(1);
  157 |   expect(unexpected).toEqual([]);
  158 | });
  159 | 
  160 | test("capability remove confirms one existing record then refreshes the empty list", async ({
  161 |   page,
  162 | }) => {
  163 |   const unexpected = await installCapabilityBoundary(page);
  164 |   let removed = false;
  165 |   await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
  166 |     json(route, removed ? [] : [capability]),
  167 |   );
  168 |   await page.route(
  169 |     `**/core/clients/${clientId}/capabilities/${capabilityId}`,
  170 |     (route) => {
  171 |       expect(route.request().method()).toBe("DELETE");
  172 |       removed = true;
  173 |       return route.fulfill({ status: 204 });
  174 |     },
  175 |   );
  176 |   await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  177 |   await page
  178 |     .getByRole("dialog", { name: "Capability: Test sensor" })
  179 |     .getByRole("button", { name: "Remove capability", exact: true })
  180 |     .click();
  181 |   await page
  182 |     .getByRole("dialog", { name: "Remove capability", exact: true })
  183 |     .getByRole("button", { name: "Confirm remove" })
  184 |     .click();
  185 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  186 |   await expect(
  187 |     page.getByText(
  188 |       "Add a capability area to describe what this client can deliver.",
  189 |     ),
  190 |   ).toBeVisible();
  191 |   expect(removed).toBe(true);
  192 |   expect(new URL(page.url()).searchParams.has("capability")).toBe(false);
  193 |   expect(unexpected).toEqual([]);
  194 | });
  195 | 
  196 | test("capability create uses the existing client collection and closes after the refreshed read", async ({
  197 |   page,
  198 | }) => {
  199 |   const unexpected = await installCapabilityBoundary(page);
  200 |   let saved: typeof capability | undefined;
  201 |   let writes = 0;
  202 |   await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
  203 |     if (route.request().method() === "GET")
  204 |       return json(route, saved ? [saved] : []);
  205 |     expect(route.request().method()).toBe("POST");
  206 |     const body = route.request().postDataJSON();
  207 |     expect(body).toMatchObject({
  208 |       name: "New synthetic sensor",
  209 |       type: "product",
```