# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: newsletter-rich.spec.ts >> local rich editor formats content, undoes, previews mobile and plain text without writes
- Location: apps/web/test/browser/newsletter-rich.spec.ts:136:1

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  locator('iframe[title="Rich newsletter preview"]').contentFrame().locator('.nl-shell')
Expected: "375px"
Received: "373px"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for locator('iframe[title="Rich newsletter preview"]').contentFrame().locator('.nl-shell')
    14 × locator resolved to <table width="660" class="nl-shell" role="presentation">…</table>
       - unexpected value "373px"

```

```yaml
- text: YOUR FIRM
- heading "Synthetic local heading" [level=1]:
  - paragraph: Synthetic local heading
- text: Add your text here.
- paragraph: Copyright © 2026 *|LIST:COMPANY|*. All rights reserved.
- paragraph: You are receiving this briefing because you subscribed to updates from our team.
- paragraph: "Our mailing address is: *|HTML:LIST_ADDRESS|*"
- paragraph: Want to change how you receive these emails?
- paragraph: You can update your preferences or unsubscribe.
```

# Test source

```ts
  73  |     page.getByRole("button", { name: "Save draft", exact: true }),
  74  |   ).toBeEnabled();
  75  |   expect(observed.writes).toEqual([]);
  76  | });
  77  | test("legacy draft deep link containing rich metadata never mounts the plain writer", async ({
  78  |   page,
  79  | }) => {
  80  |   const observed = await setup(page);
  81  |   await page.goto(`/modules/engagement?view=outreach&draft=${recordId}`);
  82  |   await expect(
  83  |     page.getByRole("heading", { name: "Rich newsletter unavailable" }),
  84  |   ).toBeVisible();
  85  |   await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
  86  |   await page.getByRole("link", { name: "Back to Outreach" }).click();
  87  |   await expect(
  88  |     page.getByRole("button", { name: "Synthetic rich draft" }),
  89  |   ).toBeVisible();
  90  |   expect(observed.writes).toEqual([]);
  91  | });
  92  | test("wrong-type marker refuses editing and malformed marker fails decoding", async ({
  93  |   page,
  94  | }) => {
  95  |   const observed = await setup(page, { ...rich, type: "follow_up" });
  96  |   await page.goto(`/modules/engagement?draft=${recordId}`);
  97  |   await expect(
  98  |     page.getByRole("heading", { name: "Newsletter unavailable", exact: true }),
  99  |   ).toBeVisible();
  100 |   await operationFixtures(page, {
  101 |     ...moduleRouteFixtures,
  102 |     "engagement.sessions": [],
  103 |     "engagement.outreach.record": {
  104 |       ...rich,
  105 |       metadata: { newsletterStageId: null },
  106 |     },
  107 |   });
  108 |   await page.reload();
  109 |   await expect(
  110 |     page.getByRole("heading", { name: "Unable to load this view" }),
  111 |   ).toBeVisible();
  112 |   await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
  113 |   expect(observed.writes).toEqual([]);
  114 | });
  115 | for (const query of [
  116 |   `newsletter=${recordId}`,
  117 |   `newsletterStage=${stageId}`,
  118 |   `newsletter=${recordId}&session=${stageId}`,
  119 |   `newsletterStage=${stageId}&newsletter=${recordId}`,
  120 |   "newsletter=bad",
  121 | ]) {
  122 |   test(`rich route does not call legacy, V3 or effectful owners: ${query}`, async ({
  123 |     page,
  124 |   }) => {
  125 |     const observed = await setup(page);
  126 |     await page.goto(`/modules/engagement?${query}`);
  127 |     await expect(
  128 |       page.getByRole("heading", { name: /newsletter unavailable/i }),
  129 |     ).toBeVisible();
  130 |     expect(observed.operations.filter((key) => key !== "me.read")).toEqual([]);
  131 |     expect(observed.writes).toEqual([]);
  132 |     expect(observed.errors).toEqual([]);
  133 |   });
  134 | }
  135 | 
  136 | test("local rich editor formats content, undoes, previews mobile and plain text without writes", async ({
  137 |   page,
  138 | }, info) => {
  139 |   const observed = await setup(page);
  140 |   await page.goto("/modules/workspace?view=rich-newsletter");
  141 |   await expect(
  142 |     page.getByRole("heading", { name: "Rich newsletter editor preview" }),
  143 |   ).toBeVisible();
  144 |   await page
  145 |     .getByRole("button", { name: /^Heading · This week in policy/ })
  146 |     .click();
  147 |   await page
  148 |     .getByRole("textbox", { name: "Block rich text" })
  149 |     .fill("Synthetic local heading");
  150 |   await expect(
  151 |     page
  152 |       .frameLocator('iframe[title="Rich newsletter preview"]')
  153 |       .getByRole("heading", { name: "Synthetic local heading" }),
  154 |   ).toBeVisible();
  155 |   await page.getByRole("button", { name: "Undo", exact: true }).click();
  156 |   await expect(
  157 |     page
  158 |       .frameLocator('iframe[title="Rich newsletter preview"]')
  159 |       .getByRole("heading", { name: "This week in policy" }),
  160 |   ).toBeVisible();
  161 |   await page.getByRole("button", { name: "Redo", exact: true }).click();
  162 |   await expect(
  163 |     page.getByRole("textbox", { name: "Block rich text" }),
  164 |   ).toHaveText("Synthetic local heading");
  165 |   await page.getByRole("button", { name: "Mobile preview" }).click();
  166 |   await expect(
  167 |     page.locator('iframe[title="Rich newsletter preview"]'),
  168 |   ).toHaveCSS("width", "375px");
  169 |   await expect(
  170 |     page
  171 |       .frameLocator('iframe[title="Rich newsletter preview"]')
  172 |       .locator(".nl-shell"),
> 173 |   ).toHaveCSS("width", "375px");
      |     ^ Error: expect(locator).toHaveCSS(expected) failed
  174 |   await page.screenshot({
  175 |     path: info.outputPath("rich-editor-desktop.png"),
  176 |     fullPage: true,
  177 |   });
  178 |   await page.getByRole("button", { name: "Plain text", exact: true }).click();
  179 |   await expect(page.getByLabel("Newsletter plain text")).toContainText(
  180 |     "Synthetic local heading",
  181 |   );
  182 |   await expect(
  183 |     page.getByRole("button", { name: "Save newsletter", exact: true }),
  184 |   ).toBeDisabled();
  185 |   await expect(
  186 |     page.getByRole("button", { name: "Stage newsletter", exact: true }),
  187 |   ).toBeDisabled();
  188 |   await page.setViewportSize({ width: 390, height: 844 });
  189 |   await page.screenshot({
  190 |     path: info.outputPath("rich-editor-mobile.png"),
  191 |     fullPage: true,
  192 |   });
  193 |   expect(
  194 |     await page.evaluate(
  195 |       () => document.documentElement.scrollWidth <= window.innerWidth,
  196 |     ),
  197 |   ).toBe(true);
  198 |   expect(observed.writes).toEqual([]);
  199 |   expect(observed.errors).toEqual([]);
  200 |   expect(observed.remote).toEqual([]);
  201 | });
  202 | test("preview isolates untrusted HTML, external images and links", async ({
  203 |   page,
  204 | }) => {
  205 |   const observed = await setup(page);
  206 |   await page.goto("/modules/workspace?view=rich-newsletter");
  207 |   await page.getByText("Add block to Body", { exact: true }).click();
  208 |   await page.getByRole("button", { name: "Code", exact: true }).click();
  209 |   await page.getByRole("button", { name: "Code", exact: true }).first().click();
  210 |   await page
  211 |     .getByLabel("HTML content")
  212 |     .fill(
  213 |       '<script>parent.alert("bad")</script><form action="https://example.test/leak"><input name="secret"></form><img src="https://example.test/tracker" alt="Remote"><a href="https://example.test">Safe text</a>',
  214 |     );
  215 |   const frame = page.frameLocator('iframe[title="Rich newsletter preview"]');
  216 |   await expect(frame.getByText("Safe text", { exact: true })).toBeVisible();
  217 |   await expect(
  218 |     frame.locator("script,form,input,a[href],img[src^='https://example.test']"),
  219 |   ).toHaveCount(0);
  220 |   await expect(
  221 |     page.locator('iframe[title="Rich newsletter preview"]'),
  222 |   ).toHaveAttribute("sandbox", "");
  223 |   expect(observed.remote).toEqual([]);
  224 |   expect(observed.errors).toEqual([]);
  225 | });
  226 | test("scope replacement and sign-out clear the local editor", async ({
  227 |   page,
  228 | }) => {
  229 |   const observed = await setup(page);
  230 |   await page.goto("/modules/workspace?view=rich-newsletter");
  231 |   await page.getByLabel("Newsletter name").fill("Prior tenant local draft");
  232 |   await page.evaluate(() =>
  233 |     window.dispatchEvent(
  234 |       new CustomEvent("test:session", {
  235 |         detail: { orgId: "second-org", sessionId: "second-session" },
  236 |       }),
  237 |     ),
  238 |   );
  239 |   await expect(page.getByLabel("Newsletter name")).toHaveValue(
  240 |     "Untitled newsletter",
  241 |   );
  242 |   await page.evaluate(() =>
  243 |     window.dispatchEvent(
  244 |       new CustomEvent("test:session", {
  245 |         detail: { userId: null, orgId: null, sessionId: null },
  246 |       }),
  247 |     ),
  248 |   );
  249 |   await expect(
  250 |     page.getByRole("heading", { name: "Sign in to Capiro" }),
  251 |   ).toBeVisible();
  252 |   await expect(page.getByLabel("Newsletter name")).toHaveCount(0);
  253 |   expect(observed.writes).toEqual([]);
  254 | });
  255 | 
```