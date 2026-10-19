# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-debrief.spec.ts >> manual debrief reviews written context, generates only on submit and saves separately
- Location: tests/browser/manual-debrief.spec.ts:85:1

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Review generated debrief', exact: true })
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Review generated debrief', exact: true })
    14 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_1f_" data-state="open" aria-modal="true" data-slot="dialog-content" aria-labelledby="radix-_r_1g_" aria-describedby="radix-_r_1h_" class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg b…>…</div>
       - unexpected value "visible"

```

```yaml
- dialog "Review generated debrief":
  - banner
  - paragraph: Review generated debrief
  - text: Content
  - textbox "Content": Synthetic reviewed recap Action items • Review evidence Notes Retain the written qualification.
  - checkbox "Confidential" [disabled]
  - text: Confidential Edits require approval again. Saving does not send email.
  - alert
  - button "Save debrief" [disabled]
```

# Test source

```ts
  15  |   isVirtual: false,
  16  |   meri: null,
  17  |   client: { id: clientId, name: client.name },
  18  |   attendees: [],
  19  |   preps: [],
  20  | };
  21  | const source =
  22  |   "Staff requested the evidence.\nNina will review — café notes retained.";
  23  | 
  24  | async function setup(page: Page, enabled = true) {
  25  |   const unexpected = await installFixtures(page);
  26  |   const state = {
  27  |     requests: [] as unknown[],
  28  |     saves: 0,
  29  |     status: 200,
  30  |     hold: undefined as Promise<void> | undefined,
  31  |   };
  32  |   await page.route("**/core/engagement/capabilities", (route) =>
  33  |     json(route, {
  34  |       meetingPrepComprehensiveEnabled: false,
  35  |       runtime: { externalActionsEnabled: enabled },
  36  |     }),
  37  |   );
  38  |   await page.route("**/core/engagement/meetings**", async (route) => {
  39  |     const url = new URL(route.request().url());
  40  |     if (url.pathname.endsWith("/debrief-draft")) {
  41  |       state.requests.push(route.request().postDataJSON());
  42  |       if (state.hold) await state.hold;
  43  |       return state.status === 200
  44  |         ? json(route, {
  45  |             recap: "Synthetic reviewed recap",
  46  |             actionItems: ["Review evidence"],
  47  |             notes: "Retain the written qualification.",
  48  |             provider: "anthropic",
  49  |             model: "synthetic-model",
  50  |           })
  51  |         : json(route, { message: "Generation unavailable" }, state.status);
  52  |     }
  53  |     if (url.pathname.endsWith("/notetaker")) return json(route, null);
  54  |     if (url.pathname.endsWith("/notes")) return json(route, []);
  55  |     if (url.pathname.endsWith("/debriefs")) {
  56  |       if (route.request().method() === "POST") {
  57  |         state.saves++;
  58  |         expect(route.request().postDataJSON()).toMatchObject({
  59  |           body: "Synthetic reviewed recap\n\nAction items\n• Review evidence\n\nNotes\nRetain the written qualification.",
  60  |           confidential: false,
  61  |         });
  62  |         return json(route, { id: "synthetic-debrief" });
  63  |       }
  64  |       return json(route, []);
  65  |     }
  66  |     return json(route, url.pathname.endsWith(meetingId) ? meeting : [meeting]);
  67  |   });
  68  |   await page.goto(
  69  |     `/calendar?view=agenda&date=2026-10-10&zone=UTC&meeting=${meetingId}`,
  70  |   );
  71  |   await page
  72  |     .getByRole("dialog", { name: meeting.subject })
  73  |     .getByRole("button", { name: "Debriefs", exact: true })
  74  |     .click();
  75  |   return { state, unexpected };
  76  | }
  77  | 
  78  | async function openManual(page: Page) {
  79  |   await page
  80  |     .getByRole("button", { name: "Type Notes Manually", exact: true })
  81  |     .click();
  82  |   return page.getByRole("dialog", { name: "Type Notes Manually", exact: true });
  83  | }
  84  | 
  85  | test("manual debrief reviews written context, generates only on submit and saves separately", async ({
  86  |   page,
  87  | }, testInfo) => {
  88  |   const { state, unexpected } = await setup(page);
  89  |   const dialog = await openManual(page);
  90  |   const submit = dialog.getByRole("button", {
  91  |     name: "Generate Debrief",
  92  |     exact: true,
  93  |   });
  94  |   await expect(submit).toBeDisabled();
  95  |   await dialog.getByLabel("Meeting context", { exact: true }).fill("   ");
  96  |   await expect(submit).toBeDisabled();
  97  |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  98  |   expect(state.requests).toHaveLength(0);
  99  |   expect((await dialog.boundingBox())?.width).toBe(660);
  100 |   await expect(dialog.locator("textarea")).toHaveCSS("height", "180px");
  101 |   await page.screenshot({ path: testInfo.outputPath("manual-desktop.png") });
  102 |   await submit.click();
  103 |   const editor = page.getByRole("dialog", {
  104 |     name: "Review generated debrief",
  105 |     exact: true,
  106 |   });
  107 |   await expect(editor.getByLabel("Content")).toHaveValue(
  108 |     /Synthetic reviewed recap/,
  109 |   );
  110 |   expect(state.requests).toEqual([{ method: "manual", sourceText: source }]);
  111 |   expect(state.saves).toBe(0);
  112 |   await editor
  113 |     .getByRole("button", { name: "Save debrief", exact: true })
  114 |     .click();
> 115 |   await expect(editor).not.toBeVisible();
      |                            ^ Error: expect(locator).not.toBeVisible() failed
  116 |   expect(state.saves).toBe(1);
  117 |   expect(unexpected).toEqual([]);
  118 | });
  119 | 
  120 | test("manual generation failure preserves source without automatic generation or save", async ({
  121 |   page,
  122 | }) => {
  123 |   const { state } = await setup(page);
  124 |   state.status = 500;
  125 |   const dialog = await openManual(page);
  126 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  127 |   await dialog
  128 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  129 |     .click();
  130 |   const progress = page.getByRole("dialog", {
  131 |     name: "Generate meeting debrief",
  132 |     exact: true,
  133 |   });
  134 |   await expect(progress.getByRole("alert")).toContainText(
  135 |     "Generation unavailable",
  136 |   );
  137 |   await expect(progress).toContainText(
  138 |     "generating again starts another request",
  139 |   );
  140 |   expect(state.requests).toHaveLength(1);
  141 |   expect(state.saves).toBe(0);
  142 |   await progress.getByRole("button", { name: "Close", exact: true }).click();
  143 |   const reopened = await openManual(page);
  144 |   await expect(
  145 |     reopened.getByLabel("Meeting context", { exact: true }),
  146 |   ).toHaveValue(source);
  147 |   expect(state.requests).toHaveLength(1);
  148 | });
  149 | 
  150 | test("leaving the meeting during manual generation refuses a late draft", async ({
  151 |   page,
  152 | }) => {
  153 |   const { state } = await setup(page);
  154 |   let release!: () => void;
  155 |   state.hold = new Promise<void>((resolve) => {
  156 |     release = resolve;
  157 |   });
  158 |   const dialog = await openManual(page);
  159 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  160 |   await dialog
  161 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  162 |     .click();
  163 |   await expect.poll(() => state.requests.length).toBe(1);
  164 |   await page.evaluate(() => {
  165 |     history.pushState({}, "", "/calendar?view=agenda&date=2026-10-10&zone=UTC");
  166 |     window.dispatchEvent(new PopStateEvent("popstate"));
  167 |   });
  168 |   release();
  169 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  170 |   expect(state.saves).toBe(0);
  171 | });
  172 | 
  173 | test("manual source respects runtime denial and mobile dark reference geometry", async ({
  174 |   page,
  175 | }, testInfo) => {
  176 |   await setup(page, false);
  177 |   await expect(
  178 |     page.getByRole("button", { name: "Type Notes Manually", exact: true }),
  179 |   ).toBeDisabled();
  180 |   await page.unrouteAll({ behavior: "wait" });
  181 |   await page.emulateMedia({ colorScheme: "dark" });
  182 |   await page.setViewportSize({ width: 390, height: 844 });
  183 |   const { state } = await setup(page);
  184 |   const dialog = await openManual(page);
  185 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  186 |   expect((await dialog.boundingBox())?.width).toBe(358);
  187 |   await expect(dialog).toHaveCSS("padding", "16px");
  188 |   await expect(dialog).toHaveCSS("background-color", "rgb(27, 27, 27)");
  189 |   expect(
  190 |     await page.evaluate(
  191 |       () => document.documentElement.scrollWidth <= innerWidth,
  192 |     ),
  193 |   ).toBe(true);
  194 |   await page.screenshot({
  195 |     path: testInfo.outputPath("manual-mobile-dark.png"),
  196 |   });
  197 |   expect(state.requests).toHaveLength(0);
  198 | });
  199 | 
```